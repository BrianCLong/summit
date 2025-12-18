/**
 * CSV File Connector Tests
 */

import { CsvFileConnector } from '../connectors/csv-file-connector';
import type { ConnectorContext, ConnectorEntity } from '../types';
import { createWriteStream } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CsvFileConnector', () => {
  let connector: CsvFileConnector;
  let testFilePath: string;

  beforeEach(() => {
    connector = new CsvFileConnector();
    testFilePath = join(tmpdir(), `test-${Date.now()}.csv`);
  });

  afterEach(async () => {
    try {
      await unlink(testFilePath);
    } catch {
      // Ignore errors
    }
  });

  describe('manifest', () => {
    it('should have correct manifest', () => {
      expect(connector.manifest.id).toBe('csv-file-connector');
      expect(connector.manifest.name).toBe('CSV File Connector');
      expect(connector.manifest.capabilities).toContain('pull');
      expect(connector.manifest.capabilities).toContain('batch');
    });
  });

  describe('initialize', () => {
    it('should initialize with valid config', async () => {
      await connector.initialize({
        config: {
          filePath: testFilePath,
        },
        secrets: {},
        tenantId: 'test-tenant',
      });

      expect(connector).toBeDefined();
    });

    it('should throw error if filePath not provided', async () => {
      await expect(
        connector.initialize({
          config: {},
          secrets: {},
          tenantId: 'test-tenant',
        })
      ).rejects.toThrow('filePath is required');
    });
  });

  describe('pull', () => {
    it('should ingest CSV records', async () => {
      // Create test CSV file
      const csvContent = `name,age,email
John Doe,30,john@example.com
Jane Smith,28,jane@example.com`;

      await writeFile(testFilePath, csvContent, 'utf-8');

      // Initialize connector
      await connector.initialize({
        config: {
          filePath: testFilePath,
        },
        secrets: {},
        tenantId: 'test-tenant',
      });

      // Mock context
      const entities: ConnectorEntity[] = [];
      const mockContext: ConnectorContext = {
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        },
        metrics: {
          increment: jest.fn(),
          gauge: jest.fn(),
          histogram: jest.fn(),
          timing: jest.fn(),
        },
        rateLimiter: {
          acquire: jest.fn().mockResolvedValue(undefined),
          isLimited: jest.fn().mockReturnValue(false),
          remaining: jest.fn().mockReturnValue(100),
        },
        stateStore: {
          get: jest.fn(),
          set: jest.fn(),
          delete: jest.fn(),
          getCursor: jest.fn().mockResolvedValue(null),
          setCursor: jest.fn(),
        },
        emitter: {
          emitEntity: jest.fn((entity) => {
            entities.push(entity);
            return Promise.resolve();
          }),
          emitRelationship: jest.fn(),
          emitEntities: jest.fn(),
          emitRelationships: jest.fn(),
          flush: jest.fn().mockResolvedValue(undefined),
        },
        signal: new AbortController().signal,
      };

      // Pull data
      const result = await connector.pull(mockContext);

      expect(result.success).toBe(true);
      expect(result.entitiesProcessed).toBe(2);
      expect(entities).toHaveLength(2);
      expect(entities[0].props).toHaveProperty('name');
      expect(entities[0].props).toHaveProperty('age');
      expect(entities[0].props).toHaveProperty('email');
    });
  });
});
