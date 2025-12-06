/**
 * CSV Connector - S3/Local CSV ingestion with mapping support
 * Supports large files (streaming) and parallel processing
 */

import { createReadStream, statSync } from 'fs';
import { parse } from 'csv-parse';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { load as loadYaml } from 'js-yaml';
import logger from '../config/logger.js';
import { IngestService, IngestInput } from './IngestService.js';
import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';

const csvLogger = logger.child({ name: 'CSVConnector' });

export interface MappingConfig {
  version: string;
  source: {
    type: 'csv';
    delimiter?: string;
    hasHeader?: boolean;
    encoding?: string;
  };
  entities: EntityMapping[];
  relationships?: RelationshipMapping[];
}

export interface EntityMapping {
  kind: string;
  filter?: Record<string, any>;
  idField: string;
  fields: {
    [graphqlField: string]: {
      csvColumn: string;
      transform?: string;
      default?: any;
    };
  };
  labels?: string[] | { csvColumn: string };
}

export interface RelationshipMapping {
  type: string;
  fromField: string;
  toField: string;
  confidence?: number | { csvColumn: string };
  properties?: {
    [key: string]: {
      csvColumn: string;
      transform?: string;
    };
  };
}

export class CSVConnector {
  private ingestService: IngestService;

  constructor(
    private pg: Pool,
    private neo4j: Driver,
  ) {
    this.ingestService = new IngestService(pg, neo4j);
  }

  /**
   * Ingest CSV file with mapping configuration
   */
  async ingestCSV(
    filePath: string,
    mappingPath: string,
    tenantId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    entitiesProcessed: number;
    relationshipsProcessed: number;
    errors: string[];
    provenanceId: string;
    hashManifest: string;
  }> {
    const startTime = Date.now();

    try {
      // 1. Load and validate mapping
      const mapping = await this.loadMapping(mappingPath);
      this.validateMapping(mapping);

      // 2. Calculate file hash for provenance
      const hashManifest = await this.hashFile(filePath);
      const fileSize = statSync(filePath).size;

      csvLogger.info({
        filePath,
        fileSize,
        hashManifest,
        tenantId,
      }, 'Starting CSV ingest');

      // 3. Parse CSV and collect entities/relationships
      const { entities, relationships } = await this.parseCSV(
        filePath,
        mapping,
      );

      csvLogger.info({
        entitiesCollected: entities.length,
        relationshipsCollected: relationships.length,
      }, 'CSV parsed successfully');

      // 4. Ingest via IngestService
      const input: IngestInput = {
        tenantId,
        sourceType: 's3-csv',
        sourceId: filePath,
        entities,
        relationships,
        userId,
      };

      const result = await this.ingestService.ingest(input);

      const took = Date.now() - startTime;
      const throughput = Math.round((entities.length / took) * 1000);

      csvLogger.info({
        filePath,
        fileSize,
        entitiesProcessed: entities.length,
        relationshipsProcessed: relationships.length,
        took,
        throughput: `${throughput} entities/sec`,
        provenanceId: result.provenanceId,
      }, 'CSV ingest completed');

      return {
        success: result.success,
        entitiesProcessed: entities.length,
        relationshipsProcessed: relationships.length,
        errors: result.errors,
        provenanceId: result.provenanceId,
        hashManifest,
      };
    } catch (error) {
      csvLogger.error({ filePath, error }, 'CSV ingest failed');
      throw error;
    }
  }

  /**
   * Load mapping configuration from YAML
   */
  private async loadMapping(mappingPath: string): Promise<MappingConfig> {
    try {
      const content = await readFile(mappingPath, 'utf-8');
      const mapping = loadYaml(content) as MappingConfig;
      return mapping;
    } catch (error) {
      throw new Error(`Failed to load mapping: ${error}`);
    }
  }

  /**
   * Validate mapping configuration
   */
  private validateMapping(mapping: MappingConfig): void {
    if (!mapping.version) {
      throw new Error('Mapping version is required');
    }

    if (!mapping.entities || mapping.entities.length === 0) {
      throw new Error('At least one entity mapping is required');
    }

    for (const entityMap of mapping.entities) {
      if (!entityMap.kind) {
        throw new Error('Entity kind is required');
      }
      if (!entityMap.idField) {
        throw new Error(`Entity mapping for ${entityMap.kind} requires idField`);
      }
      if (!entityMap.fields) {
        throw new Error(`Entity mapping for ${entityMap.kind} requires fields`);
      }
    }
  }

