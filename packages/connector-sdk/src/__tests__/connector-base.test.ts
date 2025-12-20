/**
 * Connector SDK Base Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseConnector, ConnectorConfig, ConnectorResult } from '../base';
import { MockConnectorTestHarness } from '../testing';

// Test connector implementation
class TestConnector extends BaseConnector {
  name = 'test-connector';
  version = '1.0.0';
  capabilities = ['fetch', 'search'];

  async fetch(params: { id: string }): Promise<ConnectorResult> {
    if (params.id === 'not-found') {
      return { success: false, error: 'Entity not found' };
    }
    return {
      success: true,
      data: { id: params.id, name: 'Test Entity' },
      metadata: { fetchedAt: new Date().toISOString() },
    };
  }

  async search(params: { query: string }): Promise<ConnectorResult> {
    return {
      success: true,
      data: [{ id: '1', name: 'Result 1' }],
      metadata: { total: 1, page: 1 },
    };
  }
}

describe('BaseConnector', () => {
  let connector: TestConnector;
  let config: ConnectorConfig;

  beforeEach(() => {
    config = {
      id: 'test-1',
      endpoint: 'https://api.example.com',
      auth: { type: 'api-key', apiKey: 'test-key' },
      rateLimit: { requestsPerMinute: 60 },
      retry: { maxAttempts: 3, backoffMs: 1000 },
    };
    connector = new TestConnector(config);
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(connector.name).toBe('test-connector');
      expect(connector.version).toBe('1.0.0');
      expect(connector.capabilities).toContain('fetch');
    });

    it('should validate required config', () => {
      expect(() => new TestConnector({} as any)).toThrow();
    });
  });

  describe('Fetch Operations', () => {
    it('should fetch entity successfully', async () => {
      const result = await connector.fetch({ id: 'entity-123' });
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('entity-123');
    });

    it('should handle fetch errors', async () => {
      const result = await connector.fetch({ id: 'not-found' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Entity not found');
    });
  });

  describe('Search Operations', () => {
    it('should search entities', async () => {
      const result = await connector.search({ query: 'test' });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const limitedConnector = new TestConnector({
        ...config,
        rateLimit: { requestsPerMinute: 2 },
      });

      const start = Date.now();
      await Promise.all([
        limitedConnector.fetch({ id: '1' }),
        limitedConnector.fetch({ id: '2' }),
        limitedConnector.fetch({ id: '3' }),
      ]);
      const elapsed = Date.now() - start;

      // Should have been rate limited
      expect(elapsed).toBeGreaterThan(1000);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      let attempts = 0;
      const retryConnector = new TestConnector(config);

      vi.spyOn(retryConnector, 'fetch').mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient error');
        }
        return { success: true, data: { id: '1' } };
      });

      const result = await retryConnector.executeWithRetry(() =>
        retryConnector.fetch({ id: '1' }),
      );

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should report health status', async () => {
      const health = await connector.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.latencyMs).toBeDefined();
    });
  });
});

describe('MockConnectorTestHarness', () => {
  it('should create test connector with mock responses', () => {
    const harness = new MockConnectorTestHarness({
      name: 'mock-test',
      responses: {
        fetch: { success: true, data: { id: 'mock-1' } },
        search: { success: true, data: [] },
      },
    });

    expect(harness.connector.name).toBe('mock-test');
  });

  it('should record call history', async () => {
    const harness = new MockConnectorTestHarness({
      name: 'mock-test',
      responses: {
        fetch: { success: true, data: { id: 'mock-1' } },
      },
    });

    await harness.connector.fetch({ id: 'test' });
    await harness.connector.fetch({ id: 'test2' });

    expect(harness.getCallHistory('fetch')).toHaveLength(2);
  });

  it('should simulate errors', async () => {
    const harness = new MockConnectorTestHarness({
      name: 'mock-test',
      responses: {
        fetch: { success: false, error: 'Simulated error' },
      },
    });

    const result = await harness.connector.fetch({ id: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Simulated error');
  });
});
