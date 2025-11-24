/**
 * Data Source Service
 * Manages data sources, datasets, fields, and mappings
 */

import {
  DataSource,
  Dataset,
  Field,
  Mapping,
  License,
  LineageSummary,
  DataSourceType,
  ConnectionStatus,
  DatasetStatus,
  MappingStatus,
  LineageEntityType,
  LineageReference,
} from '../types/dataSourceTypes.js';

export class DataSourceService {
  private dataSources: Map<string, DataSource>;
  private datasets: Map<string, Dataset>;
  private fields: Map<string, Field>;
  private mappings: Map<string, Mapping>;
  private licenses: Map<string, License>;
  private lineageSummaries: Map<string, LineageSummary>;

  constructor() {
    this.dataSources = new Map();
    this.datasets = new Map();
    this.fields = new Map();
    this.mappings = new Map();
    this.licenses = new Map();
    this.lineageSummaries = new Map();
  }

  // ========== Data Source Operations ==========

  /**
   * Register a new data source
   */
  async registerDataSource(
    data: Omit<
      DataSource,
      'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'datasetIds'
    >,
  ): Promise<DataSource> {
    const dataSource: DataSource = {
      ...data,
      id: this.generateId('ds'),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncAt: null,
      datasetIds: [],
    };

    this.dataSources.set(dataSource.id, dataSource);

    // Create lineage summary
    await this.createLineageSummary(dataSource.id, LineageEntityType.DATA_SOURCE);

    return dataSource;
  }

  /**
   * Get data source by ID
   */
  async getDataSource(id: string): Promise<DataSource | null> {
    return this.dataSources.get(id) || null;
  }

  /**
   * List all data sources
   */
  async listDataSources(filters?: {
    type?: DataSourceType;
    status?: ConnectionStatus;
    tags?: string[];
    domain?: string;
  }): Promise<DataSource[]> {
    let results = Array.from(this.dataSources.values());

    if (filters?.type) {
      results = results.filter((ds) => ds.type === filters.type);
    }

    if (filters?.status) {
      results = results.filter((ds) => ds.connectionStatus === filters.status);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter((ds) =>
        filters.tags!.some((tag) => ds.tags.includes(tag)),
      );
    }

    if (filters?.domain) {
      results = results.filter((ds) => ds.domain === filters.domain);
    }

    return results;
  }

  /**
   * Update data source connection status
   */
  async updateConnectionStatus(
    id: string,
    status: ConnectionStatus,
  ): Promise<DataSource> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    dataSource.connectionStatus = status;
    dataSource.lastConnectionTest = new Date();
    dataSource.updatedAt = new Date();

