/**
 * Ingestion Hooks for PII Detection
 *
 * Provides middleware to inject PII detection and sensitivity tagging
 * into connector and ETL pipeline flows.
 */

import { HybridEntityRecognizer } from './recognizer.js';
import { TaxonomyManager } from './taxonomy.js';
import { SensitivityClassifier } from './sensitivity.js';
import { MetadataStore } from './metadata.js';
import {
  ClassifiedEntity,
  RecognitionOptions,
  SchemaMetadata,
  SchemaFieldMetadata,
} from './types.js';

/**
 * Configuration for ingestion hooks
 */
export interface IngestionHookConfig {
  /** Enable PII detection during ingestion */
  enabled: boolean;

  /** Minimum confidence threshold for PII detection */
  minimumConfidence?: number;

  /** Metadata store for persistence */
  metadataStore?: MetadataStore;

  /** Custom recognition options */
  recognitionOptions?: RecognitionOptions;

  /** Auto-tag catalog entries */
  autoTagCatalog?: boolean;

  /** Auto-tag graph nodes */
  autoTagGraph?: boolean;

  /** Auto-tag SQL records */
  autoTagSQL?: boolean;

  /** Fail ingestion on high-severity PII without approval */
  strictMode?: boolean;

  /** Callback for high-severity PII detection */
  onHighSeverityDetected?: (entities: ClassifiedEntity[]) => Promise<void>;
}

/**
 * Result of PII detection during ingestion
 */
export interface IngestionDetectionResult {
  /** Was PII detected? */
  detected: boolean;

  /** List of classified entities */
  entities: ClassifiedEntity[];

  /** Should ingestion be blocked? */
  blocked: boolean;

  /** Reason for blocking (if blocked) */
  blockReason?: string;

  /** Sensitivity metadata assigned */
  sensitivityMetadata?: any;

  /** Catalog ID if tagged */
  catalogId?: string;
}

/**
 * Record to be ingested
 */
export interface IngestionRecord {
  /** Unique identifier */
  id: string;

  /** Record data (can be nested object) */
  data: Record<string, any>;

  /** Schema metadata if available */
  schema?: SchemaMetadata;

  /** Source system */
  source: string;

  /** Table/collection name */
  tableName?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Ingestion hook for PII detection and tagging
 */
export class IngestionHook {
  private recognizer: HybridEntityRecognizer;
  private taxonomyManager: TaxonomyManager;
  private sensitivityClassifier: SensitivityClassifier;
  private config: IngestionHookConfig;

  constructor(config: IngestionHookConfig) {
    this.config = config;
    this.recognizer = new HybridEntityRecognizer();
    this.taxonomyManager = new TaxonomyManager();
    this.sensitivityClassifier = new SensitivityClassifier();
  }

  /**
   * Process a single record during ingestion
   */
  async processRecord(
    record: IngestionRecord,
  ): Promise<IngestionDetectionResult> {
    if (!this.config.enabled) {
      return {
        detected: false,
        entities: [],
        blocked: false,
      };
    }

    const allEntities: ClassifiedEntity[] = [];

    // Flatten and detect PII in all fields
    const flattenedFields = this.flattenRecord(record.data, record.schema);

    for (const field of flattenedFields) {
      const result = await this.recognizer.recognize(
        {
          value: String(field.value),
          schemaField: field.schemaField,
          schema: record.schema,
          recordId: record.id,
          tableName: record.tableName,
        },
        {
          ...this.config.recognitionOptions,
          minimumConfidence: this.config.minimumConfidence || 0.7,
        },
      );

      // Classify entities using taxonomy
      for (const entity of result.entities) {
        const classification = this.taxonomyManager.classify(entity.type);
        if (classification) {
          const classified: ClassifiedEntity = {
            ...entity,
            severity: classification.node.severity,
            taxonomy: classification.taxonomy,
            categories: classification.node.categories || [],
            policyTags: classification.node.policyTags || [],
          };
          allEntities.push(classified);
        }
      }
    }

    // Check if any high-severity or critical PII was detected
    const highSeverityEntities = allEntities.filter(
      e => e.severity === 'high' || e.severity === 'critical',
    );

    let blocked = false;
    let blockReason: string | undefined;

    if (this.config.strictMode && highSeverityEntities.length > 0) {
      blocked = true;
      blockReason = `High-severity PII detected: ${highSeverityEntities
        .map(e => e.type)
        .join(', ')}. Manual approval required.`;

      // Trigger callback
      if (this.config.onHighSeverityDetected) {
        await this.config.onHighSeverityDetected(highSeverityEntities);
      }
    }

    // Generate sensitivity metadata
    let sensitivityMetadata;
    if (allEntities.length > 0) {
      const piiTypes = [...new Set(allEntities.map(e => e.type))];
      const maxSeverity = this.getMaxSeverity(allEntities);
      const policyTags = [...new Set(allEntities.flatMap(e => e.policyTags))];

      sensitivityMetadata = this.sensitivityClassifier.classify(
        piiTypes,
        maxSeverity,
        policyTags,
      );
    }

    // Auto-tag catalog if enabled
    let catalogId: string | undefined;
    if (
      this.config.autoTagCatalog &&
      this.config.metadataStore &&
      sensitivityMetadata
    ) {
      catalogId = await this.tagCatalog(record, sensitivityMetadata, allEntities);
    }

    return {
      detected: allEntities.length > 0,
      entities: allEntities,
      blocked,
      blockReason,
      sensitivityMetadata,
      catalogId,
    };
  }

