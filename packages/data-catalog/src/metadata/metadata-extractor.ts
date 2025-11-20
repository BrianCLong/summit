/**
 * Metadata Extractor
 * Automated metadata extraction from various data sources
 * Supports databases, APIs, files, and custom sources
 */

import { Pool, Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  DataAsset,
  AssetType,
  DataClassification,
  AssetStatus,
  ExtractionConfig,
  ExtractionResult,
  Schema,
  SchemaField,
  DataFieldType,
  ProfilingResult,
  MetadataTag,
} from '../types.js';

/**
 * Configuration for metadata extraction
 */
export interface MetadataExtractorConfig {
  /** Enable automatic profiling during extraction */
  autoProfile?: boolean;
  /** Enable data sampling */
  enableSampling?: boolean;
  /** Sample size for profiling */
  sampleSize?: number;
  /** Timeout for extraction operations (ms) */
  timeout?: number;
  /** Batch size for bulk operations */
  batchSize?: number;
}

/**
 * PostgreSQL metadata extractor
 */
class PostgresExtractor {
  private client: Client | null = null;

  /**
   * Connect to PostgreSQL database
   */
  async connect(config: ExtractionConfig): Promise<void> {
    this.client = new Client({
      connectionString: config.source.connectionString,
    });
    await this.client.connect();
  }

  /**
   * Extract metadata from PostgreSQL
   */
  async extract(config: ExtractionConfig): Promise<DataAsset[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const assets: DataAsset[] = [];

    // Get all schemas
    const schemasQuery = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `;
    const schemasResult = await this.client.query(schemasQuery);

    for (const schemaRow of schemasResult.rows) {
      const schemaName = schemaRow.schema_name;

      // Skip if not in scope
      if (config.scope?.schemas && !config.scope.schemas.includes(schemaName)) {
        continue;
      }

      // Get all tables in schema
      const tablesQuery = `
        SELECT
          t.table_name,
          obj_description(('"' || t.table_schema || '"."' || t.table_name || '"')::regclass) as table_comment
        FROM information_schema.tables t
        WHERE t.table_schema = $1
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
      `;
      const tablesResult = await this.client.query(tablesQuery, [schemaName]);

      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.table_name;

        // Skip if not in scope
        if (config.scope?.tables && !config.scope.tables.includes(tableName)) {
          continue;
        }

        // Get columns
        const columnsQuery = `
          SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            col_description(('"' || c.table_schema || '"."' || c.table_name || '"')::regclass, c.ordinal_position) as column_comment,
            (
              SELECT COUNT(*)
              FROM information_schema.key_column_usage kcu
              JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
              WHERE tc.constraint_type = 'PRIMARY KEY'
                AND kcu.table_schema = c.table_schema
                AND kcu.table_name = c.table_name
                AND kcu.column_name = c.column_name
            ) > 0 as is_primary_key,
            (
              SELECT COUNT(*)
              FROM information_schema.key_column_usage kcu
              JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
              WHERE tc.constraint_type = 'FOREIGN KEY'
                AND kcu.table_schema = c.table_schema
                AND kcu.table_name = c.table_name
                AND kcu.column_name = c.column_name
            ) > 0 as is_foreign_key
          FROM information_schema.columns c
          WHERE c.table_schema = $1
            AND c.table_name = $2
          ORDER BY c.ordinal_position
        `;
        const columnsResult = await this.client.query(columnsQuery, [schemaName, tableName]);

        // Build schema
        const fields: SchemaField[] = columnsResult.rows.map((col) => ({
          name: col.column_name,
          dataType: this.mapPostgresType(col.data_type),
          description: col.column_comment || undefined,
          nullable: col.is_nullable === 'YES',
          isPrimaryKey: col.is_primary_key,
          isForeignKey: col.is_foreign_key,
          defaultValue: col.column_default,
          constraints: {
            maxLength: col.character_maximum_length || undefined,
          },
        }));

        const schema: Schema = {
          version: '1.0',
          fields,
          documentation: tableRow.table_comment || undefined,
          evolutionHistory: [],
        };

        // Create data asset
        const asset: DataAsset = {
          id: uuidv4(),
          name: `${schemaName}.${tableName}`,
          displayName: tableName,
          type: AssetType.TABLE,
          description: tableRow.table_comment || `Table ${tableName} in schema ${schemaName}`,
          classification: DataClassification.INTERNAL,
          status: AssetStatus.ACTIVE,
          source: {
            system: 'PostgreSQL',
            database: this.client.database || undefined,
            schema: schemaName,
          },
          schema,
          owner: 'system',
          stewards: [],
          tags: [],
          businessTerms: [],
          createdAt: new Date(),
          createdBy: 'metadata-extractor',
          updatedAt: new Date(),
          updatedBy: 'metadata-extractor',
          lastProfiled: new Date(),
        };

        assets.push(asset);
      }
    }

    return assets;
  }

  /**
   * Map PostgreSQL types to standard data types
   */
  private mapPostgresType(pgType: string): DataFieldType {
    const typeMap: { [key: string]: DataFieldType } = {
      'character varying': DataFieldType.STRING,
      varchar: DataFieldType.STRING,
      char: DataFieldType.STRING,
      text: DataFieldType.STRING,
      integer: DataFieldType.INTEGER,
      bigint: DataFieldType.INTEGER,
      smallint: DataFieldType.INTEGER,
      numeric: DataFieldType.FLOAT,
      decimal: DataFieldType.FLOAT,
      real: DataFieldType.FLOAT,
      'double precision': DataFieldType.FLOAT,
      boolean: DataFieldType.BOOLEAN,
      date: DataFieldType.DATE,
      timestamp: DataFieldType.TIMESTAMP,
      'timestamp without time zone': DataFieldType.TIMESTAMP,
      'timestamp with time zone': DataFieldType.TIMESTAMP,
      json: DataFieldType.JSON,
      jsonb: DataFieldType.JSON,
      uuid: DataFieldType.UUID,
      bytea: DataFieldType.BINARY,
      ARRAY: DataFieldType.ARRAY,
    };

    return typeMap[pgType.toLowerCase()] || DataFieldType.STRING;
  }

  /**
   * Profile data for quality metrics
   */
  async profile(asset: DataAsset, sampleSize: number = 1000): Promise<ProfilingResult> {
    if (!this.client || !asset.schema) {
      throw new Error('Cannot profile: no connection or schema');
    }

    const [schemaName, tableName] = asset.name.split('.');
    const result: ProfilingResult = {
      assetId: asset.id,
      timestamp: new Date(),
      rowCount: 0,
      columnStats: {},
      qualityIssues: [],
    };

    // Get row count
    const countQuery = `SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}"`;
    const countResult = await this.client.query(countQuery);
    result.rowCount = parseInt(countResult.rows[0].count, 10);

