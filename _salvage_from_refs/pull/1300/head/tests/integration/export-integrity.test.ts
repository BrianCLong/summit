/**
 * Integration tests for deterministic export integrity verification
 * GA Core requirement: export -> unzip -> recompute hashes -> assert integrity
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DeterministicExportService, ExportRequest } from '../../server/src/services/DeterministicExportService';
import { getNeo4jDriver } from '../../server/src/config/database';
import { getPostgresPool } from '../../server/src/config/database';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

describe('Export Integrity Verification', () => {
  let exportService: DeterministicExportService;
  let neo4jSession: any;
  
  beforeEach(async () => {
    exportService = new DeterministicExportService();
    neo4jSession = getNeo4jDriver().session();
    
    // Create test data in Neo4j
    await neo4jSession.run(`
      CREATE 
        (p1:Entity {id: 'person-1', name: 'Alice Smith', type: 'PERSON', created_at: datetime('2025-01-01T00:00:00Z')}),
        (p2:Entity {id: 'person-2', name: 'Bob Jones', type: 'PERSON', created_at: datetime('2025-01-02T00:00:00Z')}),
        (o1:Entity {id: 'org-1', name: 'ACME Corp', type: 'ORG', created_at: datetime('2025-01-03T00:00:00Z')}),
        (p1)-[:RELATIONSHIP {id: 'rel-1', type: 'WORKS_FOR', created_at: datetime('2025-01-04T00:00:00Z')}]->(o1),
        (p2)-[:RELATIONSHIP {id: 'rel-2', type: 'WORKS_FOR', created_at: datetime('2025-01-05T00:00:00Z')}]->(o1)
    `);
  });
  
  afterEach(async () => {
    // Clean up test data
    await neo4jSession.run('MATCH (n) DETACH DELETE n');
    await neo4jSession.close();
    
    // Clean up test files
    const testDir = join(process.cwd(), 'tmp', 'exports');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  it('should create deterministic export with consistent hashes', async () => {
    const request: ExportRequest = {
      format: 'bundle',
      userId: 'test-user',
      includeManifest: true,
      includeProvenance: true
    };
    
    // Create first export
    const export1 = await exportService.createExportBundle(request, neo4jSession);
    
    // Create second export with same parameters
    const export2 = await exportService.createExportBundle(request, neo4jSession);
    
    // Manifests should have different IDs but same data hashes
    expect(export1.manifest.exportId).not.toBe(export2.manifest.exportId);
    expect(export1.manifest.files.length).toBe(export2.manifest.files.length);
    
    // File content hashes should be identical (deterministic ordering)
    const getFileHash = (manifest: any, filename: string) => 
      manifest.files.find((f: any) => f.filename === filename)?.sha256;
    
    expect(getFileHash(export1.manifest, 'entities.json'))
      .toBe(getFileHash(export2.manifest, 'entities.json'));
    
    expect(getFileHash(export1.manifest, 'relationships.json'))
      .toBe(getFileHash(export2.manifest, 'relationships.json'));
    
    console.log('✅ Deterministic export produces consistent hashes');
  });
  
  it('should verify export bundle integrity end-to-end', async () => {
    const request: ExportRequest = {
      format: 'bundle',
      userId: 'test-user',
      includeManifest: true,
      includeProvenance: true
    };
    
    // Step 1: Create export bundle
    const { exportId, bundlePath, manifest } = await exportService.createExportBundle(
      request, 
      neo4jSession
    );
    
    expect(existsSync(bundlePath)).toBe(true);
    expect(manifest.integrity.totalFiles).toBeGreaterThan(0);
    expect(manifest.integrity.bundleHash).toBeTruthy();
    expect(manifest.integrity.manifestHash).toBeTruthy();
    
    console.log(`📦 Created bundle: ${bundlePath}`);
    console.log(`📊 Files: ${manifest.integrity.totalFiles}, Bytes: ${manifest.integrity.totalBytes}`);
    
    // Step 2: Verify bundle integrity
    const verificationResult = await exportService.verifyExportBundle(bundlePath);
    
    expect(verificationResult.verification.verified).toBe(true);
    expect(verificationResult.verification.verificationErrors).toHaveLength(0);
    expect(verificationResult.exportId).toBe(exportId);
    
    console.log('✅ Bundle integrity verification passed');
    
    // Step 3: Assert integrity requirements
    expect(verificationResult.integrity.bundleHash).toBeTruthy();
    expect(verificationResult.integrity.manifestHash).toBeTruthy();
    expect(verificationResult.files.length).toBeGreaterThanOrEqual(3); // entities, relationships, transforms
    
    // Step 4: Verify all files have SHA256 hashes
    for (const file of verificationResult.files) {
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(file.bytes).toBeGreaterThan(0);
      expect(file.filename).toBeTruthy();
      expect(file.transforms).toBeInstanceOf(Array);
    }
    
    console.log('✅ All files have valid SHA256 hashes and metadata');
    
    // Step 5: Verify transform provenance
    expect(verificationResult.transforms.length).toBeGreaterThan(0);
    
    for (const transform of verificationResult.transforms) {
      expect(transform.id).toBeTruthy();
      expect(transform.type).toMatch(/^(REDACTION|FILTERING|ANONYMIZATION|AGGREGATION)$/);
      expect(transform.inputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(transform.outputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(transform.appliedAt).toBeTruthy();
    }
    
    console.log('✅ Transform provenance chain verified');
  });
  
  it('should detect bundle tampering', async () => {
    const request: ExportRequest = {
      format: 'bundle',
      userId: 'test-user',
      includeManifest: true
    };
    
    // Create legitimate bundle
    const { bundlePath } = await exportService.createExportBundle(request, neo4jSession);
    
    // Tamper with bundle (simulate corruption)
    const fs = await import('fs/promises');
    const originalData = await fs.readFile(bundlePath);
    const tamperedData = Buffer.concat([originalData, Buffer.from('TAMPERED')]);
    await fs.writeFile(bundlePath, tamperedData);
    
    // Verification should detect tampering
    const verificationResult = await exportService.verifyExportBundle(bundlePath);
    
    expect(verificationResult.verification.verified).toBe(false);
    expect(verificationResult.verification.verificationErrors.length).toBeGreaterThan(0);
    expect(verificationResult.verification.verificationErrors[0]).toContain('Bundle hash mismatch');
    
    console.log('✅ Bundle tampering detected successfully');
  });
  
  it('should track export metrics for GA Core dashboard', async () => {
    const pool = getPostgresPool();
    
    // Create multiple exports to generate metrics
    const requests = [
      { format: 'bundle' as const, userId: 'user1' },
      { format: 'bundle' as const, userId: 'user2' },
      { format: 'json' as const, userId: 'user3' }
    ];
    
    for (const request of requests) {
      await exportService.createExportBundle(request, neo4jSession);
    }
    
    // Check GA metrics function
    const metricsResult = await pool.query(
      'SELECT get_ga_export_metrics(1) as metrics'
    );
    
    const metrics = metricsResult.rows[0].metrics;
    
    expect(metrics.total_exports).toBeGreaterThanOrEqual(3);
    expect(metrics.manifests_with_integrity).toBeGreaterThanOrEqual(2); // Bundle exports
    expect(metrics.integrity_rate).toBeGreaterThanOrEqual(0.66); // 2/3 bundle exports
    expect(metrics.ga_threshold).toBe(0.95);
    expect(metrics.days_evaluated).toBe(1);
    
    console.log('📊 Export metrics:', JSON.stringify(metrics, null, 2));
    
    // Check real-time metrics view
    const realtimeResult = await pool.query(`
      SELECT * FROM export_metrics_realtime 
      WHERE export_date = CURRENT_DATE
    `);
    
    expect(realtimeResult.rows.length).toBeGreaterThanOrEqual(1);
    const realtime = realtimeResult.rows[0];
    
    expect(realtime.total_exports).toBeGreaterThanOrEqual(3);
    expect(realtime.bundle_exports).toBeGreaterThanOrEqual(2);
    expect(realtime.bundle_integrity_rate).toBeGreaterThan(0);
    
    console.log('✅ GA Core export metrics tracking functional');
  });
  
  it('should handle export size limits and validation', async () => {
    // Test with minimal request
    const smallRequest: ExportRequest = {
      format: 'json',
      userId: 'test-user',
      entityType: 'PERSON' // Limit to persons only
    };
    
    const export1 = await exportService.createExportBundle(smallRequest, neo4jSession);
    expect(export1.manifest.integrity.totalBytes).toBeLessThan(10 * 1024); // < 10KB
    
    // Test bundle format includes all necessary files
    const bundleRequest: ExportRequest = {
      format: 'bundle',
      userId: 'test-user',
      includeManifest: true,
      includeProvenance: true
    };
    
    const export2 = await exportService.createExportBundle(bundleRequest, neo4jSession);
    
    const requiredFiles = ['entities.json', 'relationships.json', 'transforms.json', 'entities.csv', 'relationships.csv'];
    
    for (const filename of requiredFiles) {
      const fileExists = export2.manifest.files.some(f => f.filename === filename);
      expect(fileExists).toBe(true);
    }
    
    console.log('✅ Export validation and file requirements verified');
  });
  
  it('should provide complete audit trail', async () => {
    const request: ExportRequest = {
      format: 'bundle',
      userId: 'audit-test-user',
      investigationId: 'test-investigation',
      includeProvenance: true
    };
    
    const { manifest } = await exportService.createExportBundle(request, neo4jSession);
    
    // Verify audit trail completeness
    expect(manifest.createdBy).toBe('audit-test-user');
    expect(manifest.createdAt).toBeTruthy();
    expect(manifest.request).toBeTruthy();
    
    // Verify transform chain is complete
    for (let i = 0; i < manifest.transforms.length - 1; i++) {
      const current = manifest.transforms[i];
      const next = manifest.transforms[i + 1];
      
      // Output hash of current should match input hash of next
      expect(current.outputHash).toBe(next.inputHash);
    }
    
    // Check database storage
    const pool = getPostgresPool();
    const dbResult = await pool.query(
      'SELECT * FROM export_manifests WHERE id = $1',
      [manifest.exportId]
    );
    
    expect(dbResult.rows.length).toBe(1);
    const dbRecord = dbResult.rows[0];
    
    expect(dbRecord.created_by).toBe('audit-test-user');
    expect(dbRecord.manifest_hash).toBe(manifest.integrity.manifestHash);
    expect(dbRecord.bundle_hash).toBe(manifest.integrity.bundleHash);
    expect(JSON.parse(dbRecord.transforms)).toEqual(manifest.transforms);
    
    console.log('✅ Complete audit trail verified');
  });
});

/**
 * Performance benchmark test
 */
