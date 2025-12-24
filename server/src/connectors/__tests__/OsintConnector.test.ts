import { describe, it, expect } from '@jest/globals';
import { OsintConnector } from '../implementations/OsintConnector.js';
import { OsintSourceType, OsintSourceConfig } from '../types.js';
import pino from 'pino';

describe('OsintConnector', () => {
  const logger = (pino as any)({ level: 'silent' });

  it('should initialize with correct config', () => {
    const config: OsintSourceConfig = {
      id: 'test-source',
      name: 'test-social',
      type: 'osint',
      tenantId: 'tenant-1',
      sourceType: OsintSourceType.SOCIAL,
      config: {}
    };
    const connector = new OsintConnector(config, logger);
    expect(connector).toBeDefined();
  });

  it('should fetch a batch of mock records', async () => {
    const config: OsintSourceConfig = {
      id: 'test-source',
      name: 'test-social',
      type: 'osint',
      tenantId: 'tenant-1',
      sourceType: OsintSourceType.SOCIAL,
      config: {}
    };
    const connector = new OsintConnector(config, logger);
    const records = await connector.fetchBatch(10);

    expect(records).toHaveLength(10);
    expect(records[0].sourceType).toBe(OsintSourceType.SOCIAL);
    expect(records[0].content).toBeDefined();
  });

  it('should stream records', async () => {
    const config: OsintSourceConfig = {
      id: 'test-source',
      name: 'test-web',
      type: 'osint',
      tenantId: 'tenant-1',
      sourceType: OsintSourceType.WEB,
      config: {}
    };
    const connector = new OsintConnector(config, logger);
    const stream = await connector.fetchStream();

    let count = 0;
    // Consume a few records to verify stream works
    for await (const record of stream) {
      expect(record.sourceType).toBe(OsintSourceType.WEB);
      count++;
      if (count >= 5) break;
    }
    expect(count).toBe(5);
  });
});
