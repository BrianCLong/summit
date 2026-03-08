"use strict";
/**
 * Metadata Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MetadataService_js_1 = require("../MetadataService.js");
const metadata_js_1 = require("../../types/metadata.js");
// Mock store implementation
class MockMetadataStore {
    dataSources = new Map();
    datasets = new Map();
    async getDataSource(id) {
        return this.dataSources.get(id) || null;
    }
    async createDataSource(source) {
        this.dataSources.set(source.id, source);
        return source;
    }
    async updateDataSource(id, updates) {
        const existing = this.dataSources.get(id);
        if (!existing) {
            throw new Error(`DataSource ${id} not found`);
        }
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.dataSources.set(id, updated);
        return updated;
    }
    async getDataset(id) {
        return this.datasets.get(id) || null;
    }
    async createDataset(dataset) {
        this.datasets.set(dataset.id, dataset);
        return dataset;
    }
    async listDatasets(sourceId) {
        const datasets = Array.from(this.datasets.values());
        if (sourceId) {
            return datasets.filter(d => d.sourceId === sourceId);
        }
        return datasets;
    }
    async createField = globals_1.jest.fn();
    async createMapping = globals_1.jest.fn();
    async createLicense = globals_1.jest.fn();
    async updateLineageSummary = globals_1.jest.fn();
}
(0, globals_1.describe)('MetadataService', () => {
    let service;
    let store;
    (0, globals_1.beforeEach)(() => {
        store = new MockMetadataStore();
        service = new MetadataService_js_1.MetadataService(store);
    });
    (0, globals_1.describe)('registerDataSource', () => {
        (0, globals_1.it)('should register a new data source', async () => {
            const sourceData = {
                name: 'test-database',
                displayName: 'Test Database',
                description: 'A test database source',
                type: metadata_js_1.DataSourceType.DATABASE,
                connectorId: 'postgres-connector',
                connectorVersion: '1.0.0',
                connectionConfig: { host: 'localhost', port: 5432 },
                connectionStatus: metadata_js_1.ConnectionStatus.CONFIGURED,
                lastConnectedAt: null,
                lastSyncedAt: null,
                owner: 'user1',
                team: 'data-team',
                tags: ['production', 'finance'],
                properties: {},
                schemaId: null,
                schemaVersion: null,
                createdBy: 'user1',
                updatedBy: 'user1',
            };
            const result = await service.registerDataSource(sourceData);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toContain('source-test-database');
            (0, globals_1.expect)(result.name).toBe('test-database');
            (0, globals_1.expect)(result.type).toBe(metadata_js_1.DataSourceType.DATABASE);
            (0, globals_1.expect)(result.createdAt).toBeInstanceOf(Date);
        });
        (0, globals_1.it)('should generate unique IDs for data sources', async () => {
            const sourceData = {
                name: 'test-db',
                displayName: 'Test DB',
                description: null,
                type: metadata_js_1.DataSourceType.DATABASE,
                connectorId: 'postgres',
                connectorVersion: '1.0.0',
                connectionConfig: {},
                connectionStatus: metadata_js_1.ConnectionStatus.CONFIGURED,
                lastConnectedAt: null,
                lastSyncedAt: null,
                owner: 'user1',
                team: null,
                tags: [],
                properties: {},
                schemaId: null,
                schemaVersion: null,
                createdBy: 'user1',
                updatedBy: 'user1',
            };
            const result1 = await service.registerDataSource(sourceData);
            const result2 = await service.registerDataSource(sourceData);
            (0, globals_1.expect)(result1.id).not.toBe(result2.id);
        });
    });
    (0, globals_1.describe)('updateDataSourceStatus', () => {
        (0, globals_1.it)('should update connection status', async () => {
            const source = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test Source',
                description: null,
                type: metadata_js_1.DataSourceType.API,
                connectorId: 'api-connector',
                connectorVersion: '1.0.0',
                connectionConfig: {},
                connectionStatus: metadata_js_1.ConnectionStatus.CONFIGURED,
                lastConnectedAt: null,
                lastSyncedAt: null,
                owner: 'user1',
                team: null,
                tags: [],
                properties: {},
                schemaId: null,
                schemaVersion: null,
                createdBy: 'user1',
                updatedBy: 'user1',
            });
            const connectedAt = new Date();
            const updated = await service.updateDataSourceStatus(source.id, metadata_js_1.ConnectionStatus.ACTIVE, connectedAt);
            (0, globals_1.expect)(updated.connectionStatus).toBe(metadata_js_1.ConnectionStatus.ACTIVE);
            (0, globals_1.expect)(updated.lastConnectedAt).toEqual(connectedAt);
        });
    });
    (0, globals_1.describe)('registerDataset', () => {
        (0, globals_1.it)('should register a new dataset', async () => {
            const source = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test Source',
                description: null,
                type: metadata_js_1.DataSourceType.DATABASE,
                connectorId: 'postgres',
                connectorVersion: '1.0.0',
                connectionConfig: {},
                connectionStatus: metadata_js_1.ConnectionStatus.ACTIVE,
                lastConnectedAt: null,
                lastSyncedAt: null,
                owner: 'user1',
                team: null,
                tags: [],
                properties: {},
                schemaId: null,
                schemaVersion: null,
                createdBy: 'user1',
                updatedBy: 'user1',
            });
            const datasetData = {
                sourceId: source.id,
                name: 'users',
                displayName: 'Users Table',
                description: 'User accounts',
                fullyQualifiedName: 'test-source.public.users',
                datasetType: metadata_js_1.DatasetType.TABLE,
                schemaId: null,
                schemaVersion: null,
                canonicalMappingId: null,
                canonicalMappingVersion: null,
                licenseId: null,
                policyTags: ['PII'],
                retentionDays: 365,
                legalBasis: 'Contract',
                rowCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                qualityScore: null,
                owner: 'user1',
                stewards: ['user2'],
                tags: ['production'],
                properties: {},
            };
            const result = await service.registerDataset(datasetData);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toContain('dataset');
            (0, globals_1.expect)(result.sourceId).toBe(source.id);
            (0, globals_1.expect)(result.name).toBe('users');
            (0, globals_1.expect)(result.policyTags).toContain('PII');
        });
    });
    (0, globals_1.describe)('getDataSourceWithDatasets', () => {
        (0, globals_1.it)('should return source with its datasets', async () => {
            const source = await service.registerDataSource({
                name: 'test-db',
                displayName: 'Test DB',
                description: null,
                type: metadata_js_1.DataSourceType.DATABASE,
                connectorId: 'postgres',
                connectorVersion: '1.0.0',
                connectionConfig: {},
                connectionStatus: metadata_js_1.ConnectionStatus.ACTIVE,
                lastConnectedAt: null,
                lastSyncedAt: null,
                owner: 'user1',
                team: null,
                tags: [],
                properties: {},
                schemaId: null,
                schemaVersion: null,
                createdBy: 'user1',
                updatedBy: 'user1',
            });
            await service.registerDataset({
                sourceId: source.id,
                name: 'table1',
                displayName: 'Table 1',
                description: null,
                fullyQualifiedName: 'test-db.public.table1',
                datasetType: metadata_js_1.DatasetType.TABLE,
                schemaId: null,
                schemaVersion: null,
                canonicalMappingId: null,
                canonicalMappingVersion: null,
                licenseId: null,
                policyTags: [],
                retentionDays: null,
                legalBasis: null,
                rowCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                qualityScore: null,
                owner: 'user1',
                stewards: [],
                tags: [],
                properties: {},
            });
            await service.registerDataset({
                sourceId: source.id,
                name: 'table2',
                displayName: 'Table 2',
                description: null,
                fullyQualifiedName: 'test-db.public.table2',
                datasetType: metadata_js_1.DatasetType.TABLE,
                schemaId: null,
                schemaVersion: null,
                canonicalMappingId: null,
                canonicalMappingVersion: null,
                licenseId: null,
                policyTags: [],
                retentionDays: null,
                legalBasis: null,
                rowCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                qualityScore: null,
                owner: 'user1',
                stewards: [],
                tags: [],
                properties: {},
            });
            const result = await service.getDataSourceWithDatasets(source.id);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.source.id).toBe(source.id);
            (0, globals_1.expect)(result.datasets).toHaveLength(2);
        });
        (0, globals_1.it)('should return null for non-existent source', async () => {
            const result = await service.getDataSourceWithDatasets('non-existent-id');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('searchDatasets', () => {
        (0, globals_1.beforeEach)(async () => {
            const source = await service.registerDataSource({
                name: 'test-db',
                displayName: 'Test DB',
                description: null,
                type: metadata_js_1.DataSourceType.DATABASE,
                connectorId: 'postgres',
                connectorVersion: '1.0.0',
                connectionConfig: {},
                connectionStatus: metadata_js_1.ConnectionStatus.ACTIVE,
                lastConnectedAt: null,
                lastSyncedAt: null,
                owner: 'user1',
                team: null,
                tags: [],
                properties: {},
                schemaId: null,
                schemaVersion: null,
                createdBy: 'user1',
                updatedBy: 'user1',
            });
            await service.registerDataset({
                sourceId: source.id,
                name: 'users',
                displayName: 'Users',
                description: null,
                fullyQualifiedName: 'test-db.public.users',
                datasetType: metadata_js_1.DatasetType.TABLE,
                schemaId: null,
                schemaVersion: null,
                canonicalMappingId: null,
                canonicalMappingVersion: null,
                licenseId: null,
                policyTags: ['PII', 'GDPR'],
                retentionDays: null,
                legalBasis: null,
                rowCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                qualityScore: null,
                owner: 'user1',
                stewards: [],
                tags: ['production'],
                properties: {},
            });
            await service.registerDataset({
                sourceId: source.id,
                name: 'orders',
                displayName: 'Orders',
                description: null,
                fullyQualifiedName: 'test-db.public.orders',
                datasetType: metadata_js_1.DatasetType.TABLE,
                schemaId: null,
                schemaVersion: null,
                canonicalMappingId: null,
                canonicalMappingVersion: null,
                licenseId: null,
                policyTags: ['FINANCIAL'],
                retentionDays: null,
                legalBasis: null,
                rowCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                qualityScore: null,
                owner: 'user1',
                stewards: [],
                tags: ['production'],
                properties: {},
            });
        });
        (0, globals_1.it)('should filter datasets by policy tags', async () => {
            const results = await service.searchDatasets({
                policyTags: ['PII'],
            });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].name).toBe('users');
        });
        (0, globals_1.it)('should filter datasets by tags', async () => {
            const results = await service.searchDatasets({
                tags: ['production'],
            });
            (0, globals_1.expect)(results).toHaveLength(2);
        });
    });
});
