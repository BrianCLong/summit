/**
 * Metadata Service Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MetadataService } from '../MetadataService.js';
import { IMetadataStore } from '../../stores/PostgresMetadataStore.js';
import {
  DataSource,
  Dataset,
  DataSourceType,
  ConnectionStatus,
  DatasetType,
  SensitivityLevel,
} from '../../types/metadata.js';

// Mock store implementation
class MockMetadataStore implements Partial<IMetadataStore> {
  private dataSources: Map<string, DataSource> = new Map();
  private datasets: Map<string, Dataset> = new Map();

  async getDataSource(id: string): Promise<DataSource | null> {
    return this.dataSources.get(id) || null;
  }

  async createDataSource(source: DataSource): Promise<DataSource> {
    this.dataSources.set(source.id, source);
    return source;
  }

  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
    const existing = this.dataSources.get(id);
    if (!existing) {
      throw new Error(`DataSource ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.dataSources.set(id, updated);
    return updated;
  }

  async getDataset(id: string): Promise<Dataset | null> {
    return this.datasets.get(id) || null;
  }

  async createDataset(dataset: Dataset): Promise<Dataset> {
    this.datasets.set(dataset.id, dataset);
    return dataset;
  }

  async listDatasets(sourceId?: string): Promise<Dataset[]> {
    const datasets = Array.from(this.datasets.values());
    if (sourceId) {
      return datasets.filter(d => d.sourceId === sourceId);
    }
    return datasets;
  }

  async createField = jest.fn();
  async createMapping = jest.fn();
  async createLicense = jest.fn();
  async updateLineageSummary = jest.fn();
}

describe('MetadataService', () => {
  let service: MetadataService;
  let store: MockMetadataStore;

  beforeEach(() => {
    store = new MockMetadataStore();
    service = new MetadataService(store as unknown as IMetadataStore);
  });

  describe('registerDataSource', () => {
    it('should register a new data source', async () => {
      const sourceData = {
        name: 'test-database',
        displayName: 'Test Database',
        description: 'A test database source',
        type: DataSourceType.DATABASE,
        connectorId: 'postgres-connector',
        connectorVersion: '1.0.0',
        connectionConfig: { host: 'localhost', port: 5432 },
        connectionStatus: ConnectionStatus.CONFIGURED,
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

      expect(result).toBeDefined();
      expect(result.id).toContain('source-test-database');
      expect(result.name).toBe('test-database');
      expect(result.type).toBe(DataSourceType.DATABASE);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for data sources', async () => {
      const sourceData = {
        name: 'test-db',
        displayName: 'Test DB',
        description: null,
        type: DataSourceType.DATABASE,
        connectorId: 'postgres',
        connectorVersion: '1.0.0',
        connectionConfig: {},
        connectionStatus: ConnectionStatus.CONFIGURED,
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

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('updateDataSourceStatus', () => {
    it('should update connection status', async () => {
      const source = await service.registerDataSource({
        name: 'test-source',
        displayName: 'Test Source',
        description: null,
        type: DataSourceType.API,
        connectorId: 'api-connector',
        connectorVersion: '1.0.0',
        connectionConfig: {},
        connectionStatus: ConnectionStatus.CONFIGURED,
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
      const updated = await service.updateDataSourceStatus(
        source.id,
        ConnectionStatus.ACTIVE,
        connectedAt
      );

      expect(updated.connectionStatus).toBe(ConnectionStatus.ACTIVE);
      expect(updated.lastConnectedAt).toEqual(connectedAt);
    });
  });

  describe('registerDataset', () => {
    it('should register a new dataset', async () => {
      const source = await service.registerDataSource({
        name: 'test-source',
        displayName: 'Test Source',
        description: null,
        type: DataSourceType.DATABASE,
        connectorId: 'postgres',
        connectorVersion: '1.0.0',
        connectionConfig: {},
        connectionStatus: ConnectionStatus.ACTIVE,
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
        datasetType: DatasetType.TABLE,
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

      expect(result).toBeDefined();
      expect(result.id).toContain('dataset');
      expect(result.sourceId).toBe(source.id);
      expect(result.name).toBe('users');
      expect(result.policyTags).toContain('PII');
    });
  });

  describe('getDataSourceWithDatasets', () => {
    it('should return source with its datasets', async () => {
      const source = await service.registerDataSource({
        name: 'test-db',
        displayName: 'Test DB',
        description: null,
        type: DataSourceType.DATABASE,
        connectorId: 'postgres',
        connectorVersion: '1.0.0',
        connectionConfig: {},
        connectionStatus: ConnectionStatus.ACTIVE,
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
        datasetType: DatasetType.TABLE,
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
        datasetType: DatasetType.TABLE,
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

      expect(result).toBeDefined();
      expect(result!.source.id).toBe(source.id);
      expect(result!.datasets).toHaveLength(2);
    });

    it('should return null for non-existent source', async () => {
      const result = await service.getDataSourceWithDatasets('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('searchDatasets', () => {
    beforeEach(async () => {
      const source = await service.registerDataSource({
        name: 'test-db',
        displayName: 'Test DB',
        description: null,
        type: DataSourceType.DATABASE,
        connectorId: 'postgres',
        connectorVersion: '1.0.0',
        connectionConfig: {},
        connectionStatus: ConnectionStatus.ACTIVE,
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
        datasetType: DatasetType.TABLE,
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
        datasetType: DatasetType.TABLE,
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

    it('should filter datasets by policy tags', async () => {
      const results = await service.searchDatasets({
        policyTags: ['PII'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('users');
    });

    it('should filter datasets by tags', async () => {
      const results = await service.searchDatasets({
        tags: ['production'],
      });

      expect(results).toHaveLength(2);
    });
  });
});