    // Profile each column
    for (const field of asset.schema.fields) {
      const columnName = field.name;

      try {
        // Get column statistics
        const statsQuery = `
          SELECT
            COUNT(*) as total_count,
            COUNT("${columnName}") as non_null_count,
            COUNT(DISTINCT "${columnName}") as unique_count
          FROM "${schemaName}"."${tableName}"
          LIMIT ${sampleSize}
        `;
        const statsResult = await this.client.query(statsQuery);
        const stats = statsResult.rows[0];

        result.columnStats[columnName] = {
          nullCount: stats.total_count - stats.non_null_count,
          uniqueCount: stats.unique_count,
        };

        // Check for quality issues
        const nullRate = result.columnStats[columnName].nullCount / result.rowCount;
        if (!field.nullable && result.columnStats[columnName].nullCount > 0) {
          result.qualityIssues.push({
            column: columnName,
            issueType: 'UNEXPECTED_NULLS',
            severity: 'HIGH',
            description: `Column marked as non-nullable contains ${result.columnStats[columnName].nullCount} null values`,
            affectedRows: result.columnStats[columnName].nullCount,
          });
        } else if (field.nullable && nullRate > 0.5) {
          result.qualityIssues.push({
            column: columnName,
            issueType: 'HIGH_NULL_RATE',
            severity: 'MEDIUM',
            description: `Column has high null rate: ${(nullRate * 100).toFixed(2)}%`,
            affectedRows: result.columnStats[columnName].nullCount,
          });
        }
      } catch (error) {
        console.error(`Error profiling column ${columnName}:`, error);
      }
    }

    return result;
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }
}

/**
 * Main metadata extractor class
 */
export class MetadataExtractor {
  private config: MetadataExtractorConfig;
  private extractors: Map<string, any>;

  constructor(config: MetadataExtractorConfig = {}) {
    this.config = {
      autoProfile: config.autoProfile ?? true,
      enableSampling: config.enableSampling ?? true,
      sampleSize: config.sampleSize ?? 1000,
      timeout: config.timeout ?? 300000, // 5 minutes
      batchSize: config.batchSize ?? 100,
    };

    this.extractors = new Map();
    this.extractors.set('postgres', PostgresExtractor);
  }

