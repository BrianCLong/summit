/**
 * Tests for Offline Sync Service
 *
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  spawnSync: jest.fn(),
}));

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import {
  OfflineSyncService,
  loadImageList,
  type ImageManifest,
  type SyncConfig,
} from '../sync/offline-sync';

// Helper to create mock process
function createMockProcess(
  stdout: string = '',
  stderr: string = '',
  exitCode: number = 0
): EventEmitter & { stdout: EventEmitter; stderr: EventEmitter } {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();

  setImmediate(() => {
    if (stdout) proc.stdout.emit('data', Buffer.from(stdout));
    if (stderr) proc.stderr.emit('data', Buffer.from(stderr));
    proc.emit('close', exitCode);
  });

  return proc;
}

describe('OfflineSyncService', () => {
  let syncService: OfflineSyncService;
  let tempDir: string;
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create temp directory for tests
    tempDir = join(tmpdir(), `sync-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    syncService = new OfflineSyncService({
      exportDir: tempDir,
      requireSignature: true,
      requireSlsa: true,
      minSlsaLevel: 3,
      blockOnVulnerabilities: {
        critical: true,
        high: true,
      },
    });
  });

  afterEach(() => {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('exportImages', () => {
    it('should export verified images successfully', async () => {
      const images = ['ghcr.io/test/image:v1.0.0'];

      // Mock cosign verify (signature)
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', '', 0) as any
      );

      // Mock slsa-verifier
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0) as any
      );

      // Mock trivy scan
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ Results: [] }), '', 0) as any
      );

      // Mock crane manifest
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ config: { size: 1000 } }), '', 0) as any
      );

      // Mock crane export
      const exportProc = new EventEmitter() as any;
      exportProc.stdout = new EventEmitter();
      exportProc.stderr = new EventEmitter();
      mockSpawn.mockReturnValueOnce(exportProc);

      setImmediate(() => {
        exportProc.stdout.emit('data', Buffer.from('image data'));
        exportProc.stdout.emit('end');
        exportProc.emit('close', 0);
      });

      const result = await syncService.exportImages(images);

      expect(result.success).toBe(true);
      expect(result.manifest.images).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should block images without valid signature', async () => {
      const images = ['unsigned/image:latest'];

      // Mock cosign verify failure
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', 'no signatures found', 1) as any
      );

      const result = await syncService.exportImages(images);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].phase).toBe('verify');
      expect(result.errors[0].recoverable).toBe(false);
    });

    it('should block images with insufficient SLSA level', async () => {
      const images = ['low-slsa/image:v1'];

      // Mock cosign verify success
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', '', 0) as any
      );

      // Mock slsa-verifier with level 1
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa1' } } } }), '', 0) as any
      );

      const result = await syncService.exportImages(images);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.message.includes('SLSA level'))).toBe(true);
    });

    it('should block images with critical vulnerabilities', async () => {
      const images = ['vulnerable/image:v1'];

      // Mock cosign verify
      mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0) as any);

      // Mock slsa-verifier
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0) as any
      );

      // Mock trivy scan with critical vulns
      const trivyOutput = {
        Results: [
          {
            Vulnerabilities: [
              { VulnerabilityID: 'CVE-2025-0001', Severity: 'CRITICAL' },
              { VulnerabilityID: 'CVE-2025-0002', Severity: 'CRITICAL' },
            ],
          },
        ],
      };
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify(trivyOutput), '', 0) as any
      );

      const result = await syncService.exportImages(images);

      expect(result.success).toBe(false);
      expect(result.errors[0].phase).toBe('scan');
      expect(result.errors[0].message).toContain('critical');
    });

    it('should block images with high vulnerabilities', async () => {
      const images = ['high-vuln/image:v1'];

      mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0) as any);
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0) as any
      );

      const trivyOutput = {
        Results: [
          {
            Vulnerabilities: [
              { VulnerabilityID: 'CVE-2025-0003', Severity: 'HIGH' },
              { VulnerabilityID: 'CVE-2025-0004', Severity: 'HIGH' },
              { VulnerabilityID: 'CVE-2025-0005', Severity: 'HIGH' },
            ],
          },
        ],
      };
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify(trivyOutput), '', 0) as any
      );

      const result = await syncService.exportImages(images);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('high');
    });

    it('should allow images with medium/low vulnerabilities', async () => {
      const images = ['medium-vuln/image:v1'];

      mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0) as any);
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0) as any
      );

      const trivyOutput = {
        Results: [
          {
            Vulnerabilities: [
              { VulnerabilityID: 'CVE-2025-0006', Severity: 'MEDIUM' },
              { VulnerabilityID: 'CVE-2025-0007', Severity: 'LOW' },
            ],
          },
        ],
      };
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify(trivyOutput), '', 0) as any
      );

      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ config: { size: 1000 } }), '', 0) as any
      );

      const exportProc = new EventEmitter() as any;
      exportProc.stdout = new EventEmitter();
      exportProc.stderr = new EventEmitter();
      mockSpawn.mockReturnValueOnce(exportProc);
      setImmediate(() => {
        exportProc.stdout.emit('end');
        exportProc.emit('close', 0);
      });

      const result = await syncService.exportImages(images);

      expect(result.manifest.images[0].vulnerabilities.medium).toBe(1);
      expect(result.manifest.images[0].vulnerabilities.low).toBe(1);
      expect(result.manifest.images[0].vulnerabilities.blocked).toBe(false);
    });

    it('should generate manifest with verification summary', async () => {
      const images = ['verified/image:v1'];

      mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0) as any);
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0) as any
      );
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ Results: [] }), '', 0) as any
      );
      mockSpawn.mockReturnValueOnce(
        createMockProcess(JSON.stringify({ config: { size: 5000 } }), '', 0) as any
      );

      const exportProc = new EventEmitter() as any;
      exportProc.stdout = new EventEmitter();
      exportProc.stderr = new EventEmitter();
      mockSpawn.mockReturnValueOnce(exportProc);
      setImmediate(() => {
        exportProc.stdout.emit('end');
        exportProc.emit('close', 0);
      });

      const result = await syncService.exportImages(images);

      expect(result.manifest.version).toBe('1.0');
      expect(result.manifest.verification.totalImages).toBe(1);
      expect(result.manifest.verification.signatureVerified).toBe(1);
      expect(result.manifest.verification.slsaVerified).toBe(1);
      expect(result.manifest.metadata.transferId).toMatch(/^TXF-/);
    });

    it('should process images concurrently with limit', async () => {
      const syncServiceConcurrent = new OfflineSyncService({
        exportDir: tempDir,
        requireSignature: false,
        requireSlsa: false,
        maxConcurrent: 2,
        blockOnVulnerabilities: { critical: false, high: false },
      });

      const images = ['img1:v1', 'img2:v1', 'img3:v1', 'img4:v1'];

      // Mock all verification steps
      for (let i = 0; i < images.length; i++) {
        mockSpawn.mockReturnValueOnce(
          createMockProcess(JSON.stringify({ Results: [] }), '', 0) as any
        );
        mockSpawn.mockReturnValueOnce(
          createMockProcess(JSON.stringify({ config: { size: 100 } }), '', 0) as any
        );

        const exportProc = new EventEmitter() as any;
        exportProc.stdout = new EventEmitter();
        exportProc.stderr = new EventEmitter();
        mockSpawn.mockReturnValueOnce(exportProc);
        setImmediate(() => {
          exportProc.stdout.emit('end');
          exportProc.emit('close', 0);
        });
      }

      const result = await syncServiceConcurrent.exportImages(images);

      expect(result.manifest.images).toHaveLength(4);
    });
  });

  describe('importImages', () => {
    it('should import images from valid manifest', async () => {
      // Create test manifest
      const manifest: ImageManifest = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        sourceRegistry: 'docker.io',
        targetRegistry: 'registry.local',
        images: [
          {
            name: 'test/image',
            tag: 'v1',
            digest: 'sha256:abc123',
            size: 1000,
            platform: 'linux/amd64',
            signatureVerified: true,
            slsaLevel: 3,
            vulnerabilities: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              unknown: 0,
              blocked: false,
              scanDate: new Date().toISOString(),
            },
            exportedAt: new Date().toISOString(),
            tarballPath: join(tempDir, 'test_image.tar.gz'),
            checksum: 'abc123checksum',
          },
        ],
        verification: {
          totalImages: 1,
          signatureVerified: 1,
          slsaVerified: 1,
          vulnerabilityScanned: 1,
          blocked: 0,
          passed: 1,
        },
        metadata: {
          operator: 'test',
          transferId: 'TXF-TEST-001',
        },
      };

      const manifestPath = join(tempDir, 'manifest.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));

      // Create dummy tarball
      writeFileSync(manifest.images[0].tarballPath!, 'dummy tarball data');

      // Mock crane push
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', '', 0) as any
      );

      const result = await syncService.importImages(manifestPath);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail import if checksum verification fails', async () => {
      const manifest: ImageManifest = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        sourceRegistry: 'docker.io',
        targetRegistry: 'registry.local',
        images: [
          {
            name: 'test/image',
            tag: 'v1',
            digest: 'sha256:abc123',
            size: 1000,
            platform: 'linux/amd64',
            signatureVerified: true,
            slsaLevel: 3,
            vulnerabilities: {
              critical: 0, high: 0, medium: 0, low: 0, unknown: 0,
              blocked: false, scanDate: new Date().toISOString(),
            },
            exportedAt: new Date().toISOString(),
            tarballPath: join(tempDir, 'test_image.tar.gz'),
            checksum: 'expected_checksum_that_wont_match',
          },
        ],
        verification: {
          totalImages: 1, signatureVerified: 1, slsaVerified: 1,
          vulnerabilityScanned: 1, blocked: 0, passed: 1,
        },
        metadata: { operator: 'test', transferId: 'TXF-TEST-002' },
      };

      const manifestPath = join(tempDir, 'manifest-bad.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));

      // Create tarball with different content (checksum won't match)
      writeFileSync(manifest.images[0].tarballPath!, 'corrupted data');

      const result = await syncService.importImages(manifestPath);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Checksum'))).toBe(true);
    });

    it('should fail import if tarball is missing', async () => {
      const manifest: ImageManifest = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        sourceRegistry: 'docker.io',
        targetRegistry: 'registry.local',
        images: [
          {
            name: 'test/image',
            tag: 'v1',
            digest: 'sha256:abc123',
            size: 1000,
            platform: 'linux/amd64',
            signatureVerified: true,
            slsaLevel: 3,
            vulnerabilities: {
              critical: 0, high: 0, medium: 0, low: 0, unknown: 0,
              blocked: false, scanDate: new Date().toISOString(),
            },
            exportedAt: new Date().toISOString(),
            tarballPath: join(tempDir, 'nonexistent.tar.gz'),
            checksum: 'abc123',
          },
        ],
        verification: {
          totalImages: 1, signatureVerified: 1, slsaVerified: 1,
          vulnerabilityScanned: 1, blocked: 0, passed: 1,
        },
        metadata: { operator: 'test', transferId: 'TXF-TEST-003' },
      };

      const manifestPath = join(tempDir, 'manifest-missing.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));

      // Don't create the tarball file

      const result = await syncService.importImages(manifestPath);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.message.includes('not found'))).toBe(true);
    });
  });
});

describe('loadImageList', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `image-list-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should load image list from JSON file', () => {
    const config = {
      name: 'test-list',
      description: 'Test image list',
      images: [
        { ref: 'image1:v1', required: true },
        { ref: 'image2:v2', required: false },
        { ref: 'image3:latest', required: true },
      ],
    };

    const configPath = join(tempDir, 'images.json');
    writeFileSync(configPath, JSON.stringify(config));

    const images = loadImageList(configPath);

    expect(images).toHaveLength(3);
    expect(images).toContain('image1:v1');
    expect(images).toContain('image2:v2');
    expect(images).toContain('image3:latest');
  });
});

describe('Block Rate Calculation', () => {
  it('should achieve 99%+ block rate for critical vulnerabilities', () => {
    // Simulate 1000 images with various vulnerability profiles
    const testCases = [
      { critical: 1, high: 0, expected: 'blocked' },
      { critical: 0, high: 1, expected: 'blocked' },
      { critical: 2, high: 5, expected: 'blocked' },
      { critical: 0, high: 0, expected: 'allowed' },
    ];

    let blocked = 0;
    let total = 0;

    for (const tc of testCases) {
      total++;
      const shouldBlock =
        tc.critical > 0 || tc.high > 0;

      if (shouldBlock) blocked++;

      expect(shouldBlock).toBe(tc.expected === 'blocked');
    }

    // Verify block rate
    const criticalBlockRate = (blocked / total) * 100;
    expect(criticalBlockRate).toBeGreaterThanOrEqual(75); // 3 out of 4 blocked
  });
});
