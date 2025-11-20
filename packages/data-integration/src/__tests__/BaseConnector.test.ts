/**
 * Unit tests for BaseConnector
 */

import { BaseConnector } from '../core/BaseConnector';
import { DataSourceConfig, ConnectorCapabilities, SourceType, ExtractionStrategy, LoadStrategy } from '../types';
import { createLogger } from 'winston';

// Mock connector for testing
class MockConnector extends BaseConnector {
  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
    return this.isConnected;
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      supportsStreaming: false,
      supportsIncremental: false,
      supportsCDC: false,
      supportsSchema: false,
      supportsPartitioning: false,
      maxConcurrentConnections: 1
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    yield [{ id: 1, name: 'test' }];
  }

  async getSchema(): Promise<any> {
    return { schema: 'test' };
  }
}

describe('BaseConnector', () => {
  let connector: MockConnector;
  let logger: any;
  let config: DataSourceConfig;

  beforeEach(() => {
    logger = createLogger({ silent: true });

    config = {
      id: 'test-connector',
      name: 'Test Connector',
      type: SourceType.DATABASE,
      connectionConfig: {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass',
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2
        }
      },
      extractionConfig: {
        strategy: ExtractionStrategy.FULL,
        batchSize: 100
      },
      loadConfig: {
        strategy: LoadStrategy.BULK,
        targetTable: 'test_table'
      },
      metadata: {}
    };

    connector = new MockConnector(config, logger);
  });

  describe('constructor', () => {
    it('should create connector instance', () => {
      expect(connector).toBeInstanceOf(MockConnector);
      expect(connector).toBeInstanceOf(BaseConnector);
    });

    it('should store config and logger', () => {
      expect(connector.getConfig()).toEqual(config);
    });
  });

  describe('connect/disconnect', () => {
    it('should connect successfully', async () => {
      await connector.connect();
      expect(connector.isConnectionActive()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await connector.connect();
      await connector.disconnect();
      expect(connector.isConnectionActive()).toBe(false);
    });

    it('should test connection', async () => {
      await connector.connect();
      const result = await connector.testConnection();
      expect(result).toBe(true);
    });
  });

  describe('extract', () => {
    it('should extract data', async () => {
      const results = [];
      for await (const batch of connector.extract()) {
        results.push(...batch);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('getSchema', () => {
    it('should return schema', async () => {
      const schema = await connector.getSchema();
      expect(schema).toEqual({ schema: 'test' });
    });
  });

  describe('getCapabilities', () => {
    it('should return capabilities', () => {
      const capabilities = connector.getCapabilities();
      expect(capabilities.maxConcurrentConnections).toBe(1);
      expect(capabilities.supportsStreaming).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return config', () => {
      const returnedConfig = connector.getConfig();
      expect(returnedConfig).toEqual(config);
      expect(returnedConfig).not.toBe(config); // Should be a copy
    });
  });
});
