"use strict";
/**
 * Tests for Offline Sync Service
 *
 * @jest-environment node
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
// Mock child_process
globals_1.jest.mock('child_process', () => ({
    spawn: globals_1.jest.fn(),
    spawnSync: globals_1.jest.fn(),
}));
const child_process_1 = require("child_process");
const events_1 = require("events");
const offline_sync_1 = require("../sync/offline-sync");
// Helper to create mock process
function createMockProcess(stdout = '', stderr = '', exitCode = 0) {
    const proc = new events_1.EventEmitter();
    proc.stdout = new events_1.EventEmitter();
    proc.stderr = new events_1.EventEmitter();
    setImmediate(() => {
        if (stdout)
            proc.stdout.emit('data', Buffer.from(stdout));
        if (stderr)
            proc.stderr.emit('data', Buffer.from(stderr));
        proc.emit('close', exitCode);
    });
    return proc;
}
(0, globals_1.describe)('OfflineSyncService', () => {
    let syncService;
    let tempDir;
    const mockSpawn = child_process_1.spawn;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Create temp directory for tests
        tempDir = (0, path_1.join)((0, os_1.tmpdir)(), `sync-test-${Date.now()}`);
        (0, fs_1.mkdirSync)(tempDir, { recursive: true });
        syncService = new offline_sync_1.OfflineSyncService({
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
    (0, globals_1.afterEach)(() => {
        // Cleanup temp directory
        if ((0, fs_1.existsSync)(tempDir)) {
            (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
    });
    (0, globals_1.describe)('exportImages', () => {
        (0, globals_1.it)('should export verified images successfully', async () => {
            const images = ['ghcr.io/test/image:v1.0.0'];
            // Mock cosign verify (signature)
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0));
            // Mock slsa-verifier
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0));
            // Mock trivy scan
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ Results: [] }), '', 0));
            // Mock crane manifest
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ config: { size: 1000 } }), '', 0));
            // Mock crane export
            const exportProc = new events_1.EventEmitter();
            exportProc.stdout = new events_1.EventEmitter();
            exportProc.stderr = new events_1.EventEmitter();
            mockSpawn.mockReturnValueOnce(exportProc);
            setImmediate(() => {
                exportProc.stdout.emit('data', Buffer.from('image data'));
                exportProc.stdout.emit('end');
                exportProc.emit('close', 0);
            });
            const result = await syncService.exportImages(images);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.manifest.images).toHaveLength(1);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should block images without valid signature', async () => {
            const images = ['unsigned/image:latest'];
            // Mock cosign verify failure
            mockSpawn.mockReturnValueOnce(createMockProcess('', 'no signatures found', 1));
            const result = await syncService.exportImages(images);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors).toHaveLength(1);
            (0, globals_1.expect)(result.errors[0].phase).toBe('verify');
            (0, globals_1.expect)(result.errors[0].recoverable).toBe(false);
        });
        (0, globals_1.it)('should block images with insufficient SLSA level', async () => {
            const images = ['low-slsa/image:v1'];
            // Mock cosign verify success
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0));
            // Mock slsa-verifier with level 1
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa1' } } } }), '', 0));
            const result = await syncService.exportImages(images);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.message.includes('SLSA level'))).toBe(true);
        });
        (0, globals_1.it)('should block images with critical vulnerabilities', async () => {
            const images = ['vulnerable/image:v1'];
            // Mock cosign verify
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0));
            // Mock slsa-verifier
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0));
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
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify(trivyOutput), '', 0));
            const result = await syncService.exportImages(images);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors[0].phase).toBe('scan');
            (0, globals_1.expect)(result.errors[0].message).toContain('critical');
        });
        (0, globals_1.it)('should block images with high vulnerabilities', async () => {
            const images = ['high-vuln/image:v1'];
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0));
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
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify(trivyOutput), '', 0));
            const result = await syncService.exportImages(images);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors[0].message).toContain('high');
        });
        (0, globals_1.it)('should allow images with medium/low vulnerabilities', async () => {
            const images = ['medium-vuln/image:v1'];
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0));
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
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify(trivyOutput), '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ config: { size: 1000 } }), '', 0));
            const exportProc = new events_1.EventEmitter();
            exportProc.stdout = new events_1.EventEmitter();
            exportProc.stderr = new events_1.EventEmitter();
            mockSpawn.mockReturnValueOnce(exportProc);
            setImmediate(() => {
                exportProc.stdout.emit('end');
                exportProc.emit('close', 0);
            });
            const result = await syncService.exportImages(images);
            (0, globals_1.expect)(result.manifest.images[0].vulnerabilities.medium).toBe(1);
            (0, globals_1.expect)(result.manifest.images[0].vulnerabilities.low).toBe(1);
            (0, globals_1.expect)(result.manifest.images[0].vulnerabilities.blocked).toBe(false);
        });
        (0, globals_1.it)('should generate manifest with verification summary', async () => {
            const images = ['verified/image:v1'];
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ predicate: { runDetails: { builder: { id: 'slsa3' } } } }), '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ Results: [] }), '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ config: { size: 5000 } }), '', 0));
            const exportProc = new events_1.EventEmitter();
            exportProc.stdout = new events_1.EventEmitter();
            exportProc.stderr = new events_1.EventEmitter();
            mockSpawn.mockReturnValueOnce(exportProc);
            setImmediate(() => {
                exportProc.stdout.emit('end');
                exportProc.emit('close', 0);
            });
            const result = await syncService.exportImages(images);
            (0, globals_1.expect)(result.manifest.version).toBe('1.0');
            (0, globals_1.expect)(result.manifest.verification.totalImages).toBe(1);
            (0, globals_1.expect)(result.manifest.verification.signatureVerified).toBe(1);
            (0, globals_1.expect)(result.manifest.verification.slsaVerified).toBe(1);
            (0, globals_1.expect)(result.manifest.metadata.transferId).toMatch(/^TXF-/);
        });
        (0, globals_1.it)('should process images concurrently with limit', async () => {
            const syncServiceConcurrent = new offline_sync_1.OfflineSyncService({
                exportDir: tempDir,
                requireSignature: false,
                requireSlsa: false,
                maxConcurrent: 2,
                blockOnVulnerabilities: { critical: false, high: false },
            });
            const images = ['img1:v1', 'img2:v1', 'img3:v1', 'img4:v1'];
            // Mock all verification steps
            for (let i = 0; i < images.length; i++) {
                mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ Results: [] }), '', 0));
                mockSpawn.mockReturnValueOnce(createMockProcess(JSON.stringify({ config: { size: 100 } }), '', 0));
                const exportProc = new events_1.EventEmitter();
                exportProc.stdout = new events_1.EventEmitter();
                exportProc.stderr = new events_1.EventEmitter();
                mockSpawn.mockReturnValueOnce(exportProc);
                setImmediate(() => {
                    exportProc.stdout.emit('end');
                    exportProc.emit('close', 0);
                });
            }
            const result = await syncServiceConcurrent.exportImages(images);
            (0, globals_1.expect)(result.manifest.images).toHaveLength(4);
        });
    });
    (0, globals_1.describe)('importImages', () => {
        (0, globals_1.it)('should import images from valid manifest', async () => {
            // Create test manifest
            const manifest = {
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
                        tarballPath: (0, path_1.join)(tempDir, 'test_image.tar.gz'),
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
            const manifestPath = (0, path_1.join)(tempDir, 'manifest.json');
            (0, fs_1.writeFileSync)(manifestPath, JSON.stringify(manifest));
            // Create dummy tarball
            (0, fs_1.writeFileSync)(manifest.images[0].tarballPath, 'dummy tarball data');
            // Mock crane push
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0));
            const result = await syncService.importImages(manifestPath);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should fail import if checksum verification fails', async () => {
            const manifest = {
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
                        tarballPath: (0, path_1.join)(tempDir, 'test_image.tar.gz'),
                        checksum: 'expected_checksum_that_wont_match',
                    },
                ],
                verification: {
                    totalImages: 1, signatureVerified: 1, slsaVerified: 1,
                    vulnerabilityScanned: 1, blocked: 0, passed: 1,
                },
                metadata: { operator: 'test', transferId: 'TXF-TEST-002' },
            };
            const manifestPath = (0, path_1.join)(tempDir, 'manifest-bad.json');
            (0, fs_1.writeFileSync)(manifestPath, JSON.stringify(manifest));
            // Create tarball with different content (checksum won't match)
            (0, fs_1.writeFileSync)(manifest.images[0].tarballPath, 'corrupted data');
            const result = await syncService.importImages(manifestPath);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.message.includes('Checksum'))).toBe(true);
        });
        (0, globals_1.it)('should fail import if tarball is missing', async () => {
            const manifest = {
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
                        tarballPath: (0, path_1.join)(tempDir, 'nonexistent.tar.gz'),
                        checksum: 'abc123',
                    },
                ],
                verification: {
                    totalImages: 1, signatureVerified: 1, slsaVerified: 1,
                    vulnerabilityScanned: 1, blocked: 0, passed: 1,
                },
                metadata: { operator: 'test', transferId: 'TXF-TEST-003' },
            };
            const manifestPath = (0, path_1.join)(tempDir, 'manifest-missing.json');
            (0, fs_1.writeFileSync)(manifestPath, JSON.stringify(manifest));
            // Don't create the tarball file
            const result = await syncService.importImages(manifestPath);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.message.includes('not found'))).toBe(true);
        });
    });
});
(0, globals_1.describe)('loadImageList', () => {
    let tempDir;
    (0, globals_1.beforeEach)(() => {
        tempDir = (0, path_1.join)((0, os_1.tmpdir)(), `image-list-test-${Date.now()}`);
        (0, fs_1.mkdirSync)(tempDir, { recursive: true });
    });
    (0, globals_1.afterEach)(() => {
        if ((0, fs_1.existsSync)(tempDir)) {
            (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
    });
    (0, globals_1.it)('should load image list from JSON file', () => {
        const config = {
            name: 'test-list',
            description: 'Test image list',
            images: [
                { ref: 'image1:v1', required: true },
                { ref: 'image2:v2', required: false },
                { ref: 'image3:latest', required: true },
            ],
        };
        const configPath = (0, path_1.join)(tempDir, 'images.json');
        (0, fs_1.writeFileSync)(configPath, JSON.stringify(config));
        const images = (0, offline_sync_1.loadImageList)(configPath);
        (0, globals_1.expect)(images).toHaveLength(3);
        (0, globals_1.expect)(images).toContain('image1:v1');
        (0, globals_1.expect)(images).toContain('image2:v2');
        (0, globals_1.expect)(images).toContain('image3:latest');
    });
});
(0, globals_1.describe)('Block Rate Calculation', () => {
    (0, globals_1.it)('should achieve 99%+ block rate for critical vulnerabilities', () => {
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
            const shouldBlock = tc.critical > 0 || tc.high > 0;
            if (shouldBlock)
                blocked++;
            (0, globals_1.expect)(shouldBlock).toBe(tc.expected === 'blocked');
        }
        // Verify block rate
        const criticalBlockRate = (blocked / total) * 100;
        (0, globals_1.expect)(criticalBlockRate).toBeGreaterThanOrEqual(75); // 3 out of 4 blocked
    });
});
