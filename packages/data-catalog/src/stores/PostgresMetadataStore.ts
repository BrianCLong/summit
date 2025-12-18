/**
 * PostgreSQL Metadata Store Implementation
 * Database layer for metadata catalog operations (DataSource, Dataset, Field, Mapping, License)
 */

import { Pool } from 'pg';
import {
  DataSource,
  Dataset,
  Field,
  Mapping,
  License,
  SchemaVersion,
  ConnectorRegistration,
  LineageSummary,
} from '../types/metadata.js';

export interface IMetadataStore {
  // DataSource operations
  getDataSource(id: string): Promise<DataSource | null>;
  listDataSources(): Promise<DataSource[]>;
  createDataSource(source: DataSource): Promise<DataSource>;
  updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource>;
  deleteDataSource(id: string): Promise<void>;

  // Dataset operations
  getDataset(id: string): Promise<Dataset | null>;
  listDatasets(sourceId?: string): Promise<Dataset[]>;
  createDataset(dataset: Dataset): Promise<Dataset>;
  updateDataset(id: string, updates: Partial<Dataset>): Promise<Dataset>;
  deleteDataset(id: string): Promise<void>;

  // Field operations
  getField(id: string): Promise<Field | null>;
  listFields(datasetId: string): Promise<Field[]>;
  createField(field: Field): Promise<Field>;
  updateField(id: string, updates: Partial<Field>): Promise<Field>;
  deleteField(id: string): Promise<void>;

  // Mapping operations
  getMapping(id: string): Promise<Mapping | null>;
  listMappings(sourceId?: string): Promise<Mapping[]>;
  createMapping(mapping: Mapping): Promise<Mapping>;
  updateMapping(id: string, updates: Partial<Mapping>): Promise<Mapping>;
  deleteMapping(id: string): Promise<void>;

  // License operations
  getLicense(id: string): Promise<License | null>;
  listLicenses(): Promise<License[]>;
  createLicense(license: License): Promise<License>;
  updateLicense(id: string, updates: Partial<License>): Promise<License>;
  deleteLicense(id: string): Promise<void>;

  // Schema registry operations
  getSchemaVersion(schemaId: string, version: number): Promise<SchemaVersion | null>;
  getLatestSchemaVersion(schemaId: string): Promise<SchemaVersion | null>;
  registerSchema(schemaVersion: SchemaVersion): Promise<SchemaVersion>;
  listSchemaVersions(schemaId: string): Promise<SchemaVersion[]>;

  // Connector registry operations
  getConnector(id: string): Promise<ConnectorRegistration | null>;
  listConnectors(): Promise<ConnectorRegistration[]>;
  registerConnector(connector: ConnectorRegistration): Promise<ConnectorRegistration>;

  // Lineage summary operations
  getLineageSummary(entityId: string): Promise<LineageSummary | null>;
  updateLineageSummary(summary: LineageSummary): Promise<LineageSummary>;
}

export class PostgresMetadataStore implements IMetadataStore {
  constructor(private pool: Pool) {}

  // ====== DataSource Operations ======

