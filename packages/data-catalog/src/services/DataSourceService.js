"use strict";
/**
 * Data Source Service
 * Manages data sources, datasets, fields, and mappings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceService = void 0;
const dataSourceTypes_js_1 = require("../types/dataSourceTypes.js");
class DataSourceService {
    dataSources;
    datasets;
    fields;
    mappings;
    licenses;
    lineageSummaries;
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
    async registerDataSource(data) {
        const dataSource = {
            ...data,
            id: this.generateId('ds'),
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSyncAt: null,
            datasetIds: [],
        };
        this.dataSources.set(dataSource.id, dataSource);
        // Create lineage summary
        await this.createLineageSummary(dataSource.id, dataSourceTypes_js_1.LineageEntityType.DATA_SOURCE);
        return dataSource;
    }
    /**
     * Get data source by ID
     */
    async getDataSource(id) {
        return this.dataSources.get(id) || null;
    }
    /**
     * List all data sources
     */
    async listDataSources(filters) {
        let results = Array.from(this.dataSources.values());
        if (filters?.type) {
            results = results.filter((ds) => ds.type === filters.type);
        }
        if (filters?.status) {
            results = results.filter((ds) => ds.connectionStatus === filters.status);
        }
        if (filters?.tags && filters.tags.length > 0) {
            results = results.filter((ds) => filters.tags.some((tag) => ds.tags.includes(tag)));
        }
        if (filters?.domain) {
            results = results.filter((ds) => ds.domain === filters.domain);
        }
        return results;
    }
    /**
     * Update data source connection status
     */
    async updateConnectionStatus(id, status) {
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
    async testConnection(id) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
            throw new Error(`Data source not found: ${id}`);
        }
        // This would perform actual connection test
        // For now, return success
        await this.updateConnectionStatus(id, dataSourceTypes_js_1.ConnectionStatus.ACTIVE);
        return {
            success: true,
            message: 'Connection successful',
        };
    }
    // ========== Dataset Operations ==========
    /**
     * Register a new dataset
     */
    async registerDataset(data) {
        const dataSource = this.dataSources.get(data.sourceId);
        if (!dataSource) {
            throw new Error(`Data source not found: ${data.sourceId}`);
        }
        const dataset = {
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
        await this.createLineageSummary(dataset.id, dataSourceTypes_js_1.LineageEntityType.DATASET);
        // Update lineage: source -> dataset
        await this.addLineageReference(dataSource.id, dataset.id, dataSourceTypes_js_1.LineageEntityType.DATASET, dataset.name, 'downstream');
        return dataset;
    }
    /**
     * Get dataset by ID
     */
    async getDataset(id) {
        return this.datasets.get(id) || null;
    }
    /**
     * List datasets
     */
    async listDatasets(filters) {
        let results = Array.from(this.datasets.values());
        if (filters?.sourceId) {
            results = results.filter((ds) => ds.sourceId === filters.sourceId);
        }
        if (filters?.status) {
            results = results.filter((ds) => ds.status === filters.status);
        }
        if (filters?.tags && filters.tags.length > 0) {
            results = results.filter((ds) => filters.tags.some((tag) => ds.tags.includes(tag)));
        }
        if (filters?.domain) {
            results = results.filter((ds) => ds.domain === filters.domain);
        }
        return results;
    }
    /**
     * Search datasets by name or description
     */
    async searchDatasets(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.datasets.values()).filter((ds) => ds.name.toLowerCase().includes(lowerQuery) ||
            ds.displayName.toLowerCase().includes(lowerQuery) ||
            (ds.description && ds.description.toLowerCase().includes(lowerQuery)));
    }
    /**
     * Update dataset status
     */
    async updateDatasetStatus(id, status) {
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
    async registerField(data) {
        const dataset = this.datasets.get(data.datasetId);
        if (!dataset) {
            throw new Error(`Dataset not found: ${data.datasetId}`);
        }
        const field = {
            ...data,
            id: this.generateId('field'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.fields.set(field.id, field);
        // Add to dataset
        dataset.fields.push(field);
        // Create lineage summary
        await this.createLineageSummary(field.id, dataSourceTypes_js_1.LineageEntityType.FIELD);
        return field;
    }
    /**
     * Get field by ID
     */
    async getField(id) {
        return this.fields.get(id) || null;
    }
    /**
     * List fields for a dataset
     */
    async listFields(datasetId) {
        return Array.from(this.fields.values()).filter((f) => f.datasetId === datasetId);
    }
    /**
     * Search fields by name or data type
     */
    async searchFields(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.fields.values()).filter((f) => f.name.toLowerCase().includes(lowerQuery) ||
            f.displayName.toLowerCase().includes(lowerQuery) ||
            f.dataType.toLowerCase().includes(lowerQuery) ||
            (f.description && f.description.toLowerCase().includes(lowerQuery)));
    }
    // ========== Mapping Operations ==========
    /**
     * Create a mapping
     */
    async createMapping(data) {
        const sourceField = this.fields.get(data.sourceFieldId);
        if (!sourceField) {
            throw new Error(`Source field not found: ${data.sourceFieldId}`);
        }
        const mapping = {
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
        await this.createLineageSummary(mapping.id, dataSourceTypes_js_1.LineageEntityType.MAPPING);
        // Update lineage: field -> mapping -> canonical
        await this.addLineageReference(sourceField.id, mapping.id, dataSourceTypes_js_1.LineageEntityType.MAPPING, mapping.name, 'downstream');
        return mapping;
    }
    /**
     * Get mapping by ID
     */
    async getMapping(id) {
        return this.mappings.get(id) || null;
    }
    /**
     * List mappings
     */
    async listMappings(filters) {
        let results = Array.from(this.mappings.values());
        if (filters?.sourceDatasetId) {
            results = results.filter((m) => m.sourceDatasetId === filters.sourceDatasetId);
        }
        if (filters?.canonicalSchemaId) {
            results = results.filter((m) => m.canonicalSchemaId === filters.canonicalSchemaId);
        }
        if (filters?.status) {
            results = results.filter((m) => m.status === filters.status);
        }
        return results;
    }
    /**
     * Deprecate a mapping
     */
    async deprecateMapping(id) {
        const mapping = this.mappings.get(id);
        if (!mapping) {
            throw new Error(`Mapping not found: ${id}`);
        }
        mapping.status = dataSourceTypes_js_1.MappingStatus.DEPRECATED;
        mapping.deprecatedAt = new Date();
        mapping.updatedAt = new Date();
        return mapping;
    }
    // ========== License Operations ==========
    /**
     * Register a license
     */
    async registerLicense(data) {
        const license = {
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
    async getLicense(id) {
        return this.licenses.get(id) || null;
    }
    /**
     * List all licenses
     */
    async listLicenses() {
        return Array.from(this.licenses.values());
    }
    /**
     * Attach license to dataset
     */
    async attachLicenseToDataset(datasetId, licenseId) {
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
    async getLineage(entityId) {
        return this.lineageSummaries.get(entityId) || null;
    }
    /**
     * Get impact analysis for an entity
     */
    async getImpactAnalysis(entityId) {
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
            .filter((ds) => ds !== undefined);
        const affectedCases = lineage.downstreamCases.map((ref) => ref.entityId);
        // Find mappings that reference this entity
        const affectedMappings = Array.from(this.mappings.values()).filter((m) => m.sourceDatasetId === entityId ||
            m.sourceFieldId === entityId ||
            m.canonicalSchemaId === entityId);
        return {
            affectedDatasets,
            affectedMappings,
            affectedCases,
        };
    }
    /**
     * Get datasets by license
     */
    async getDatasetsByLicense(licenseId) {
        return Array.from(this.datasets.values()).filter((ds) => ds.licenseIds.includes(licenseId));
    }
    /**
     * Get datasets by policy tag
     */
    async getDatasetsByPolicyTag(policyTag) {
        return Array.from(this.datasets.values()).filter((ds) => ds.policyTags.includes(policyTag));
    }
    // ========== Helper Methods ==========
    /**
     * Create lineage summary for an entity
     */
    async createLineageSummary(entityId, entityType) {
        const lineage = {
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
    async addLineageReference(fromEntityId, toEntityId, toEntityType, toEntityName, direction) {
        const lineage = this.lineageSummaries.get(fromEntityId);
        if (!lineage) {
            return;
        }
        const reference = {
            entityId: toEntityId,
            entityType: toEntityType,
            name: toEntityName,
            path: [],
        };
        if (direction === 'downstream') {
            if (toEntityType === dataSourceTypes_js_1.LineageEntityType.DATASET) {
                lineage.downstreamDatasets.push(reference);
            }
            else if (toEntityType === dataSourceTypes_js_1.LineageEntityType.MAPPING) {
                // Add to downstream
                lineage.downstreamDatasets.push(reference);
            }
        }
        else {
            if (toEntityType === dataSourceTypes_js_1.LineageEntityType.DATA_SOURCE) {
                lineage.upstreamSources.push(reference);
            }
            else if (toEntityType === dataSourceTypes_js_1.LineageEntityType.DATASET) {
                lineage.upstreamDatasets.push(reference);
            }
            else if (toEntityType === dataSourceTypes_js_1.LineageEntityType.FIELD) {
                lineage.upstreamFields.push(reference);
            }
        }
        lineage.updatedAt = new Date();
    }
    /**
     * Generate unique ID
     */
    generateId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.DataSourceService = DataSourceService;