  /**
   * Process a batch of records
   */
  async processBatch(
    records: IngestionRecord[],
  ): Promise<IngestionDetectionResult[]> {
    const results: IngestionDetectionResult[] = [];

    for (const record of records) {
      const result = await this.processRecord(record);
      results.push(result);
    }

    return results;
  }

  /**
   * Tag catalog entry with sensitivity metadata
   */
  private async tagCatalog(
    record: IngestionRecord,
    sensitivityMetadata: any,
    entities: ClassifiedEntity[],
  ): Promise<string> {
    if (!this.config.metadataStore) {
      throw new Error('Metadata store not configured');
    }

    // Build field-level sensitivity map
    const fieldSensitivity: Record<string, any> = {};
    for (const entity of entities) {
      const fieldPath = entity.context.schemaPath?.join('.') || entity.context.schemaField || 'unknown';
      if (!fieldSensitivity[fieldPath]) {
        fieldSensitivity[fieldPath] = this.sensitivityClassifier.classify(
          [entity.type],
          entity.severity,
        );
      }
    }

    const catalogId = `${record.source}:${record.tableName || 'unknown'}:${record.id}`;

    await this.config.metadataStore.storeCatalogMetadata({
      catalogId,
      catalogType: 'table',
      fullyQualifiedName: `${record.source}.${record.tableName}.${record.id}`,
      sensitivity: sensitivityMetadata,
      fieldSensitivity,
      lastScanned: new Date(),
      scanStatus: 'completed',
    });

    return catalogId;
  }

  /**
   * Flatten nested record structure for scanning
   */
  private flattenRecord(
    data: Record<string, any>,
    schema?: SchemaMetadata,
    path: string[] = [],
  ): Array<{ value: any; schemaField?: SchemaFieldMetadata; path: string[] }> {
    const results: Array<{ value: any; schemaField?: SchemaFieldMetadata; path: string[] }> = [];

    for (const [key, value] of Object.entries(data)) {
      const currentPath = [...path, key];
      const schemaField = schema?.fields.find(f => f.fieldName === key);

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        // Recurse into nested objects
        results.push(...this.flattenRecord(value, schema, currentPath));
      } else if (Array.isArray(value)) {
        // Process array elements
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            results.push(...this.flattenRecord(item, schema, [...currentPath, String(index)]));
          } else {
            results.push({
              value: item,
              schemaField,
              path: [...currentPath, String(index)],
            });
          }
        });
      } else {
        // Leaf value - add to results
        results.push({
          value,
          schemaField,
          path: currentPath,
        });
      }
    }

    return results;
  }

  /**
   * Get maximum severity from list of entities
   */
  private getMaxSeverity(entities: ClassifiedEntity[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const maxIndex = entities.reduce((max, entity) => {
      const index = severityOrder.indexOf(entity.severity);
      return index > max ? index : max;
    }, 0);
    return severityOrder[maxIndex] as 'low' | 'medium' | 'high' | 'critical';
  }
}

/**
 * Factory function to create ingestion hook
 */
export function createIngestionHook(
  config: IngestionHookConfig,
): IngestionHook {
  return new IngestionHook(config);
}

/**
 * Connector middleware wrapper
 *
 * Wraps a connector's fetch/ingest method to inject PII detection
 */
export function withPIIDetection<T>(
  connector: T,
  hook: IngestionHook,
  options?: {
    onDetection?: (result: IngestionDetectionResult) => void;
    onBlocked?: (result: IngestionDetectionResult) => void;
  },
): T {
  return new Proxy(connector as any, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      // Intercept methods that ingest data
      if (
        typeof original === 'function' &&
        (prop === 'fetch' || prop === 'ingest' || prop === 'process' || prop === 'load')
      ) {
        return async function (...args: any[]) {
          // Call original method
          const result = await original.apply(target, args);

          // Process result through PII detection
          if (result && typeof result === 'object') {
            // Assume result has records array
            const records = Array.isArray(result) ? result : result.records || [];

            for (const record of records) {
              if (record && typeof record === 'object' && record.id) {
                const detectionResult = await hook.processRecord({
                  id: record.id,
                  data: record,
                  source: target.constructor.name,
                });

                if (detectionResult.detected && options?.onDetection) {
                  options.onDetection(detectionResult);
                }

                if (detectionResult.blocked && options?.onBlocked) {
                  options.onBlocked(detectionResult);
                  throw new Error(detectionResult.blockReason);
                }
              }
            }
          }

          return result;
        };
      }

      return original;
    },
  });
}