describe('Export Performance Benchmarks', () => {
  let exportService: DeterministicExportService;
  let neo4jSession: any;
  
  beforeEach(async () => {
    exportService = new DeterministicExportService();
    neo4jSession = getNeo4jDriver().session();
    
    // Create larger dataset for performance testing
    await neo4jSession.run(`
      WITH range(1, 100) AS ids
      UNWIND ids AS id
      CREATE (p:Entity {
        id: 'perf-person-' + toString(id),
        name: 'Person ' + toString(id),
        type: 'PERSON',
        created_at: datetime('2025-01-01T00:00:00Z') + duration({hours: id})
      })
    `);
  });
  
  afterEach(async () => {
    await neo4jSession.run('MATCH (n:Entity) WHERE n.id STARTS WITH "perf-" DETACH DELETE n');
    await neo4jSession.close();
  });
  
  it('should export large datasets within performance budgets', async () => {
    const request: ExportRequest = {
      format: 'bundle',
      userId: 'perf-test-user'
    };
    
    const startTime = Date.now();
    const result = await exportService.createExportBundle(request, neo4jSession);
    const exportTime = Date.now() - startTime;
    
    // Performance assertions
    expect(exportTime).toBeLessThan(30000); // < 30 seconds
    expect(result.manifest.integrity.totalFiles).toBeGreaterThan(0);
    expect(result.manifest.integrity.totalBytes).toBeGreaterThan(0);
    
    console.log(`📊 Performance: Exported ${result.manifest.integrity.totalFiles} files (${result.manifest.integrity.totalBytes} bytes) in ${exportTime}ms`);
    
    // Verify deterministic ordering performance
    const startVerify = Date.now();
    const verification = await exportService.verifyExportBundle(result.bundlePath);
    const verifyTime = Date.now() - startVerify;
    
    expect(verifyTime).toBeLessThan(10000); // < 10 seconds verification
    expect(verification.verification.verified).toBe(true);
    
    console.log(`✅ Verification completed in ${verifyTime}ms`);
  });
});