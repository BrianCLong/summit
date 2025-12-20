// @ts-nocheck

import { BaseConnector } from '../../src/connectors/base';
import { ConnectorConfig, ConnectorSchema } from '../../src/connectors/types';
import { Readable } from 'stream';

// Mock connector for testing base class behavior
class MockConnector extends BaseConnector {
  async connect(): Promise<void> { this.isConnected = true; }
  async disconnect(): Promise<void> { this.isConnected = false; }
  async testConnection(): Promise<boolean> { return true; }
  async fetchSchema(): Promise<ConnectorSchema> { return { fields: [] }; }
  async readStream(options?: any): Promise<Readable> { return new Readable({ read() { this.push(null); } }); }
}

describe('BaseConnector', () => {
  let connector: MockConnector;
  const config: ConnectorConfig = {
    id: 'test-1',
    name: 'Test Connector',
    type: 'mock',
    tenantId: 'tenant-1',
    config: {}
  };

  beforeEach(() => {
    connector = new MockConnector(config);
  });

  test('should initialize with correct config', () => {
    expect(connector.validateConfig()).toBe(true);
  });

  test('healthCheck should return healthy when connected', async () => {
    const health = await connector.healthCheck();
    expect(health.status).toBe('healthy');
  });

  test('metrics should start at zero', () => {
    const metrics = connector.getMetrics();
    expect(metrics.recordsProcessed).toBe(0);
    expect(metrics.errors).toBe(0);
  });
});
