/**
 * Integration tests for sync-service
 * Tests export/import flows between simulated core and edge deployments
 */

import { Pool } from 'pg';
import { BundleExporter } from '../src/exporters/bundle-exporter.js';
import { BundleImporter } from '../src/importers/bundle-importer.js';
import { BundleSigner } from '../src/crypto/signer.js';
import {
  SyncBundle,
  ExportRequest,
  ImportRequest,
} from '../src/types/index.js';

describe('Sync Service Integration Tests', () => {
  let corePool: Pool;
  let edgePool: Pool;
  let coreSigner: BundleSigner;
  let edgeSigner: BundleSigner;
  let coreExporter: BundleExporter;
  let edgeImporter: BundleImporter;

  beforeAll(async () => {
    // Set up core deployment database
    corePool = new Pool({
      connectionString:
        process.env.CORE_DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/intelgraph_core_test',
    });

    // Set up edge deployment database
    edgePool = new Pool({
      connectionString:
        process.env.EDGE_DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/intelgraph_edge_test',
    });

    // Generate test keys
    const coreKeys = BundleSigner.generateKeyPair();
    const edgeKeys = BundleSigner.generateKeyPair();

    coreSigner = new BundleSigner(coreKeys);
    edgeSigner = new BundleSigner(edgeKeys);

    // Initialize exporters/importers
    coreExporter = new BundleExporter({
      pgPool: corePool,
      signer: coreSigner,
      deploymentId: 'core-test',
      deploymentName: 'Core Test',
      environment: 'core',
      classification: 'UNCLASSIFIED',
    });

    edgeImporter = new BundleImporter({
      pgPool: edgePool,
      signer: coreSigner, // Edge uses core's signer to verify
      deploymentId: 'edge-test',
      deploymentName: 'Edge Test',
      environment: 'edge',
      classification: 'UNCLASSIFIED',
    });

    // Create test schemas
    await setupTestSchema(corePool);
    await setupTestSchema(edgePool);
  });

  afterAll(async () => {
    await corePool.end();
    await edgePool.end();
  });

  beforeEach(async () => {
    // Clear test data
    await clearTestData(corePool);
    await clearTestData(edgePool);
  });

  describe('Export-Import Flow', () => {
    it('should export and import a bundle successfully', async () => {
      // Arrange: Create test data in core
      await createTestCase(corePool, 'test-case-001', 'Test Case 1');
      await createTestEntity(corePool, 'entity-001', 'Test Entity', 'person');

      const exportRequest: ExportRequest = {
        scope: {
          cases: ['test-case-001'],
          includeEvidence: false,
          includeAnalytics: false,
        },
        direction: 'pull_down',
        requester: 'test-operator',
        reason: 'Integration test',
        dryRun: false,
        expiresIn: 3600,
      };

      // Act: Export from core
      const exportResult = await coreExporter.exportBundle(exportRequest);

      // Assert: Export succeeded
      expect(exportResult.success).toBe(true);
      expect(exportResult.statistics.casesExported).toBe(1);
      expect(exportResult.errors).toEqual([]);

      // Create bundle object for import
      const bundle: SyncBundle = {
        manifest: exportResult.manifest,
        content: {
          cases: [
            {
              id: 'test-case-001',
              name: 'Test Case 1',
              status: 'open',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          entities: [],
          relationships: [],
          evidence: [],
          analytics: [],
          provenance: [],
          auditRecords: [],
        },
        checksums: exportResult.checksums,
        signatures: exportResult.signatures,
      };

      // Act: Import to edge
      const importRequest: ImportRequest = {
        bundleData: bundle,
        verifySignatures: true,
        dryRun: false,
        conflictResolution: 'abort',
        requester: 'test-operator',
        reason: 'Integration test import',
      };

      const importResult = await edgeImporter.importBundle(importRequest);

      // Assert: Import succeeded
      expect(importResult.success).toBe(true);
      expect(importResult.statistics.casesImported).toBe(1);
      expect(importResult.errors).toEqual([]);

      // Verify data in edge database
      const edgeCases = await edgePool.query(
        'SELECT * FROM cases WHERE id = $1',
        ['test-case-001'],
      );
      expect(edgeCases.rows).toHaveLength(1);
      expect(edgeCases.rows[0].name).toBe('Test Case 1');
    });

    it('should handle conflicts with skip strategy', async () => {
      // Arrange: Create same case in both core and edge
      await createTestCase(corePool, 'test-case-002', 'Core Version');
      await createTestCase(edgePool, 'test-case-002', 'Edge Version');

      const exportRequest: ExportRequest = {
        scope: {
          cases: ['test-case-002'],
          includeEvidence: false,
        },
        direction: 'pull_down',
        requester: 'test-operator',
        reason: 'Conflict test',
        dryRun: false,
        expiresIn: 3600,
      };

      const exportResult = await coreExporter.exportBundle(exportRequest);

      const bundle: SyncBundle = {
        manifest: exportResult.manifest,
        content: {
          cases: [
            {
              id: 'test-case-002',
              name: 'Core Version',
              status: 'open',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          entities: [],
          relationships: [],
          evidence: [],
          analytics: [],
          provenance: [],
          auditRecords: [],
        },
        checksums: exportResult.checksums,
        signatures: exportResult.signatures,
      };

      // Act: Import with skip conflict resolution
      const importRequest: ImportRequest = {
        bundleData: bundle,
        verifySignatures: true,
        dryRun: false,
        conflictResolution: 'skip',
        requester: 'test-operator',
        reason: 'Conflict test import',
      };

      const importResult = await edgeImporter.importBundle(importRequest);

      // Assert: Import succeeded but skipped conflicting case
      expect(importResult.success).toBe(true);
      expect(importResult.statistics.casesSkipped).toBe(1);
      expect(importResult.statistics.casesImported).toBe(0);
      expect(importResult.statistics.conflicts).toBe(1);

      // Verify original edge data unchanged
      const edgeCases = await edgePool.query(
        'SELECT * FROM cases WHERE id = $1',
        ['test-case-002'],
      );
      expect(edgeCases.rows[0].name).toBe('Edge Version');
    });

    it('should reject bundle with invalid signature', async () => {
      // Arrange: Create bundle signed with different key
      await createTestCase(corePool, 'test-case-003', 'Test Case 3');

      const exportRequest: ExportRequest = {
        scope: {
          cases: ['test-case-003'],
          includeEvidence: false,
        },
        direction: 'pull_down',
        requester: 'test-operator',
        reason: 'Signature test',
        dryRun: false,
        expiresIn: 3600,
      };

      const exportResult = await coreExporter.exportBundle(exportRequest);

      // Tamper with bundle content
      const tamperedBundle: SyncBundle = {
        manifest: exportResult.manifest,
        content: {
          cases: [
            {
              id: 'test-case-003',
              name: 'TAMPERED DATA',
              status: 'open',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          entities: [],
          relationships: [],
          evidence: [],
          analytics: [],
          provenance: [],
          auditRecords: [],
        },
        checksums: exportResult.checksums, // Original checksums
        signatures: exportResult.signatures, // Original signature
      };

      // Act: Attempt import
      const importRequest: ImportRequest = {
        bundleData: tamperedBundle,
        verifySignatures: true,
        dryRun: false,
        conflictResolution: 'abort',
        requester: 'test-operator',
        reason: 'Signature test import',
      };

      const importResult = await edgeImporter.importBundle(importRequest);

      // Assert: Import failed due to invalid checksum
      expect(importResult.success).toBe(false);
      expect(importResult.verification.checksumValid).toBe(false);
      expect(importResult.statistics.casesImported).toBe(0);
    });

    it('should support dry-run mode without persisting changes', async () => {
      // Arrange
      await createTestCase(corePool, 'test-case-004', 'Test Case 4');

      const exportRequest: ExportRequest = {
        scope: {
          cases: ['test-case-004'],
          includeEvidence: false,
        },
        direction: 'pull_down',
        requester: 'test-operator',
        reason: 'Dry run test',
        dryRun: false,
        expiresIn: 3600,
      };

      const exportResult = await coreExporter.exportBundle(exportRequest);

      const bundle: SyncBundle = {
        manifest: exportResult.manifest,
        content: {
          cases: [
            {
              id: 'test-case-004',
              name: 'Test Case 4',
              status: 'open',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          entities: [],
          relationships: [],
          evidence: [],
          analytics: [],
          provenance: [],
          auditRecords: [],
        },
        checksums: exportResult.checksums,
        signatures: exportResult.signatures,
      };

      // Act: Import in dry-run mode
      const importRequest: ImportRequest = {
        bundleData: bundle,
        verifySignatures: true,
        dryRun: true, // Dry run!
        conflictResolution: 'abort',
        requester: 'test-operator',
        reason: 'Dry run test import',
      };

      const importResult = await edgeImporter.importBundle(importRequest);

      // Assert: Import successful but no data persisted
      expect(importResult.success).toBe(true);
      expect(importResult.dryRun).toBe(true);

      // Verify no data in edge database
      const edgeCases = await edgePool.query(
        'SELECT * FROM cases WHERE id = $1',
        ['test-case-004'],
      );
      expect(edgeCases.rows).toHaveLength(0);
    });
  });
});

// ==============================================================================
// Test Helpers
// ==============================================================================

async function setupTestSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50),
      tenant_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS entities (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      name VARCHAR(255),
      properties JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      source_id VARCHAR(255),
      target_id VARCHAR(255),
      properties JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id VARCHAR(255) PRIMARY KEY,
      case_id VARCHAR(255),
      source_ref VARCHAR(255),
      checksum VARCHAR(64),
      checksum_algorithm VARCHAR(50),
      content_type VARCHAR(100),
      file_size BIGINT,
      transform_chain JSONB,
      license_id VARCHAR(255),
      policy_labels JSONB,
      authority_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB
    );

    CREATE TABLE IF NOT EXISTS case_entities (
      case_id VARCHAR(255),
      entity_id VARCHAR(255),
      PRIMARY KEY (case_id, entity_id)
    );

    CREATE TABLE IF NOT EXISTS case_evidence (
      case_id VARCHAR(255),
      evidence_id VARCHAR(255),
      added_by VARCHAR(255),
      PRIMARY KEY (case_id, evidence_id)
    );

    CREATE TABLE IF NOT EXISTS provenance_chains (
      id VARCHAR(255) PRIMARY KEY,
      claim_id VARCHAR(255),
      transforms JSONB,
      sources JSONB,
      lineage JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      authority_id VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS sync_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bundle_id VARCHAR(255),
      operation VARCHAR(50),
      actor VARCHAR(255),
      source_deployment VARCHAR(255),
      target_deployment VARCHAR(255),
      scope JSONB,
      result VARCHAR(50),
      statistics JSONB,
      errors JSONB,
      reason TEXT,
      classification VARCHAR(50),
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bundle_id VARCHAR(255),
      type VARCHAR(50),
      resource_type VARCHAR(50),
      resource_id VARCHAR(255),
      existing_data JSONB,
      incoming_data JSONB,
      detected_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolution VARCHAR(50),
      resolved_by VARCHAR(255)
    );
  `);
}

async function clearTestData(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE cases CASCADE;
    TRUNCATE TABLE entities CASCADE;
    TRUNCATE TABLE relationships CASCADE;
    TRUNCATE TABLE evidence CASCADE;
    TRUNCATE TABLE case_entities CASCADE;
    TRUNCATE TABLE case_evidence CASCADE;
    TRUNCATE TABLE provenance_chains CASCADE;
    TRUNCATE TABLE sync_audit_log CASCADE;
    TRUNCATE TABLE sync_conflicts CASCADE;
  `);
}

async function createTestCase(
  pool: Pool,
  id: string,
  name: string,
): Promise<void> {
  await pool.query(
    'INSERT INTO cases (id, name, status) VALUES ($1, $2, $3)',
    [id, name, 'open'],
  );
}

async function createTestEntity(
  pool: Pool,
  id: string,
  name: string,
  type: string,
): Promise<void> {
  await pool.query(
    'INSERT INTO entities (id, name, type) VALUES ($1, $2, $3)',
    [id, name, type],
  );
}
