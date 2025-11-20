/**
 * Concrete Implementation of Metadata Store
 *
 * Provides Neo4j and PostgreSQL storage for sensitivity metadata
 */

import {
  MetadataStore,
  CatalogSensitivityEntry,
  toGraphProperties,
  fromGraphProperties,
  toSQLColumns,
  CYPHER_SENSITIVITY_QUERIES,
} from './metadata.js';
import {
  SensitivityMetadata,
  SensitivityClass,
  RegulatoryTag,
} from './sensitivity.js';

/**
 * Neo4j driver interface (simplified)
 */
interface Neo4jDriver {
  executeQuery(query: string, params: Record<string, any>): Promise<any>;
}

/**
 * PostgreSQL client interface (simplified)
 */
interface PostgresClient {
  query(text: string, values?: any[]): Promise<{ rows: any[] }>;
}

/**
 * Configuration for metadata store
 */
export interface MetadataStoreConfig {
  neo4jDriver?: Neo4jDriver;
  postgresClient?: PostgresClient;
  catalogTable?: string;
}

/**
 * Implementation of MetadataStore using Neo4j and PostgreSQL
 */
export class MetadataStoreImpl implements MetadataStore {
  private neo4jDriver?: Neo4jDriver;
  private postgresClient?: PostgresClient;
  private catalogTable: string;

  constructor(config: MetadataStoreConfig) {
    this.neo4jDriver = config.neo4jDriver;
    this.postgresClient = config.postgresClient;
    this.catalogTable = config.catalogTable || 'catalog_sensitivity';
  }

  /**
   * Store sensitivity metadata for a catalog entry
   */
  async storeCatalogMetadata(entry: CatalogSensitivityEntry): Promise<void> {
    if (!this.postgresClient) {
      throw new Error('PostgreSQL client not configured');
    }

    const sql = toSQLColumns(entry.sensitivity);

    await this.postgresClient.query(
      `
      INSERT INTO ${this.catalogTable} (
        catalog_id,
        catalog_type,
        fully_qualified_name,
        sensitivity_class,
        pii_types,
        severity,
        regulatory_tags,
        policy_tags,
        min_clearance,
        requires_step_up,
        requires_purpose,
        retention_days_min,
        retention_days_max,
        encryption_required,
        encryption_method,
        sensitivity_source,
        sensitivity_detected_at,
        last_scanned,
        scan_status,
        scan_error,
        field_sensitivity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (catalog_id) DO UPDATE SET
        catalog_type = EXCLUDED.catalog_type,
        fully_qualified_name = EXCLUDED.fully_qualified_name,
        sensitivity_class = EXCLUDED.sensitivity_class,
        pii_types = EXCLUDED.pii_types,
        severity = EXCLUDED.severity,
        regulatory_tags = EXCLUDED.regulatory_tags,
        policy_tags = EXCLUDED.policy_tags,
        min_clearance = EXCLUDED.min_clearance,
        requires_step_up = EXCLUDED.requires_step_up,
        requires_purpose = EXCLUDED.requires_purpose,
        retention_days_min = EXCLUDED.retention_days_min,
        retention_days_max = EXCLUDED.retention_days_max,
        encryption_required = EXCLUDED.encryption_required,
        encryption_method = EXCLUDED.encryption_method,
        sensitivity_source = EXCLUDED.sensitivity_source,
        sensitivity_detected_at = EXCLUDED.sensitivity_detected_at,
        last_scanned = EXCLUDED.last_scanned,
        scan_status = EXCLUDED.scan_status,
        scan_error = EXCLUDED.scan_error,
        field_sensitivity = EXCLUDED.field_sensitivity,
        updated_at = NOW()
      `,
      [
        entry.catalogId,
        entry.catalogType,
        entry.fullyQualifiedName,
        sql.sensitivity_class,
        JSON.stringify(sql.pii_types),
        sql.severity,
        JSON.stringify(sql.regulatory_tags),
        JSON.stringify(sql.policy_tags),
        sql.min_clearance,
        sql.requires_step_up,
        sql.requires_purpose,
        sql.retention_days_min,
        sql.retention_days_max,
        sql.encryption_required,
        sql.encryption_method,
        sql.sensitivity_source,
        sql.sensitivity_detected_at,
        entry.lastScanned,
        entry.scanStatus,
        entry.scanError,
        JSON.stringify(entry.fieldSensitivity || {}),
      ],
    );
  }