    return dataSource;
  }

  /**
   * Test data source connection
   */
  async testConnection(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    // This would perform actual connection test
    // For now, return success
    await this.updateConnectionStatus(id, ConnectionStatus.ACTIVE);

    return {
      success: true,
      message: 'Connection successful',
    };
  }

  // ========== Dataset Operations ==========

  /**
   * Register a new dataset
   */
  async registerDataset(
    data: Omit<
      Dataset,
      'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'fields'
    >,
  ): Promise<Dataset> {
    const dataSource = this.dataSources.get(data.sourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${data.sourceId}`);
    }

    const dataset: Dataset = {
      ...data,
      id: this.generateId('dataset'),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: null,
      fields: [],
    };

    this.datasets.set(dataset.id, dataset);

    // Add to data source
    dataSource.datasetIds.push(dataset.id);

    // Create lineage summary
    await this.createLineageSummary(dataset.id, LineageEntityType.DATASET);

    // Update lineage: source -> dataset
    await this.addLineageReference(
      dataSource.id,
      dataset.id,
      LineageEntityType.DATASET,
      dataset.name,
      'downstream',
    );

    return dataset;
  }

  /**
   * Get dataset by ID
   */
  async getDataset(id: string): Promise<Dataset | null> {
    return this.datasets.get(id) || null;
  }

  /**
   * List datasets
   */
  async listDatasets(filters?: {
    sourceId?: string;
    status?: DatasetStatus;
    tags?: string[];
    domain?: string;
  }): Promise<Dataset[]> {
    let results = Array.from(this.datasets.values());

    if (filters?.sourceId) {
      results = results.filter((ds) => ds.sourceId === filters.sourceId);
    }

    if (filters?.status) {
      results = results.filter((ds) => ds.status === filters.status);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter((ds) =>
        filters.tags!.some((tag) => ds.tags.includes(tag)),
      );
    }

    if (filters?.domain) {
      results = results.filter((ds) => ds.domain === filters.domain);
    }

    return results;
  }

  /**
   * Search datasets by name or description
   */
  async searchDatasets(query: string): Promise<Dataset[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.datasets.values()).filter(
      (ds) =>
        ds.name.toLowerCase().includes(lowerQuery) ||
        ds.displayName.toLowerCase().includes(lowerQuery) ||
        (ds.description && ds.description.toLowerCase().includes(lowerQuery)),
    );
  }

  /**
   * Update dataset status
   */
  async updateDatasetStatus(
    id: string,
    status: DatasetStatus,
  ): Promise<Dataset> {
    const dataset = this.datasets.get(id);
    if (!dataset) {
      throw new Error(`Dataset not found: ${id}`);
    }

    dataset.status = status;
    dataset.updatedAt = new Date();

    return dataset;
  }

  // ========== Field Operations ==========

  /**
   * Register a field
   */
  async registerField(
    data: Omit<Field, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Field> {
    const dataset = this.datasets.get(data.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${data.datasetId}`);
    }

    const field: Field = {
      ...data,
      id: this.generateId('field'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.fields.set(field.id, field);

    // Add to dataset
    dataset.fields.push(field);

    // Create lineage summary
    await this.createLineageSummary(field.id, LineageEntityType.FIELD);

    return field;
  }

  /**
   * Get field by ID
   */
  async getField(id: string): Promise<Field | null> {
    return this.fields.get(id) || null;
  }

  /**
   * List fields for a dataset
   */
  async listFields(datasetId: string): Promise<Field[]> {
    return Array.from(this.fields.values()).filter(
      (f) => f.datasetId === datasetId,
    );
  }

  /**
   * Search fields by name or data type
   */
  async searchFields(query: string): Promise<Field[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.fields.values()).filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.displayName.toLowerCase().includes(lowerQuery) ||
        f.dataType.toLowerCase().includes(lowerQuery) ||
        (f.description && f.description.toLowerCase().includes(lowerQuery)),
    );
  }

  // ========== Mapping Operations ==========

  /**
   * Create a mapping
   */
  async createMapping(
    data: Omit<Mapping, 'id' | 'createdAt' | 'updatedAt' | 'deprecatedAt'>,
  ): Promise<Mapping> {
    const sourceField = this.fields.get(data.sourceFieldId);
    if (!sourceField) {
      throw new Error(`Source field not found: ${data.sourceFieldId}`);
    }

    const mapping: Mapping = {
      ...data,
      id: this.generateId('mapping'),
      createdAt: new Date(),
      updatedAt: new Date(),
      deprecatedAt: null,
    };

    this.mappings.set(mapping.id, mapping);

    // Update field
    sourceField.mappingIds.push(mapping.id);

    // Update dataset
    const dataset = this.datasets.get(data.sourceDatasetId);
    if (dataset) {
      dataset.mappingIds.push(mapping.id);
    }

    // Create lineage summary
    await this.createLineageSummary(mapping.id, LineageEntityType.MAPPING);

    // Update lineage: field -> mapping -> canonical
    await this.addLineageReference(
      sourceField.id,
      mapping.id,
      LineageEntityType.MAPPING,
      mapping.name,
      'downstream',
    );

    return mapping;
  }

  /**
   * Get mapping by ID
   */
  async getMapping(id: string): Promise<Mapping | null> {
    return this.mappings.get(id) || null;
  }

  /**
   * List mappings
   */
  async listMappings(filters?: {
    sourceDatasetId?: string;
    canonicalSchemaId?: string;
    status?: MappingStatus;
  }): Promise<Mapping[]> {
    let results = Array.from(this.mappings.values());

    if (filters?.sourceDatasetId) {
      results = results.filter(
        (m) => m.sourceDatasetId === filters.sourceDatasetId,
      );
    }

    if (filters?.canonicalSchemaId) {
      results = results.filter(
        (m) => m.canonicalSchemaId === filters.canonicalSchemaId,
      );
    }

    if (filters?.status) {
      results = results.filter((m) => m.status === filters.status);
    }

    return results;
  }

  /**
   * Deprecate a mapping
   */
  async deprecateMapping(id: string): Promise<Mapping> {
    const mapping = this.mappings.get(id);
    if (!mapping) {
      throw new Error(`Mapping not found: ${id}`);
    }

    mapping.status = MappingStatus.DEPRECATED;
    mapping.deprecatedAt = new Date();
    mapping.updatedAt = new Date();

    return mapping;
  }

  // ========== License Operations ==========

  /**
   * Register a license
   */
  async registerLicense(
    data: Omit<License, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<License> {
    const license: License = {
      ...data,
      id: this.generateId('license'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.licenses.set(license.id, license);

    return license;
  }

  /**
   * Get license by ID
   */
  async getLicense(id: string): Promise<License | null> {
    return this.licenses.get(id) || null;
  }

  /**
   * List all licenses
   */
  async listLicenses(): Promise<License[]> {
    return Array.from(this.licenses.values());
  }

  /**
   * Attach license to dataset
   */
  async attachLicenseToDataset(
    datasetId: string,
    licenseId: string,
  ): Promise<void> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const license = this.licenses.get(licenseId);
    if (!license) {
      throw new Error(`License not found: ${licenseId}`);
    }

    if (!dataset.licenseIds.includes(licenseId)) {
      dataset.licenseIds.push(licenseId);
    }
  }

  // ========== Lineage Operations ==========

  /**
   * Get lineage summary for an entity
   */
  async getLineage(entityId: string): Promise<LineageSummary | null> {
    return this.lineageSummaries.get(entityId) || null;
  }

  /**
   * Get impact analysis for an entity
   */
  async getImpactAnalysis(entityId: string): Promise<{
    affectedDatasets: Dataset[];
    affectedMappings: Mapping[];
    affectedCases: string[];
  }> {
    const lineage = await this.getLineage(entityId);
    if (!lineage) {
      return {
        affectedDatasets: [],
        affectedMappings: [],
        affectedCases: [],
      };
    }

    // Get all downstream entities
    const datasetIds = lineage.downstreamDatasets.map((ref) => ref.entityId);
    const affectedDatasets = datasetIds
      .map((id) => this.datasets.get(id))
      .filter((ds): ds is Dataset => ds !== undefined);

    const affectedCases = lineage.downstreamCases.map((ref) => ref.entityId);

    // Find mappings that reference this entity
    const affectedMappings = Array.from(this.mappings.values()).filter(
      (m) =>
        m.sourceDatasetId === entityId ||
        m.sourceFieldId === entityId ||
        m.canonicalSchemaId === entityId,
    );

    return {
      affectedDatasets,
      affectedMappings,
      affectedCases,
    };
  }

  /**
   * Get datasets by license
   */
  async getDatasetsByLicense(licenseId: string): Promise<Dataset[]> {
    return Array.from(this.datasets.values()).filter((ds) =>
      ds.licenseIds.includes(licenseId),
    );
  }

  /**
   * Get datasets by policy tag
   */
  async getDatasetsByPolicyTag(policyTag: string): Promise<Dataset[]> {
    return Array.from(this.datasets.values()).filter((ds) =>
      ds.policyTags.includes(policyTag),
    );
  }

  // ========== Helper Methods ==========

  /**
   * Create lineage summary for an entity
   */
  private async createLineageSummary(
    entityId: string,
    entityType: LineageEntityType,
  ): Promise<LineageSummary> {
    const lineage: LineageSummary = {
      id: this.generateId('lineage'),
      entityId,
      entityType,
      upstreamSources: [],
      upstreamDatasets: [],
      upstreamFields: [],
      downstreamDatasets: [],
      downstreamCases: [],
      downstreamReports: [],
      etlJobIds: [],
      usageCount: 0,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.lineageSummaries.set(entityId, lineage);

    return lineage;
  }

  /**
   * Add lineage reference
   */
  private async addLineageReference(
    fromEntityId: string,
    toEntityId: string,
    toEntityType: LineageEntityType,
    toEntityName: string,
    direction: 'upstream' | 'downstream',
  ): Promise<void> {
    const lineage = this.lineageSummaries.get(fromEntityId);
    if (!lineage) {
      return;
    }

    const reference: LineageReference = {
      entityId: toEntityId,
      entityType: toEntityType,
      name: toEntityName,
      path: [],
    };

    if (direction === 'downstream') {
      if (toEntityType === LineageEntityType.DATASET) {
        lineage.downstreamDatasets.push(reference);
      } else if (toEntityType === LineageEntityType.MAPPING) {
        // Add to downstream
        lineage.downstreamDatasets.push(reference);
      }
    } else {
      if (toEntityType === LineageEntityType.DATA_SOURCE) {
        lineage.upstreamSources.push(reference);
      } else if (toEntityType === LineageEntityType.DATASET) {
        lineage.upstreamDatasets.push(reference);
      } else if (toEntityType === LineageEntityType.FIELD) {
        lineage.upstreamFields.push(reference);
      }
    }

    lineage.updatedAt = new Date();
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