  /**
   * Extract metadata from a data source
   */
  async extract(config: ExtractionConfig): Promise<ExtractionResult> {
    const startTime = Date.now();
    const result: ExtractionResult = {
      assets: [],
      stats: {
        assetsDiscovered: 0,
        assetsCreated: 0,
        assetsUpdated: 0,
        errors: 0,
      },
      errors: [],
      timestamp: new Date(),
      duration: 0,
    };

    try {
      // Get appropriate extractor
      const ExtractorClass = this.extractors.get(config.source.type);
      if (!ExtractorClass) {
        throw new Error(`Unsupported source type: ${config.source.type}`);
      }

      const extractor = new ExtractorClass();

      // Connect and extract
      await extractor.connect(config);
      const assets = await extractor.extract(config);

      result.assets = assets;
      result.stats.assetsDiscovered = assets.length;
      result.stats.assetsCreated = assets.length;

      // Auto-profile if enabled
      if (this.config.autoProfile && config.profileData !== false) {
        for (const asset of assets) {
          try {
            const profileResult = await extractor.profile(asset, this.config.sampleSize);
            asset.customMetadata = asset.customMetadata || {};
            asset.customMetadata.profileResult = profileResult;
          } catch (error) {
            result.errors?.push({
              asset: asset.name,
              error: 'Profiling failed',
              details: error instanceof Error ? error.message : String(error),
            });
            result.stats.errors++;
          }
        }
      }

      // Disconnect
      await extractor.disconnect();
    } catch (error) {
      result.errors?.push({
        asset: 'extraction',
        error: 'Extraction failed',
        details: error instanceof Error ? error.message : String(error),
      });
      result.stats.errors++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Extract metadata and enrich with semantic information
   */
  async extractWithEnrichment(config: ExtractionConfig): Promise<ExtractionResult> {
    const result = await this.extract(config);

    // Enrich assets with semantic metadata
    for (const asset of result.assets) {
      await this.enrichAsset(asset);
    }

    return result;
  }

  /**
   * Enrich asset with semantic metadata
   */
  private async enrichAsset(asset: DataAsset): Promise<void> {
    // Auto-tag based on naming patterns
    const tags: MetadataTag[] = [];

    // Detect PII
    if (this.containsPII(asset)) {
      tags.push({
        id: uuidv4(),
        key: 'contains_pii',
        value: 'true',
        description: 'Contains personally identifiable information',
        category: 'data-classification',
        createdAt: new Date(),
        createdBy: 'metadata-extractor',
      });
      asset.classification = DataClassification.CONFIDENTIAL;
    }

    // Detect temporal data
    if (this.containsTemporalData(asset)) {
      tags.push({
        id: uuidv4(),
        key: 'temporal',
        value: 'true',
        description: 'Contains time-series or temporal data',
        category: 'data-type',
        createdAt: new Date(),
        createdBy: 'metadata-extractor',
      });
    }

    // Detect financial data
    if (this.containsFinancialData(asset)) {
      tags.push({
        id: uuidv4(),
        key: 'financial',
        value: 'true',
        description: 'Contains financial data',
        category: 'data-type',
        createdAt: new Date(),
        createdBy: 'metadata-extractor',
      });
    }

    asset.tags.push(...tags);
  }

  /**
   * Check if asset contains PII
   */
  private containsPII(asset: DataAsset): boolean {
    if (!asset.schema) return false;

    const piiPatterns = [
      /email/i,
      /phone/i,
      /ssn/i,
      /social_security/i,
      /passport/i,
      /driver_license/i,
      /credit_card/i,
      /address/i,
      /firstname/i,
      /lastname/i,
      /fullname/i,
      /date_of_birth/i,
      /dob/i,
    ];

    return asset.schema.fields.some((field) =>
      piiPatterns.some((pattern) => pattern.test(field.name))
    );
  }

  /**
   * Check if asset contains temporal data
   */
  private containsTemporalData(asset: DataAsset): boolean {
    if (!asset.schema) return false;

    return asset.schema.fields.some(
      (field) =>
        field.dataType === DataFieldType.DATE ||
        field.dataType === DataFieldType.TIMESTAMP ||
        /timestamp|date|time|created_at|updated_at/i.test(field.name)
    );
  }

  /**
   * Check if asset contains financial data
   */
  private containsFinancialData(asset: DataAsset): boolean {
    if (!asset.schema) return false;

    const financialPatterns = [
      /amount/i,
      /price/i,
      /cost/i,
      /revenue/i,
      /balance/i,
      /payment/i,
      /transaction/i,
      /invoice/i,
      /salary/i,
      /wage/i,
    ];

    return asset.schema.fields.some((field) =>
      financialPatterns.some((pattern) => pattern.test(field.name))
    );
  }

  /**
   * Schedule periodic metadata extraction
   */
  scheduleExtraction(
    config: ExtractionConfig,
    intervalMs: number,
    callback?: (result: ExtractionResult) => void
  ): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const result = await this.extract(config);
        if (callback) {
          callback(result);
        }
      } catch (error) {
        console.error('Scheduled extraction failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Extract sample data from an asset
   */
  async extractSample(
    asset: DataAsset,
    config: ExtractionConfig,
    limit: number = 100
  ): Promise<any[]> {
    if (!asset.schema || asset.type !== AssetType.TABLE) {
      throw new Error('Cannot extract sample: asset is not a table');
    }

    const ExtractorClass = this.extractors.get(config.source.type);
    if (!ExtractorClass) {
      throw new Error(`Unsupported source type: ${config.source.type}`);
    }

    const extractor = new ExtractorClass();
    await extractor.connect(config);

    try {
      const [schemaName, tableName] = asset.name.split('.');
      const query = `SELECT * FROM "${schemaName}"."${tableName}" LIMIT ${limit}`;
      const result = await extractor.client.query(query);
      return result.rows;
    } finally {
      await extractor.disconnect();
    }
  }
}