  /**
   * Retrieve sensitivity metadata for a catalog entry
   */
  async getCatalogMetadata(catalogId: string): Promise<CatalogSensitivityEntry | null> {
    if (!this.postgresClient) {
      throw new Error('PostgreSQL client not configured');
    }

    const result = await this.postgresClient.query(
      `SELECT * FROM ${this.catalogTable} WHERE catalog_id = $1`,
      [catalogId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.rowToCatalogEntry(row);
  }

  /**
   * Query catalog entries by sensitivity class
   */
  async queryCatalogBySensitivity(
    sensitivityClass: SensitivityClass,
  ): Promise<CatalogSensitivityEntry[]> {
    if (!this.postgresClient) {
      throw new Error('PostgreSQL client not configured');
    }

    const result = await this.postgresClient.query(
      `SELECT * FROM ${this.catalogTable} WHERE sensitivity_class = $1 ORDER BY last_scanned DESC`,
      [sensitivityClass],
    );

    return result.rows.map(row => this.rowToCatalogEntry(row));
  }

  /**
   * Query catalog entries by regulatory tag
   */
  async queryCatalogByRegulation(
    regulatoryTag: RegulatoryTag,
  ): Promise<CatalogSensitivityEntry[]> {
    if (!this.postgresClient) {
      throw new Error('PostgreSQL client not configured');
    }

    const result = await this.postgresClient.query(
      `SELECT * FROM ${this.catalogTable}
       WHERE regulatory_tags @> $1
       ORDER BY last_scanned DESC`,
      [JSON.stringify([regulatoryTag])],
    );

    return result.rows.map(row => this.rowToCatalogEntry(row));
  }

  /**
   * Tag a Neo4j node with sensitivity metadata
   */
  async tagGraphNode(nodeId: string, metadata: SensitivityMetadata): Promise<void> {
    if (!this.neo4jDriver) {
      throw new Error('Neo4j driver not configured');
    }

    const props = toGraphProperties(metadata);

    await this.neo4jDriver.executeQuery(CYPHER_SENSITIVITY_QUERIES.tagNode, {
      nodeId,
      ...props,
    });
  }

  /**
   * Tag a Neo4j relationship with sensitivity metadata
   */
  async tagGraphRelationship(
    relationshipId: string,
    metadata: SensitivityMetadata,
  ): Promise<void> {
    if (!this.neo4jDriver) {
      throw new Error('Neo4j driver not configured');
    }

    const props = toGraphProperties(metadata);

    await this.neo4jDriver.executeQuery(CYPHER_SENSITIVITY_QUERIES.tagRelationship, {
      relationshipId,
      ...props,
    });
  }

  /**
   * Query graph nodes by sensitivity class
   */
  async queryGraphNodesBySensitivity(
    sensitivityClass: SensitivityClass,
  ): Promise<string[]> {
    if (!this.neo4jDriver) {
      throw new Error('Neo4j driver not configured');
    }

    const result = await this.neo4jDriver.executeQuery(
      CYPHER_SENSITIVITY_QUERIES.queryNodesBySensitivity,
      { sensitivityClass },
    );

    return result.records?.map((r: any) => r.get('id')) || [];
  }

  /**
   * Update SQL record sensitivity metadata
   */
  async updateSQLMetadata(
    tableName: string,
    recordId: string,
    metadata: SensitivityMetadata,
  ): Promise<void> {
    if (!this.postgresClient) {
      throw new Error('PostgreSQL client not configured');
    }

    const sql = toSQLColumns(metadata);

    // Build dynamic UPDATE query
    const updateQuery = `
      UPDATE ${tableName}
      SET sensitivity_class = $1,
          pii_types = $2,
          severity = $3,
          regulatory_tags = $4,
          policy_tags = $5,
          sensitivity_detected_at = $6,
          sensitivity_source = $7,
          min_clearance = $8,
          requires_step_up = $9,
          requires_purpose = $10,
          retention_days_min = $11,
          retention_days_max = $12,
          encryption_required = $13,
          encryption_method = $14
      WHERE id = $15
    `;

    await this.postgresClient.query(updateQuery, [
      sql.sensitivity_class,
      JSON.stringify(sql.pii_types),
      sql.severity,
      JSON.stringify(sql.regulatory_tags),
      JSON.stringify(sql.policy_tags),
      sql.sensitivity_detected_at,
      sql.sensitivity_source,
      sql.min_clearance,
      sql.requires_step_up,
      sql.requires_purpose,
      sql.retention_days_min,
      sql.retention_days_max,
      sql.encryption_required,
      sql.encryption_method,
      recordId,
    ]);
  }

  /**
   * Batch update SQL records with sensitivity metadata
   */
  async batchUpdateSQLMetadata(
    tableName: string,
    updates: Array<{ recordId: string; metadata: SensitivityMetadata }>,
  ): Promise<void> {
    if (!this.postgresClient) {
      throw new Error('PostgreSQL client not configured');
    }

    // Use a transaction for batch updates
    await this.postgresClient.query('BEGIN');

    try {
      for (const update of updates) {
        await this.updateSQLMetadata(tableName, update.recordId, update.metadata);
      }
      await this.postgresClient.query('COMMIT');
    } catch (error) {
      await this.postgresClient.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Helper to convert database row to CatalogSensitivityEntry
   */
  private rowToCatalogEntry(row: any): CatalogSensitivityEntry {
    const sensitivity: SensitivityMetadata = {
      sensitivityClass: row.sensitivity_class,
      piiTypes: typeof row.pii_types === 'string'
        ? JSON.parse(row.pii_types)
        : row.pii_types || [],
      severity: row.severity,
      regulatoryTags: typeof row.regulatory_tags === 'string'
        ? JSON.parse(row.regulatory_tags)
        : row.regulatory_tags || [],
      policyTags: typeof row.policy_tags === 'string'
        ? JSON.parse(row.policy_tags)
        : row.policy_tags || [],
      retentionPolicy: {
        minimumDays: row.retention_days_min || 0,
        maximumDays: row.retention_days_max || 2555,
        autoDelete: false,
        legalHoldRequired: false,
        encryptionRequired: row.encryption_required || false,
        encryptionMethod: row.encryption_method,
      },
      accessControl: {
        minimumClearance: row.min_clearance || 0,
        requireStepUp: row.requires_step_up || false,
        requirePurpose: row.requires_purpose || false,
        requireApproval: false,
        maxExportRecords: row.max_export_records || 1000,
        auditAccess: true,
        requireAgreement: false,
      },
      lineage: {
        source: row.sensitivity_source || 'unknown',
        detectedAt: row.sensitivity_detected_at ? new Date(row.sensitivity_detected_at) : new Date(),
        lastValidated: row.sensitivity_last_validated
          ? new Date(row.sensitivity_last_validated)
          : undefined,
        validatedBy: row.sensitivity_validated_by,
      },
    };

    return {
      catalogId: row.catalog_id,
      catalogType: row.catalog_type,
      fullyQualifiedName: row.fully_qualified_name,
      sensitivity,
      fieldSensitivity: typeof row.field_sensitivity === 'string'
        ? JSON.parse(row.field_sensitivity)
        : row.field_sensitivity,
      lastScanned: row.last_scanned ? new Date(row.last_scanned) : new Date(),
      scanStatus: row.scan_status || 'pending',
      scanError: row.scan_error,
    };
  }

  /**
   * Initialize database schemas
   */
  async initialize(): Promise<void> {
    // This would run migrations to create tables and indexes
    // Implementation depends on migration strategy
  }
}

/**
 * Factory function to create MetadataStore
 */
export function createMetadataStore(
  config: MetadataStoreConfig,
): MetadataStore {
  return new MetadataStoreImpl(config);
}