  /**
   * Parse CSV file and extract entities/relationships
   */
  private async parseCSV(
    filePath: string,
    mapping: MappingConfig,
  ): Promise<{
    entities: Array<{
      externalId?: string;
      kind: string;
      labels: string[];
      properties: Record<string, any>;
    }>;
    relationships: Array<{
      fromExternalId: string;
      toExternalId: string;
      relationshipType: string;
      properties?: Record<string, any>;
      confidence: number;
      source?: string;
    }>;
  }> {
    return new Promise((resolve, reject) => {
      const entities: any[] = [];
      const relationships: any[] = [];
      const seenEntities = new Set<string>();

      const parser = parse({
        delimiter: mapping.source.delimiter || ',',
        columns: mapping.source.hasHeader !== false,
        skip_empty_lines: true,
        trim: true,
      });

      const stream = createReadStream(filePath);

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          try {
            // Process entity mappings
            for (const entityMap of mapping.entities) {
              // Check filter
              if (entityMap.filter && !this.matchesFilter(record, entityMap.filter)) {
                continue;
              }

              const externalId = record[entityMap.idField];
              if (!externalId) {
                csvLogger.warn({ record, entityMap }, 'Missing ID field');
                continue;
              }

              // Skip duplicates
              const entityKey = `${entityMap.kind}:${externalId}`;
              if (seenEntities.has(entityKey)) {
                continue;
              }
              seenEntities.add(entityKey);

              // Map properties
              const properties: Record<string, any> = {};
              for (const [graphqlField, mapping] of Object.entries(entityMap.fields)) {
                const value = record[mapping.csvColumn];
                if (value !== undefined && value !== '') {
                  properties[graphqlField] = mapping.transform
                    ? this.applyTransform(value, mapping.transform)
                    : value;
                } else if (mapping.default !== undefined) {
                  properties[graphqlField] = mapping.default;
                }
              }

              // Map labels
              let labels: string[] = [];
              if (Array.isArray(entityMap.labels)) {
                labels = entityMap.labels;
              } else if (entityMap.labels?.csvColumn) {
                const labelValue = record[entityMap.labels.csvColumn];
                labels = labelValue ? labelValue.split(',').map((l: string) => l.trim()) : [];
              }

              entities.push({
                externalId,
                kind: entityMap.kind,
                labels,
                properties,
              });
            }

            // Process relationship mappings
            if (mapping.relationships) {
              for (const relMap of mapping.relationships) {
                const fromId = record[relMap.fromField];
                const toId = record[relMap.toField];

                if (!fromId || !toId) {
                  continue;
                }

                let confidence = 1.0;
                if (typeof relMap.confidence === 'number') {
                  confidence = relMap.confidence;
                } else if (typeof relMap.confidence === 'object' && relMap.confidence.csvColumn) {
                  confidence = parseFloat(record[relMap.confidence.csvColumn]) || 1.0;
                }

                const properties: Record<string, any> = {};
                if (relMap.properties) {
                  for (const [key, propMap] of Object.entries(relMap.properties)) {
                    const value = record[propMap.csvColumn];
                    if (value !== undefined) {
                      properties[key] = propMap.transform
                        ? this.applyTransform(value, propMap.transform)
                        : value;
                    }
                  }
                }

                relationships.push({
                  fromExternalId: fromId,
                  toExternalId: toId,
                  relationshipType: relMap.type,
                  properties,
                  confidence,
                  source: 'csv-import',
                });
              }
            }
          } catch (error) {
            csvLogger.warn({ record, error }, 'Failed to parse record');
          }
        }
      });

      parser.on('error', (error) => {
        reject(error);
      });

      parser.on('end', () => {
        resolve({ entities, relationships });
      });

      stream.pipe(parser);
    });
  }

  /**
   * Check if record matches filter criteria
   */
  private matchesFilter(record: any, filter: Record<string, any>): boolean {
    for (const [field, expectedValue] of Object.entries(filter)) {
      if (record[field] !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  /**
   * Apply transformation to value
   */
  private applyTransform(value: any, transform: string): any {
    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'int':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1' || value === 'yes';
      case 'date':
        return new Date(value).toISOString();
      case 'json':
        return JSON.parse(value);
      default:
        csvLogger.warn({ transform }, 'Unknown transform type');
        return value;
    }
  }

  /**
   * Calculate SHA-256 hash of file
   */
  private async hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
