"use strict";
/**
 * Metadata Controller
 * Handles data source, dataset, field, mapping, and license operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataController = void 0;
class MetadataController {
    metadataService;
    searchService;
    constructor(metadataService, searchService) {
        this.metadataService = metadataService;
        this.searchService = searchService;
    }
    // ====== DataSource Operations ======
    async listDataSources(req, res) {
        try {
            const result = await this.searchService.searchDataSources({
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0,
            });
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getDataSource(req, res) {
        try {
            const { id } = req.params;
            const result = await this.metadataService.getDataSourceWithDatasets(id);
            if (!result) {
                res.status(404).json({ error: 'Data source not found' });
                return;
            }
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async registerDataSource(req, res) {
        try {
            const dataSource = await this.metadataService.registerDataSource(req.body);
            res.status(201).json(dataSource);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async updateDataSourceStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, lastConnectedAt } = req.body;
            const dataSource = await this.metadataService.updateDataSourceStatus(id, status, lastConnectedAt ? new Date(lastConnectedAt) : undefined);
            res.json(dataSource);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    // ====== Dataset Operations ======
    async listDatasets(req, res) {
        try {
            const sourceId = req.query.sourceId;
            const licenseId = req.query.licenseId;
            const policyTags = req.query.policyTags
                ? req.query.policyTags.split(',')
                : undefined;
            const tags = req.query.tags
                ? req.query.tags.split(',')
                : undefined;
            const datasets = await this.metadataService.searchDatasets({
                sourceId,
                licenseId,
                policyTags,
                tags,
            });
            res.json({
                datasets,
                total: datasets.length,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getDataset(req, res) {
        try {
            const { id } = req.params;
            const dataset = await this.metadataService.store.getDataset(id);
            if (!dataset) {
                res.status(404).json({ error: 'Dataset not found' });
                return;
            }
            res.json(dataset);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async registerDataset(req, res) {
        try {
            const { dataset, fields } = req.body;
            const createdDataset = fields
                ? await this.metadataService.registerDatasetWithFields(dataset, fields)
                : await this.metadataService.registerDataset(dataset);
            res.status(201).json(createdDataset);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async updateDatasetStatistics(req, res) {
        try {
            const { id } = req.params;
            const stats = req.body;
            const dataset = await this.metadataService.updateDatasetStatistics(id, stats);
            res.json(dataset);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async searchDatasets(req, res) {
        try {
            const query = {
                query: req.query.q,
                filters: req.query.filters ? JSON.parse(req.query.filters) : [],
                sort: req.query.sort ? JSON.parse(req.query.sort) : [],
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0,
            };
            const result = await this.searchService.searchDatasets(query);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // ====== Field Operations ======
    async searchFields(req, res) {
        try {
            const query = {
                query: req.query.q,
                filters: req.query.filters ? JSON.parse(req.query.filters) : [],
                sort: req.query.sort ? JSON.parse(req.query.sort) : [],
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0,
            };
            const result = await this.searchService.searchFields(query);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async searchFieldsByCanonicalName(req, res) {
        try {
            const { canonicalName } = req.params;
            const fields = await this.searchService.searchFieldsByCanonicalName(canonicalName);
            res.json({
                canonicalName,
                fields,
                total: fields.length,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // ====== Mapping Operations ======
    async listMappings(req, res) {
        try {
            const sourceId = req.query.sourceId;
            const mappings = await this.metadataService.store.listMappings(sourceId);
            res.json({
                mappings,
                total: mappings.length,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getMapping(req, res) {
        try {
            const { id } = req.params;
            const mapping = await this.metadataService.store.getMapping(id);
            if (!mapping) {
                res.status(404).json({ error: 'Mapping not found' });
                return;
            }
            res.json(mapping);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async createMapping(req, res) {
        try {
            const mapping = await this.metadataService.createMapping(req.body);
            res.status(201).json(mapping);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async validateMapping(req, res) {
        try {
            const { id } = req.params;
            const { validatedBy } = req.body;
            const mapping = await this.metadataService.validateMapping(id, validatedBy);
            res.json(mapping);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async getMappingImpact(req, res) {
        try {
            const { id } = req.params;
            const datasets = await this.metadataService.findDatasetsAffectedByMapping(id);
            res.json({
                mappingId: id,
                affectedDatasets: datasets,
                totalAffected: datasets.length,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // ====== License Operations ======
    async listLicenses(req, res) {
        try {
            const licenses = await this.metadataService.getActiveLicenses();
            res.json({
                licenses,
                total: licenses.length,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getLicense(req, res) {
        try {
            const { id } = req.params;
            const license = await this.metadataService.store.getLicense(id);
            if (!license) {
                res.status(404).json({ error: 'License not found' });
                return;
            }
            res.json(license);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async createLicense(req, res) {
        try {
            const license = await this.metadataService.createLicense(req.body);
            res.status(201).json(license);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async getLicenseUsage(req, res) {
        try {
            const { id } = req.params;
            const datasets = await this.metadataService.getDatasetsWithLicense(id);
            res.json({
                licenseId: id,
                datasets,
                totalDatasets: datasets.length,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // ====== Universal Search ======
    async universalSearch(req, res) {
        try {
            const query = req.query.q;
            const limit = parseInt(req.query.limit) || 10;
            if (!query) {
                res.status(400).json({ error: 'Query parameter "q" is required' });
                return;
            }
            const results = await this.searchService.universalSearch(query, limit);
            res.json(results);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // ====== Lineage & Impact Analysis ======
    async getDatasetImpact(req, res) {
        try {
            const { id } = req.params;
            const impact = await this.metadataService.getDatasetImpact(id);
            res.json({
                datasetId: id,
                ...impact,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.MetadataController = MetadataController;
