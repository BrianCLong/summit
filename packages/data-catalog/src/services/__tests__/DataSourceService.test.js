"use strict";
/**
 * Data Source Service Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const DataSourceService_js_1 = require("../DataSourceService.js");
const dataSourceTypes_js_1 = require("../../types/dataSourceTypes.js");
describe('DataSourceService', () => {
    let service;
    beforeEach(() => {
        service = new DataSourceService_js_1.DataSourceService();
    });
    describe('registerDataSource', () => {
        it('should register a new data source successfully', async () => {
            const dataSource = await service.registerDataSource({
                name: 'postgres-prod',
                displayName: 'Production PostgreSQL',
                description: 'Main production database',
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {
                    host: 'localhost',
                    port: 5432,
                    database: 'production',
                },
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'data-team',
                stewards: ['admin'],
                tags: ['production', 'postgres'],
                domain: 'core',
                properties: {},
            });
            expect(dataSource).toBeDefined();
            expect(dataSource.id).toBeDefined();
            expect(dataSource.name).toBe('postgres-prod');
            expect(dataSource.type).toBe(dataSourceTypes_js_1.DataSourceType.DATABASE);
            expect(dataSource.connectionStatus).toBe(dataSourceTypes_js_1.ConnectionStatus.ACTIVE);
            expect(dataSource.datasetIds).toEqual([]);
            expect(dataSource.createdAt).toBeInstanceOf(Date);
        });
        it('should create lineage summary for data source', async () => {
            const dataSource = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test Source',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.API,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.PENDING,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            const lineage = await service.getLineage(dataSource.id);
            expect(lineage).toBeDefined();
            expect(lineage?.entityId).toBe(dataSource.id);
        });
    });
    describe('listDataSources', () => {
        beforeEach(async () => {
            await service.registerDataSource({
                name: 'postgres-db',
                displayName: 'PostgreSQL',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'team-a',
                stewards: [],
                tags: ['production'],
                domain: 'core',
                properties: {},
            });
            await service.registerDataSource({
                name: 'api-source',
                displayName: 'API Source',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.API,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.INACTIVE,
                lastConnectionTest: null,
                owner: 'team-b',
                stewards: [],
                tags: ['staging'],
                domain: 'external',
                properties: {},
            });
        });
        it('should list all data sources without filters', async () => {
            const sources = await service.listDataSources();
            expect(sources.length).toBe(2);
        });
        it('should filter by type', async () => {
            const sources = await service.listDataSources({
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
            });
            expect(sources.length).toBe(1);
            expect(sources[0].type).toBe(dataSourceTypes_js_1.DataSourceType.DATABASE);
        });
        it('should filter by status', async () => {
            const sources = await service.listDataSources({
                status: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
            });
            expect(sources.length).toBe(1);
            expect(sources[0].connectionStatus).toBe(dataSourceTypes_js_1.ConnectionStatus.ACTIVE);
        });
        it('should filter by tags', async () => {
            const sources = await service.listDataSources({
                tags: ['production'],
            });
            expect(sources.length).toBe(1);
            expect(sources[0].tags).toContain('production');
        });
        it('should filter by domain', async () => {
            const sources = await service.listDataSources({
                domain: 'core',
            });
            expect(sources.length).toBe(1);
            expect(sources[0].domain).toBe('core');
        });
    });
    describe('testConnection', () => {
        it('should test connection and update status', async () => {
            const dataSource = await service.registerDataSource({
                name: 'test-db',
                displayName: 'Test DB',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.PENDING,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            const result = await service.testConnection(dataSource.id);
            expect(result.success).toBe(true);
            const updated = await service.getDataSource(dataSource.id);
            expect(updated?.connectionStatus).toBe(dataSourceTypes_js_1.ConnectionStatus.ACTIVE);
            expect(updated?.lastConnectionTest).toBeInstanceOf(Date);
        });
    });
    describe('registerDataset', () => {
        it('should register a dataset under a data source', async () => {
            const dataSource = await service.registerDataSource({
                name: 'db-source',
                displayName: 'DB Source',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            const dataset = await service.registerDataset({
                sourceId: dataSource.id,
                name: 'users',
                displayName: 'Users Table',
                description: 'User records',
                fullyQualifiedName: 'db.public.users',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.CONFIDENTIAL,
                owner: 'test',
                stewards: [],
                tags: ['pii'],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: 1000,
                sizeBytes: 50000,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            });
            expect(dataset).toBeDefined();
            expect(dataset.id).toBeDefined();
            expect(dataset.sourceId).toBe(dataSource.id);
            expect(dataset.name).toBe('users');
            expect(dataset.fields).toEqual([]);
            // Verify it's added to the data source
            const updatedSource = await service.getDataSource(dataSource.id);
            expect(updatedSource?.datasetIds).toContain(dataset.id);
        });
        it('should throw error for non-existent data source', async () => {
            await expect(service.registerDataset({
                sourceId: 'non-existent',
                name: 'test',
                displayName: 'Test',
                description: null,
                fullyQualifiedName: 'test',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.PUBLIC,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            })).rejects.toThrow('Data source not found');
        });
    });
    describe('searchDatasets', () => {
        beforeEach(async () => {
            const source = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            await service.registerDataset({
                sourceId: source.id,
                name: 'customers',
                displayName: 'Customer Records',
                description: 'All customer data',
                fullyQualifiedName: 'db.customers',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.CONFIDENTIAL,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            });
            await service.registerDataset({
                sourceId: source.id,
                name: 'orders',
                displayName: 'Order Records',
                description: 'All order data',
                fullyQualifiedName: 'db.orders',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.INTERNAL,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            });
        });
        it('should find datasets by name', async () => {
            const results = await service.searchDatasets('customer');
            expect(results.length).toBe(1);
            expect(results[0].name).toBe('customers');
        });
        it('should find datasets by description', async () => {
            const results = await service.searchDatasets('order data');
            expect(results.length).toBe(1);
            expect(results[0].name).toBe('orders');
        });
        it('should be case insensitive', async () => {
            const results = await service.searchDatasets('CUSTOMER');
            expect(results.length).toBe(1);
        });
    });
    describe('registerField', () => {
        it('should register a field for a dataset', async () => {
            const source = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            const dataset = await service.registerDataset({
                sourceId: source.id,
                name: 'users',
                displayName: 'Users',
                description: null,
                fullyQualifiedName: 'db.users',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.INTERNAL,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            });
            const field = await service.registerField({
                datasetId: dataset.id,
                name: 'user_id',
                displayName: 'User ID',
                description: 'Unique user identifier',
                dataType: 'uuid',
                nativeDataType: 'UUID',
                nullable: false,
                isPrimaryKey: true,
                isForeignKey: false,
                foreignKeyReference: null,
                defaultValue: null,
                classification: dataSourceTypes_js_1.DataClassification.INTERNAL,
                tags: ['identifier'],
                policyTags: [],
                canonicalFieldId: null,
                mappingIds: [],
                statistics: null,
                sampleValues: [],
                properties: {},
            });
            expect(field).toBeDefined();
            expect(field.id).toBeDefined();
            expect(field.name).toBe('user_id');
            expect(field.isPrimaryKey).toBe(true);
            // Verify it's added to the dataset
            const updatedDataset = await service.getDataset(dataset.id);
            expect(updatedDataset?.fields).toHaveLength(1);
        });
    });
    describe('createMapping', () => {
        it('should create a field mapping', async () => {
            const source = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            const dataset = await service.registerDataset({
                sourceId: source.id,
                name: 'users',
                displayName: 'Users',
                description: null,
                fullyQualifiedName: 'db.users',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.INTERNAL,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            });
            const field = await service.registerField({
                datasetId: dataset.id,
                name: 'full_name',
                displayName: 'Full Name',
                description: null,
                dataType: 'string',
                nativeDataType: 'VARCHAR',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
                foreignKeyReference: null,
                defaultValue: null,
                classification: dataSourceTypes_js_1.DataClassification.INTERNAL,
                tags: [],
                policyTags: [],
                canonicalFieldId: null,
                mappingIds: [],
                statistics: null,
                sampleValues: [],
                properties: {},
            });
            const mapping = await service.createMapping({
                name: 'full_name_to_canonical',
                description: 'Map full name to canonical person name',
                sourceDatasetId: dataset.id,
                sourceFieldId: field.id,
                canonicalSchemaId: 'canonical-person-schema-id',
                canonicalFieldId: 'canonical-name-field-id',
                transformationType: dataSourceTypes_js_1.MappingTransformationType.DIRECT,
                transformationLogic: null,
                transformationLanguage: null,
                validationRules: [],
                status: dataSourceTypes_js_1.MappingStatus.ACTIVE,
                version: '1.0.0',
                createdBy: 'test-user',
                approvedBy: null,
                properties: {},
            });
            expect(mapping).toBeDefined();
            expect(mapping.id).toBeDefined();
            expect(mapping.transformationType).toBe(dataSourceTypes_js_1.MappingTransformationType.DIRECT);
            expect(mapping.status).toBe(dataSourceTypes_js_1.MappingStatus.ACTIVE);
            // Verify it's linked to the field
            const updatedField = await service.getField(field.id);
            expect(updatedField?.mappingIds).toContain(mapping.id);
        });
    });
    describe('getImpactAnalysis', () => {
        it('should analyze impact of dataset changes', async () => {
            const source = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            const dataset = await service.registerDataset({
                sourceId: source.id,
                name: 'source_data',
                displayName: 'Source Data',
                description: null,
                fullyQualifiedName: 'db.source_data',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.INTERNAL,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            });
            const analysis = await service.getImpactAnalysis(dataset.id);
            expect(analysis).toBeDefined();
            expect(analysis.affectedDatasets).toBeDefined();
            expect(analysis.affectedMappings).toBeDefined();
            expect(analysis.affectedCases).toBeDefined();
        });
    });
    describe('license operations', () => {
        it('should register a license', async () => {
            const license = await service.registerLicense({
                name: 'cc-by-4.0',
                displayName: 'Creative Commons Attribution 4.0',
                description: 'CC BY 4.0 License',
                licenseType: dataSourceTypes_js_1.LicenseType.CREATIVE_COMMONS,
                licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
                legalBasis: null,
                allowedUseCases: ['research', 'commercial'],
                restrictions: [],
                retentionRequirement: null,
                deletionRequired: false,
                geographicRestrictions: [],
                allowedRegions: [],
                requiresAttribution: true,
                attributionText: 'Licensed under CC BY 4.0',
                allowsCommercialUse: true,
                allowsDerivativeWorks: true,
                allowsRedistribution: true,
                expiresAt: null,
                createdBy: 'admin',
                properties: {},
            });
            expect(license).toBeDefined();
            expect(license.id).toBeDefined();
            expect(license.licenseType).toBe(dataSourceTypes_js_1.LicenseType.CREATIVE_COMMONS);
        });
        it('should attach license to dataset', async () => {
            const source = await service.registerDataSource({
                name: 'test-source',
                displayName: 'Test',
                description: null,
                type: dataSourceTypes_js_1.DataSourceType.DATABASE,
                connectionConfig: {},
                connectionStatus: dataSourceTypes_js_1.ConnectionStatus.ACTIVE,
                lastConnectionTest: null,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                properties: {},
            });
            const dataset = await service.registerDataset({
                sourceId: source.id,
                name: 'licensed_data',
                displayName: 'Licensed Data',
                description: null,
                fullyQualifiedName: 'db.licensed_data',
                status: dataSourceTypes_js_1.DatasetStatus.ACTIVE,
                classification: dataSourceTypes_js_1.DataClassification.PUBLIC,
                owner: 'test',
                stewards: [],
                tags: [],
                domain: null,
                schemaId: null,
                originJobId: null,
                mappingIds: [],
                recordCount: null,
                sizeBytes: null,
                lastProfiledAt: null,
                licenseIds: [],
                policyTags: [],
                retentionDays: null,
                properties: {},
            });
            const license = await service.registerLicense({
                name: 'test-license',
                displayName: 'Test License',
                description: null,
                licenseType: dataSourceTypes_js_1.LicenseType.OPEN_DATA,
                licenseUrl: null,
                legalBasis: null,
                allowedUseCases: [],
                restrictions: [],
                retentionRequirement: null,
                deletionRequired: false,
                geographicRestrictions: [],
                allowedRegions: [],
                requiresAttribution: false,
                attributionText: null,
                allowsCommercialUse: true,
                allowsDerivativeWorks: true,
                allowsRedistribution: true,
                expiresAt: null,
                createdBy: 'test',
                properties: {},
            });
            await service.attachLicenseToDataset(dataset.id, license.id);
            const updatedDataset = await service.getDataset(dataset.id);
            expect(updatedDataset?.licenseIds).toContain(license.id);
            const datasetsByLicense = await service.getDatasetsByLicense(license.id);
            expect(datasetsByLicense).toHaveLength(1);
            expect(datasetsByLicense[0].id).toBe(dataset.id);
        });
    });
});
