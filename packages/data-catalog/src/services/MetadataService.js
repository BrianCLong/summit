"use strict";
/**
 * Metadata Service
 * High-level service for managing data sources, datasets, fields, mappings, and licenses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataService = void 0;
class MetadataService {
    store;
    constructor(store) {
        this.store = store;
    }
    // ====== DataSource Operations ======
    /**
     * Register a new data source
     */
    async registerDataSource(source) {
        const now = new Date();
        const dataSource = {
            ...source,
            id: this.generateId('source', source.name),
            createdAt: now,
            updatedAt: now,
        };
        return this.store.createDataSource(dataSource);
    }
    /**
     * Update data source connection status
     */
    async updateDataSourceStatus(id, status, lastConnectedAt) {
        return this.store.updateDataSource(id, {
            connectionStatus: status,
            lastConnectedAt: lastConnectedAt || new Date(),
        });
    }
    /**
     * Get data source with all datasets
     */
    async getDataSourceWithDatasets(id) {
        const source = await this.store.getDataSource(id);
        if (!source) {
            return null;
        }
        const datasets = await this.store.listDatasets(id);
        return { source, datasets };
    }
    // ====== Dataset Operations ======
    /**
     * Register a new dataset
     */
    async registerDataset(dataset) {
        const now = new Date();
        const newDataset = {
            ...dataset,
            id: this.generateId('dataset', dataset.fullyQualifiedName),
            fields: [],
            createdAt: now,
            updatedAt: now,
            lastAccessedAt: null,
        };
        return this.store.createDataset(newDataset);
    }
    /**
     * Register dataset with fields
     */
    async registerDatasetWithFields(dataset, fields) {
        // Create dataset first
        const createdDataset = await this.registerDataset({
            ...dataset,
            ...dataset,
        });
        // Create fields
        const now = new Date();
        const createdFields = [];
        for (const field of fields) {
            const newField = {
                ...field,
                id: this.generateId('field', `${createdDataset.id}-${field.name}`),
                datasetId: createdDataset.id,
                createdAt: now,
                updatedAt: now,
            };
            const created = await this.store.createField(newField);
            createdFields.push(created);
        }
        createdDataset.fields = createdFields;
        return createdDataset;
    }
    /**
     * Update dataset profiling statistics
     */
    async updateDatasetStatistics(id, stats) {
        return this.store.updateDataset(id, {
            ...stats,
            lastProfiledAt: new Date(),
        });
    }
    /**
     * Search datasets by criteria
     */
    async searchDatasets(criteria) {
        let datasets = await this.store.listDatasets(criteria.sourceId);
        if (criteria.licenseId) {
            datasets = datasets.filter(d => d.licenseId === criteria.licenseId);
        }
        if (criteria.policyTags && criteria.policyTags.length > 0) {
            datasets = datasets.filter(d => criteria.policyTags.some(tag => d.policyTags.includes(tag)));
        }
        if (criteria.tags && criteria.tags.length > 0) {
            datasets = datasets.filter(d => criteria.tags.some(tag => d.tags.includes(tag)));
        }
        return datasets;
    }
    // ====== Mapping Operations ======
    /**
     * Create a new mapping
     */
    async createMapping(mapping) {
        const now = new Date();
        const newMapping = {
            ...mapping,
            id: this.generateId('mapping', mapping.name),
            version: 1,
            createdAt: now,
            updatedAt: now,
        };
        return this.store.createMapping(newMapping);
    }
    /**
     * Validate and activate mapping
     */
    async validateMapping(id, validatedBy) {
        return this.store.updateMapping(id, {
            status: 'ACTIVE',
            validatedAt: new Date(),
            validatedBy,
        });
    }
    /**
     * Get mappings for a source
     */
    async getMappingsForSource(sourceId) {
        return this.store.listMappings(sourceId);
    }
    /**
     * Find datasets affected by a mapping change
     */
    async findDatasetsAffectedByMapping(mappingId) {
        const allDatasets = await this.store.listDatasets();
        return allDatasets.filter(d => d.canonicalMappingId === mappingId);
    }
    // ====== License Operations ======
    /**
     * Create a new license
     */
    async createLicense(license) {
        const now = new Date();
        const newLicense = {
            ...license,
            id: this.generateId('license', license.name),
            createdAt: now,
            updatedAt: now,
        };
        return this.store.createLicense(newLicense);
    }
    /**
     * Get datasets with a specific license
     */
    async getDatasetsWithLicense(licenseId) {
        const allDatasets = await this.store.listDatasets();
        return allDatasets.filter(d => d.licenseId === licenseId);
    }
    /**
     * Get all active licenses
     */
    async getActiveLicenses() {
        const licenses = await this.store.listLicenses();
        return licenses.filter(l => l.status === 'ACTIVE');
    }
    // ====== Lineage Operations ======
    /**
     * Compute and store lineage summary for an entity
     */
    async computeLineageSummary(entityId, entityType) {
        // This is a placeholder - actual lineage computation would be more complex
        // and would involve traversing the graph of sources, datasets, mappings, etc.
        const summary = {
            entityId,
            entityType,
            upstreamSources: [],
            upstreamDatasets: [],
            upstreamFields: [],
            downstreamDatasets: [],
            downstreamCanonicalEntities: [],
            downstreamCases: [],
            mappingIds: [],
            etlJobIds: [],
            computedAt: new Date(),
        };
        if (entityType === 'DATASET') {
            const dataset = await this.store.getDataset(entityId);
            if (dataset) {
                summary.upstreamSources = [dataset.sourceId];
                if (dataset.canonicalMappingId) {
                    summary.mappingIds = [dataset.canonicalMappingId];
                }
            }
        }
        return this.store.updateLineageSummary(summary);
    }
    /**
     * Get impact analysis for a dataset
     */
    async getDatasetImpact(datasetId) {
        const lineage = await this.store.getLineageSummary(datasetId);
        const affectedDatasets = [];
        if (lineage) {
            for (const downstreamId of lineage.downstreamDatasets) {
                const dataset = await this.store.getDataset(downstreamId);
                if (dataset) {
                    affectedDatasets.push(dataset);
                }
            }
        }
        // Find mappings that reference this dataset
        const allMappings = await this.store.listMappings();
        const affectedMappings = allMappings.filter(m => m.datasetId === datasetId);
        return { affectedDatasets, affectedMappings };
    }
    // ====== Utility Methods ======
    /**
     * Generate ID for entities
     */
    generateId(prefix, name) {
        const timestamp = Date.now();
        const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
        return `${prefix}-${sanitized}-${timestamp}`;
    }
}
exports.MetadataService = MetadataService;
