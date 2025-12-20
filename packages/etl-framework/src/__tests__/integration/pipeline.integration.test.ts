/**
 * Integration tests for ETL Pipeline
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import winston from 'winston';

import {
  PipelineExecutor,
  CDCEngine,
  CDCStrategy,
  DataQualityMonitor,
  IncrementalLoader,
  ProvenanceIntegration
} from '../../index';

import {
  DataSourceConfig,
  PipelineStatus,
  SourceType,
  ExtractionStrategy,
  LoadStrategy
} from '@intelgraph/data-integration/src/types';

// Test database connection
const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/summit_test';
let pool: Pool;

// Test logger
const logger = winston.createLogger({
  level: 'error',
  silent: true,
  transports: []
});

describe('ETL Pipeline Integration Tests', () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });

    // Create test tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_source (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_target (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DROP TABLE IF EXISTS test_source CASCADE');
    await pool.query('DROP TABLE IF EXISTS test_target CASCADE');
    await pool.query('DROP TABLE IF EXISTS test_source_changes CASCADE');
    await pool.query('DROP TABLE IF EXISTS etl_watermarks CASCADE');
    await pool.query('DROP TABLE IF EXISTS etl_cdc_watermarks CASCADE');

    await pool.end();
  });

  beforeEach(async () => {
    // Clear test data
    await pool.query('TRUNCATE TABLE test_source CASCADE');
    await pool.query('TRUNCATE TABLE test_target CASCADE');
  });

  describe('PipelineExecutor', () => {
    it('should execute a full pipeline successfully', async () => {
      // Insert test data
      await pool.query(`
        INSERT INTO test_source (name, email)
        VALUES
          ('John Doe', 'john@example.com'),
          ('Jane Smith', 'jane@example.com'),
          ('Bob Johnson', 'bob@example.com')
      `);

      // Create pipeline config
      const config: DataSourceConfig = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        type: SourceType.DATABASE,
        connectionConfig: {},
        extractionConfig: {
          strategy: ExtractionStrategy.FULL,
          batchSize: 100
        },
        loadConfig: {
          strategy: LoadStrategy.BULK,
          targetTable: 'test_target',
          batchSize: 100
        },
        metadata: {}
      };

      // Create simple connector
      const connector = {
        connect: async () => {},
        disconnect: async () => {},
        testConnection: async () => true,
        extract: async function* () {
          const result = await pool.query('SELECT * FROM test_source');
          yield result.rows;
        },
        getSchema: async () => ({}),
        getCapabilities: () => ({
          supportsStreaming: false,
          supportsIncremental: false,
          supportsCDC: false,
          supportsSchema: false,
          supportsPartitioning: false,
          maxConcurrentConnections: 1
        })
      };

      const executor = new PipelineExecutor(logger);
      const run = await executor.execute(connector, config);

      expect(run.status).toBe(PipelineStatus.SUCCESS);
      expect(run.recordsExtracted).toBe(3);
      expect(run.recordsLoaded).toBeGreaterThan(0);
      expect(run.errors).toHaveLength(0);
    });

    it('should emit progress events during execution', async () => {
      const config: DataSourceConfig = {
        id: 'test-pipeline-events',
        name: 'Test Pipeline Events',
        type: SourceType.DATABASE,
        connectionConfig: {},
        extractionConfig: {
          strategy: ExtractionStrategy.FULL
        },
        loadConfig: {
          strategy: LoadStrategy.BULK,
          targetTable: 'test_target'
        },
        metadata: {}
      };

      const connector = {
        connect: async () => {},
        disconnect: async () => {},
        testConnection: async () => true,
        extract: async function* () {
          yield [];
        },
        getSchema: async () => ({}),
        getCapabilities: () => ({
          supportsStreaming: false,
          supportsIncremental: false,
          supportsCDC: false,
          supportsSchema: false,
          supportsPartitioning: false,
          maxConcurrentConnections: 1
        })
      };

      const executor = new PipelineExecutor(logger);

      const events: string[] = [];
      executor.on('pipeline:started', () => events.push('started'));
      executor.on('pipeline:progress', () => events.push('progress'));
      executor.on('pipeline:completed', () => events.push('completed'));

      await executor.execute(connector, config);

      expect(events).toContain('started');
      expect(events).toContain('completed');
    });
  });

  describe('CDC Engine', () => {
    it('should capture timestamp-based changes', async () => {
      // Insert initial data
      await pool.query(`
        INSERT INTO test_source (name, email, updated_at)
        VALUES ('John Doe', 'john@example.com', NOW() - INTERVAL '1 hour')
      `);

      const cdcEngine = new CDCEngine(
        {
          strategy: CDCStrategy.TIMESTAMP,
          sourceTable: 'test_source',
          primaryKeys: ['id'],
          trackingColumn: 'updated_at',
          pollIntervalSeconds: 1,
          batchSize: 100
        },
        logger
      );

      await cdcEngine.connect(testDbUrl);

      const changesPromise = new Promise((resolve) => {
        cdcEngine.once('changes', (changes) => {
          resolve(changes);
        });
      });

      await cdcEngine.start();

      // Insert new record
      await pool.query(`
        INSERT INTO test_source (name, email)
        VALUES ('Jane Smith', 'jane@example.com')
      `);

      // Wait for changes
      const changes = (await Promise.race([
        changesPromise,
        new Promise((resolve) => setTimeout(() => resolve([]), 5000))
      ])) as any[];

      await cdcEngine.stop();
      await cdcEngine.disconnect();

      expect(changes.length).toBeGreaterThan(0);
    }, 10000);

    it('should track watermarks correctly', async () => {
      const cdcEngine = new CDCEngine(
        {
          strategy: CDCStrategy.VERSION,
          sourceTable: 'test_source',
          primaryKeys: ['id'],
          trackingColumn: 'version',
          batchSize: 100
        },
        logger
      );

      await cdcEngine.connect(testDbUrl);

      // Insert test data with versions
      await pool.query(`
        INSERT INTO test_source (name, email, version)
        VALUES
          ('User 1', 'user1@example.com', 1),
          ('User 2', 'user2@example.com', 2),
          ('User 3', 'user3@example.com', 3)
      `);

      await cdcEngine.start();

      // Wait a bit for CDC to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await cdcEngine.stop();
      await cdcEngine.disconnect();

      // Verify watermark was created
      const result = await pool.query(
        "SELECT * FROM etl_cdc_watermarks WHERE source_table = 'test_source'"
      );

      expect(result.rows.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Data Quality Monitor', () => {
    it('should generate quality report with statistics', async () => {
      const monitor = new DataQualityMonitor(logger);

      const testData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
        { id: 3, name: 'Bob Johnson', email: null, age: 35 }
      ];

      const mockRun: any = {
        id: 'test-run',
        pipelineId: 'test-pipeline',
        status: PipelineStatus.SUCCESS,
        startTime: new Date(),
        endTime: new Date(),
        recordsExtracted: 3,
        recordsLoaded: 3,
        recordsFailed: 0,
        recordsTransformed: 3,
        bytesProcessed: 0,
        errors: [],
        metrics: {
          extractionDurationMs: 100,
          transformationDurationMs: 50,
          validationDurationMs: 20,
          enrichmentDurationMs: 30,
          loadingDurationMs: 80,
          totalDurationMs: 280,
          throughputRecordsPerSecond: 10.7,
          throughputMbPerSecond: 0.001
        },
        lineage: []
      };

      const report = await monitor.generateReport(mockRun, testData);

      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.dimensions.completeness).toBeGreaterThan(0);
      expect(report.statistics.totalRecords).toBe(3);
      expect(report.statistics.nullCounts.email).toBe(1);
      expect(report.statistics.distinctCounts.id).toBe(3);
    });

    it('should identify quality issues', async () => {
      const monitor = new DataQualityMonitor(logger);

      const testData = [
        { id: 1, name: null, email: null },
        { id: 2, name: null, email: null },
        { id: 3, name: 'John', email: 'john@example.com' }
      ];

      const mockRun: any = {
        id: 'test-run',
        pipelineId: 'test-pipeline',
        status: PipelineStatus.SUCCESS,
        startTime: new Date(),
        endTime: new Date(),
        recordsExtracted: 3,
        recordsLoaded: 3,
        recordsFailed: 0,
        recordsTransformed: 3,
        bytesProcessed: 0,
        errors: [],
        metrics: {
          extractionDurationMs: 100,
          transformationDurationMs: 50,
          validationDurationMs: 20,
          enrichmentDurationMs: 30,
          loadingDurationMs: 80,
          totalDurationMs: 280,
          throughputRecordsPerSecond: 10.7,
          throughputMbPerSecond: 0.001
        },
        lineage: []
      };

      const report = await monitor.generateReport(mockRun, testData);

      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.dimensions.completeness).toBeLessThan(100);
    });
  });

  describe('Incremental Loader', () => {
    it('should load only new records', async () => {
      // Insert initial data
      await pool.query(`
        INSERT INTO test_source (name, email, updated_at)
        VALUES
          ('User 1', 'user1@example.com', NOW() - INTERVAL '2 hours'),
          ('User 2', 'user2@example.com', NOW() - INTERVAL '1 hour')
      `);

      const loader = new IncrementalLoader(
        {
          sourceTable: 'test_source',
          targetTable: 'test_target',
          incrementalColumn: 'updated_at',
          primaryKeys: ['id'],
          watermark: {
            watermarkColumn: 'updated_at',
            watermarkType: 'timestamp',
            initialValue: new Date('2020-01-01').toISOString()
          },
          batchSize: 100
        },
        logger
      );

      await loader.connect(testDbUrl, testDbUrl);

      // First load
      const loadState1 = await loader.load();
      expect(loadState1.recordsLoaded).toBe(2);

      // Insert new record
      await pool.query(`
        INSERT INTO test_source (name, email, updated_at)
        VALUES ('User 3', 'user3@example.com', NOW())
      `);

      // Second load should only get new record
      const loadState2 = await loader.load();
      expect(loadState2.recordsLoaded).toBe(1);

      await loader.disconnect();
    }, 15000);

    it('should track load state correctly', async () => {
      const loader = new IncrementalLoader(
        {
          sourceTable: 'test_source',
          targetTable: 'test_target',
          incrementalColumn: 'updated_at',
          primaryKeys: ['id'],
          watermark: {
            watermarkColumn: 'updated_at',
            watermarkType: 'timestamp'
          }
        },
        logger
      );

      await loader.connect(testDbUrl, testDbUrl);

      // Insert and load data
      await pool.query(`
        INSERT INTO test_source (name, email)
        VALUES ('User 1', 'user1@example.com')
      `);

      await loader.load();

      // Get load history
      const history = await loader.getLoadHistory(10);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].sourceTable).toBe('test_source');
      expect(history[0].status).toBe('success');

      await loader.disconnect();
    }, 10000);
  });

  describe('Provenance Integration', () => {
    it('should register pipeline run as evidence', async () => {
      const provenance = new ProvenanceIntegration(
        {
          baseURL: 'http://localhost:4010',
          authorityId: 'test-service',
          reasonForAccess: 'integration test',
          enabled: false // Disabled for tests
        },
        logger
      );

      const mockRun: any = {
        id: 'test-run',
        pipelineId: 'test-pipeline',
        status: PipelineStatus.SUCCESS,
        startTime: new Date(),
        endTime: new Date(),
        recordsExtracted: 100,
        recordsLoaded: 100,
        recordsFailed: 0,
        recordsTransformed: 100,
        bytesProcessed: 10000,
        errors: [],
        metrics: {
          extractionDurationMs: 100,
          transformationDurationMs: 50,
          validationDurationMs: 20,
          enrichmentDurationMs: 30,
          loadingDurationMs: 80,
          totalDurationMs: 280,
          throughputRecordsPerSecond: 357,
          throughputMbPerSecond: 0.035
        },
        lineage: [
          {
            sourceEntity: 'test_source',
            targetEntity: 'test_target',
            transformations: ['map', 'filter'],
            timestamp: new Date(),
            metadata: {}
          }
        ]
      };

      // With disabled integration, should return null
      const evidenceId = await provenance.registerPipelineRun(mockRun, 'case-001');

      expect(evidenceId).toBeNull();
    });
  });
});