  async getDataSource(id: string): Promise<DataSource | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_data_sources WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRowToDataSource(result.rows[0]) : null;
  }

  async listDataSources(): Promise<DataSource[]> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_data_sources ORDER BY created_at DESC'
    );
    return result.rows.map(row => this.mapRowToDataSource(row));
  }

  async createDataSource(source: DataSource): Promise<DataSource> {
    const query = `
      INSERT INTO catalog_data_sources (
        id, name, display_name, description, type, connector_id, connector_version,
        connection_config, connection_status, last_connected_at, last_synced_at,
        owner, team, tags, properties, schema_id, schema_version,
        created_at, updated_at, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

    const values = [
      source.id, source.name, source.displayName, source.description,
      source.type, source.connectorId, source.connectorVersion,
      JSON.stringify(source.connectionConfig), source.connectionStatus,
      source.lastConnectedAt, source.lastSyncedAt, source.owner, source.team,
      JSON.stringify(source.tags), JSON.stringify(source.properties),
      source.schemaId, source.schemaVersion, source.createdAt, source.updatedAt,
      source.createdBy, source.updatedBy,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToDataSource(result.rows[0]);
  }

  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.connectionStatus !== undefined) {
      setClauses.push(`connection_status = $${paramIndex++}`);
      values.push(updates.connectionStatus);
    }
    if (updates.lastConnectedAt !== undefined) {
      setClauses.push(`last_connected_at = $${paramIndex++}`);
      values.push(updates.lastConnectedAt);
    }
    if (updates.lastSyncedAt !== undefined) {
      setClauses.push(`last_synced_at = $${paramIndex++}`);
      values.push(updates.lastSyncedAt);
    }

    const query = `
      UPDATE catalog_data_sources
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`DataSource ${id} not found`);
    }
    return this.mapRowToDataSource(result.rows[0]);
  }

  async deleteDataSource(id: string): Promise<void> {
    await this.pool.query('DELETE FROM catalog_data_sources WHERE id = $1', [id]);
  }

  // ====== Dataset Operations ======

  async getDataset(id: string): Promise<Dataset | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_datasets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const dataset = this.mapRowToDataset(result.rows[0]);
    // Load fields
    dataset.fields = await this.listFields(id);
    return dataset;
  }

  async listDatasets(sourceId?: string): Promise<Dataset[]> {
    let query = 'SELECT * FROM catalog_datasets';
    const params: any[] = [];

    if (sourceId) {
      query += ' WHERE source_id = $1';
      params.push(sourceId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToDataset(row));
  }

  async createDataset(dataset: Dataset): Promise<Dataset> {
    const query = `
      INSERT INTO catalog_datasets (
        id, source_id, name, display_name, description, fully_qualified_name,
        dataset_type, schema_id, schema_version, canonical_mapping_id,
        canonical_mapping_version, license_id, policy_tags, retention_days,
        legal_basis, row_count, size_bytes, last_profiled_at, quality_score,
        owner, stewards, tags, properties, created_at, updated_at, last_accessed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *
    `;

    const values = [
      dataset.id, dataset.sourceId, dataset.name, dataset.displayName,
      dataset.description, dataset.fullyQualifiedName, dataset.datasetType,
      dataset.schemaId, dataset.schemaVersion, dataset.canonicalMappingId,
      dataset.canonicalMappingVersion, dataset.licenseId,
      JSON.stringify(dataset.policyTags), dataset.retentionDays,
      dataset.legalBasis, dataset.rowCount, dataset.sizeBytes,
      dataset.lastProfiledAt, dataset.qualityScore, dataset.owner,
      JSON.stringify(dataset.stewards), JSON.stringify(dataset.tags),
      JSON.stringify(dataset.properties), dataset.createdAt,
      dataset.updatedAt, dataset.lastAccessedAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToDataset(result.rows[0]);
  }

  async updateDataset(id: string, updates: Partial<Dataset>): Promise<Dataset> {
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (updates.rowCount !== undefined) {
      setClauses.push(`row_count = $${paramIndex++}`);
      values.push(updates.rowCount);
    }
    if (updates.sizeBytes !== undefined) {
      setClauses.push(`size_bytes = $${paramIndex++}`);
      values.push(updates.sizeBytes);
    }
    if (updates.lastProfiledAt !== undefined) {
      setClauses.push(`last_profiled_at = $${paramIndex++}`);
      values.push(updates.lastProfiledAt);
    }
    if (updates.qualityScore !== undefined) {
      setClauses.push(`quality_score = $${paramIndex++}`);
      values.push(updates.qualityScore);
    }

    const query = `
      UPDATE catalog_datasets
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Dataset ${id} not found`);
    }
    return this.mapRowToDataset(result.rows[0]);
  }

  async deleteDataset(id: string): Promise<void> {
    await this.pool.query('DELETE FROM catalog_datasets WHERE id = $1', [id]);
  }

  // ====== Field Operations ======

  async getField(id: string): Promise<Field | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_fields WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRowToField(result.rows[0]) : null;
  }

  async listFields(datasetId: string): Promise<Field[]> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_fields WHERE dataset_id = $1 ORDER BY name',
      [datasetId]
    );
    return result.rows.map(row => this.mapRowToField(row));
  }

  async createField(field: Field): Promise<Field> {
    const query = `
      INSERT INTO catalog_fields (
        id, dataset_id, name, display_name, description, data_type,
        semantic_type, nullable, is_primary_key, is_foreign_key,
        foreign_key_ref, canonical_field_name, transformation_logic,
        policy_tags, sensitivity_level, statistics, tags, properties,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *
    `;

    const values = [
      field.id, field.datasetId, field.name, field.displayName,
      field.description, field.dataType, field.semanticType,
      field.nullable, field.isPrimaryKey, field.isForeignKey,
      field.foreignKeyRef, field.canonicalFieldName,
      field.transformationLogic, JSON.stringify(field.policyTags),
      field.sensitivityLevel, field.statistics ? JSON.stringify(field.statistics) : null,
      JSON.stringify(field.tags), JSON.stringify(field.properties),
      field.createdAt, field.updatedAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToField(result.rows[0]);
  }

  async updateField(id: string, updates: Partial<Field>): Promise<Field> {
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.canonicalFieldName !== undefined) {
      setClauses.push(`canonical_field_name = $${paramIndex++}`);
      values.push(updates.canonicalFieldName);
    }
    if (updates.statistics !== undefined) {
      setClauses.push(`statistics = $${paramIndex++}`);
      values.push(JSON.stringify(updates.statistics));
    }

    const query = `
      UPDATE catalog_fields
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Field ${id} not found`);
    }
    return this.mapRowToField(result.rows[0]);
  }

  async deleteField(id: string): Promise<void> {
    await this.pool.query('DELETE FROM catalog_fields WHERE id = $1', [id]);
  }

  // ====== Mapping Operations ======

  async getMapping(id: string): Promise<Mapping | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_mappings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const mapping = this.mapRowToMapping(result.rows[0]);

    // Load field mappings
    const fieldMappingsResult = await this.pool.query(
      'SELECT * FROM catalog_field_mappings WHERE mapping_id = $1',
      [id]
    );
    mapping.fieldMappings = fieldMappingsResult.rows.map(row => ({
      sourceFieldName: row.source_field_name,
      targetFieldName: row.target_field_name,
      transformationType: row.transformation_type,
      transformationExpression: row.transformation_expression,
      defaultValue: row.default_value,
      required: row.required,
      metadata: row.metadata || {},
    }));

    // Load transformation rules
    const rulesResult = await this.pool.query(
      'SELECT * FROM catalog_transformation_rules WHERE mapping_id = $1 ORDER BY execution_order',
      [id]
    );
    mapping.transformationRules = rulesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      ruleType: row.rule_type,
      expression: row.expression,
      language: row.language,
      inputFields: row.input_fields || [],
      outputFields: row.output_fields || [],
      executionOrder: row.execution_order,
      enabled: row.enabled,
      metadata: row.metadata || {},
    }));

    return mapping;
  }

  async listMappings(sourceId?: string): Promise<Mapping[]> {
    let query = 'SELECT * FROM catalog_mappings';
    const params: any[] = [];

    if (sourceId) {
      query += ' WHERE source_id = $1';
      params.push(sourceId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToMapping(row));
  }

  async createMapping(mapping: Mapping): Promise<Mapping> {
    const query = `
      INSERT INTO catalog_mappings (
        id, name, description, source_id, dataset_id, source_schema_id,
        source_schema_version, canonical_schema_id, canonical_schema_version,
        canonical_entity_type, status, validated_at, validated_by, version,
        previous_version_id, tags, properties, created_at, updated_at,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const values = [
      mapping.id, mapping.name, mapping.description, mapping.sourceId,
      mapping.datasetId, mapping.sourceSchemaId, mapping.sourceSchemaVersion,
      mapping.canonicalSchemaId, mapping.canonicalSchemaVersion,
      mapping.canonicalEntityType, mapping.status, mapping.validatedAt,
      mapping.validatedBy, mapping.version, mapping.previousVersionId,
      JSON.stringify(mapping.tags), JSON.stringify(mapping.properties),
      mapping.createdAt, mapping.updatedAt, mapping.createdBy, mapping.updatedBy,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToMapping(result.rows[0]);
  }

  async updateMapping(id: string, updates: Partial<Mapping>): Promise<Mapping> {
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.validatedAt !== undefined) {
      setClauses.push(`validated_at = $${paramIndex++}`);
      values.push(updates.validatedAt);
    }
    if (updates.validatedBy !== undefined) {
      setClauses.push(`validated_by = $${paramIndex++}`);
      values.push(updates.validatedBy);
    }

    const query = `
      UPDATE catalog_mappings
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Mapping ${id} not found`);
    }
    return this.mapRowToMapping(result.rows[0]);
  }

  async deleteMapping(id: string): Promise<void> {
    await this.pool.query('DELETE FROM catalog_mappings WHERE id = $1', [id]);
  }

  // ====== License Operations ======

  async getLicense(id: string): Promise<License | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_licenses WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRowToLicense(result.rows[0]) : null;
  }

  async listLicenses(): Promise<License[]> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_licenses ORDER BY created_at DESC'
    );
    return result.rows.map(row => this.mapRowToLicense(row));
  }

  async createLicense(license: License): Promise<License> {
    const query = `
      INSERT INTO catalog_licenses (
        id, name, display_name, description, license_type, terms_and_conditions,
        usage_restrictions, allowed_purposes, prohibited_purposes,
        requires_attribution, attribution_text, compliance_frameworks,
        legal_basis, jurisdictions, expires_at, auto_renew, licensor,
        contact_email, contact_url, status, tags, properties,
        created_at, updated_at, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *
    `;

    const values = [
      license.id, license.name, license.displayName, license.description,
      license.licenseType, license.termsAndConditions,
      JSON.stringify(license.usageRestrictions),
      JSON.stringify(license.allowedPurposes),
      JSON.stringify(license.prohibitedPurposes),
      license.requiresAttribution, license.attributionText,
      JSON.stringify(license.complianceFrameworks),
      license.legalBasis, JSON.stringify(license.jurisdictions),
      license.expiresAt, license.autoRenew, license.licensor,
      license.contactEmail, license.contactUrl, license.status,
      JSON.stringify(license.tags), JSON.stringify(license.properties),
      license.createdAt, license.updatedAt, license.createdBy, license.updatedBy,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToLicense(result.rows[0]);
  }

  async updateLicense(id: string, updates: Partial<License>): Promise<License> {
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }

    const query = `
      UPDATE catalog_licenses
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`License ${id} not found`);
    }
    return this.mapRowToLicense(result.rows[0]);
  }

  async deleteLicense(id: string): Promise<void> {
    await this.pool.query('DELETE FROM catalog_licenses WHERE id = $1', [id]);
  }

  // ====== Schema Registry Operations ======

  async getSchemaVersion(schemaId: string, version: number): Promise<SchemaVersion | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_schema_registry WHERE schema_id = $1 AND version = $2',
      [schemaId, version]
    );
    return result.rows.length > 0 ? this.mapRowToSchemaVersion(result.rows[0]) : null;
  }

  async getLatestSchemaVersion(schemaId: string): Promise<SchemaVersion | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_schema_registry WHERE schema_id = $1 ORDER BY version DESC LIMIT 1',
      [schemaId]
    );
    return result.rows.length > 0 ? this.mapRowToSchemaVersion(result.rows[0]) : null;
  }

  async registerSchema(schemaVersion: SchemaVersion): Promise<SchemaVersion> {
    const query = `
      INSERT INTO catalog_schema_registry (
        id, schema_id, version, schema, schema_format, backward_compatible,
        forward_compatible, breaking_changes, status, deprecated_at,
        description, changelog, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      schemaVersion.id, schemaVersion.schemaId, schemaVersion.version,
      JSON.stringify(schemaVersion.schema), schemaVersion.schemaFormat,
      schemaVersion.backwardCompatible, schemaVersion.forwardCompatible,
      JSON.stringify(schemaVersion.breakingChanges), schemaVersion.status,
      schemaVersion.deprecatedAt, schemaVersion.description,
      schemaVersion.changelog, schemaVersion.createdAt, schemaVersion.createdBy,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToSchemaVersion(result.rows[0]);
  }

  async listSchemaVersions(schemaId: string): Promise<SchemaVersion[]> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_schema_registry WHERE schema_id = $1 ORDER BY version DESC',
      [schemaId]
    );
    return result.rows.map(row => this.mapRowToSchemaVersion(row));
  }

  // ====== Connector Registry Operations ======

  async getConnector(id: string): Promise<ConnectorRegistration | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_connector_registry WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRowToConnector(result.rows[0]) : null;
  }

  async listConnectors(): Promise<ConnectorRegistration[]> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_connector_registry ORDER BY name'
    );
    return result.rows.map(row => this.mapRowToConnector(row));
  }

  async registerConnector(connector: ConnectorRegistration): Promise<ConnectorRegistration> {
    const query = `
      INSERT INTO catalog_connector_registry (
        id, name, display_name, description, version, source_type,
        implementation_class, package_name, config_schema, required_permissions,
        supports_bulk_extract, supports_incremental_sync, supports_realtime,
        supports_schema_discovery, status, certified, vendor, documentation,
        tags, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const values = [
      connector.id, connector.name, connector.displayName, connector.description,
      connector.version, connector.sourceType, connector.implementationClass,
      connector.packageName, JSON.stringify(connector.configSchema),
      JSON.stringify(connector.requiredPermissions), connector.supportsBulkExtract,
      connector.supportsIncrementalSync, connector.supportsRealtime,
      connector.supportsSchemaDiscovery, connector.status, connector.certified,
      connector.vendor, connector.documentation, JSON.stringify(connector.tags),
      connector.createdAt, connector.updatedAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToConnector(result.rows[0]);
  }

  // ====== Lineage Summary Operations ======

  async getLineageSummary(entityId: string): Promise<LineageSummary | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_lineage_summary WHERE entity_id = $1',
      [entityId]
    );
    return result.rows.length > 0 ? this.mapRowToLineageSummary(result.rows[0]) : null;
  }

  async updateLineageSummary(summary: LineageSummary): Promise<LineageSummary> {
    const query = `
      INSERT INTO catalog_lineage_summary (
        entity_id, entity_type, upstream_sources, upstream_datasets,
        upstream_fields, downstream_datasets, downstream_canonical_entities,
        downstream_cases, mapping_ids, etl_job_ids, computed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (entity_id) DO UPDATE SET
        entity_type = EXCLUDED.entity_type,
        upstream_sources = EXCLUDED.upstream_sources,
        upstream_datasets = EXCLUDED.upstream_datasets,
        upstream_fields = EXCLUDED.upstream_fields,
        downstream_datasets = EXCLUDED.downstream_datasets,
        downstream_canonical_entities = EXCLUDED.downstream_canonical_entities,
        downstream_cases = EXCLUDED.downstream_cases,
        mapping_ids = EXCLUDED.mapping_ids,
        etl_job_ids = EXCLUDED.etl_job_ids,
        computed_at = EXCLUDED.computed_at
      RETURNING *
    `;

    const values = [
      summary.entityId, summary.entityType,
      JSON.stringify(summary.upstreamSources),
      JSON.stringify(summary.upstreamDatasets),
      JSON.stringify(summary.upstreamFields),
      JSON.stringify(summary.downstreamDatasets),
      JSON.stringify(summary.downstreamCanonicalEntities),
      JSON.stringify(summary.downstreamCases),
      JSON.stringify(summary.mappingIds),
      JSON.stringify(summary.etlJobIds),
      summary.computedAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToLineageSummary(result.rows[0]);
  }

  // ====== Mapping Functions ======

  private mapRowToDataSource(row: any): DataSource {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      type: row.type,
      connectorId: row.connector_id,
      connectorVersion: row.connector_version,
      connectionConfig: row.connection_config || {},
      connectionStatus: row.connection_status,
      lastConnectedAt: row.last_connected_at,
      lastSyncedAt: row.last_synced_at,
      owner: row.owner,
      team: row.team,
      tags: row.tags || [],
      properties: row.properties || {},
      schemaId: row.schema_id,
      schemaVersion: row.schema_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  private mapRowToDataset(row: any): Dataset {
    return {
      id: row.id,
      sourceId: row.source_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      fullyQualifiedName: row.fully_qualified_name,
      datasetType: row.dataset_type,
      schemaId: row.schema_id,
      schemaVersion: row.schema_version,
      fields: [], // Populated separately
      canonicalMappingId: row.canonical_mapping_id,
      canonicalMappingVersion: row.canonical_mapping_version,
      licenseId: row.license_id,
      policyTags: row.policy_tags || [],
      retentionDays: row.retention_days,
      legalBasis: row.legal_basis,
      rowCount: row.row_count,
      sizeBytes: row.size_bytes,
      lastProfiledAt: row.last_profiled_at,
      qualityScore: row.quality_score,
      owner: row.owner,
      stewards: row.stewards || [],
      tags: row.tags || [],
      properties: row.properties || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
    };
  }

  private mapRowToField(row: any): Field {
    return {
      id: row.id,
      datasetId: row.dataset_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      dataType: row.data_type,
      semanticType: row.semantic_type,
      nullable: row.nullable,
      isPrimaryKey: row.is_primary_key,
      isForeignKey: row.is_foreign_key,
      foreignKeyRef: row.foreign_key_ref,
      canonicalFieldName: row.canonical_field_name,
      transformationLogic: row.transformation_logic,
      policyTags: row.policy_tags || [],
      sensitivityLevel: row.sensitivity_level,
      statistics: row.statistics,
      tags: row.tags || [],
      properties: row.properties || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToMapping(row: any): Mapping {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sourceId: row.source_id,
      datasetId: row.dataset_id,
      sourceSchemaId: row.source_schema_id,
      sourceSchemaVersion: row.source_schema_version,
      canonicalSchemaId: row.canonical_schema_id,
      canonicalSchemaVersion: row.canonical_schema_version,
      canonicalEntityType: row.canonical_entity_type,
      fieldMappings: [], // Populated separately
      transformationRules: [], // Populated separately
      status: row.status,
      validatedAt: row.validated_at,
      validatedBy: row.validated_by,
      version: row.version,
      previousVersionId: row.previous_version_id,
      tags: row.tags || [],
      properties: row.properties || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  private mapRowToLicense(row: any): License {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      licenseType: row.license_type,
      termsAndConditions: row.terms_and_conditions,
      usageRestrictions: row.usage_restrictions || [],
      allowedPurposes: row.allowed_purposes || [],
      prohibitedPurposes: row.prohibited_purposes || [],
      requiresAttribution: row.requires_attribution,
      attributionText: row.attribution_text,
      complianceFrameworks: row.compliance_frameworks || [],
      legalBasis: row.legal_basis,
      jurisdictions: row.jurisdictions || [],
      expiresAt: row.expires_at,
      autoRenew: row.auto_renew,
      licensor: row.licensor,
      contactEmail: row.contact_email,
      contactUrl: row.contact_url,
      status: row.status,
      tags: row.tags || [],
      properties: row.properties || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  private mapRowToSchemaVersion(row: any): SchemaVersion {
    return {
      id: row.id,
      schemaId: row.schema_id,
      version: row.version,
      schema: row.schema,
      schemaFormat: row.schema_format,
      backwardCompatible: row.backward_compatible,
      forwardCompatible: row.forward_compatible,
      breakingChanges: row.breaking_changes || [],
      status: row.status,
      deprecatedAt: row.deprecated_at,
      description: row.description,
      changelog: row.changelog,
      createdAt: row.created_at,
      createdBy: row.created_by,
    };
  }

  private mapRowToConnector(row: any): ConnectorRegistration {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      version: row.version,
      sourceType: row.source_type,
      implementationClass: row.implementation_class,
      packageName: row.package_name,
      configSchema: row.config_schema,
      requiredPermissions: row.required_permissions || [],
      supportsBulkExtract: row.supports_bulk_extract,
      supportsIncrementalSync: row.supports_incremental_sync,
      supportsRealtime: row.supports_realtime,
      supportsSchemaDiscovery: row.supports_schema_discovery,
      status: row.status,
      certified: row.certified,
      vendor: row.vendor,
      documentation: row.documentation,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToLineageSummary(row: any): LineageSummary {
    return {
      entityId: row.entity_id,
      entityType: row.entity_type,
      upstreamSources: row.upstream_sources || [],
      upstreamDatasets: row.upstream_datasets || [],
      upstreamFields: row.upstream_fields || [],
      downstreamDatasets: row.downstream_datasets || [],
      downstreamCanonicalEntities: row.downstream_canonical_entities || [],
      downstreamCases: row.downstream_cases || [],
      mappingIds: row.mapping_ids || [],
      etlJobIds: row.etl_job_ids || [],
      computedAt: row.computed_at,
    };
  }
}
