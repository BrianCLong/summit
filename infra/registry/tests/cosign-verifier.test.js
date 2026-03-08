"use strict";
/**
 * Tests for Cosign Signature Verifier
 *
 * @jest-environment node
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = require("fs");
const path_1 = require("path");
// Mock child_process before importing the module
globals_1.jest.mock('child_process', () => ({
    spawn: globals_1.jest.fn(),
}));
const child_process_1 = require("child_process");
const events_1 = require("events");
// Import after mocking
const cosign_verifier_1 = require("../cosign/cosign-verifier");
// Helper to create mock spawn process
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
(0, globals_1.describe)('CosignVerifier', () => {
    let verifier;
    const mockSpawn = child_process_1.spawn;
    const cacheDir = '/tmp/cosign-test';
    const rekorStore = (0, path_1.join)(cacheDir, 'rekor-entries.json');
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        (0, fs_1.rmSync)(cacheDir, { recursive: true, force: true });
        (0, fs_1.mkdirSync)(cacheDir, { recursive: true });
        verifier = new cosign_verifier_1.CosignVerifier({
            cosignBinaryPath: '/usr/local/bin/cosign',
            timeout: 5000,
            cacheDir,
            rekorUuidStorePath: rekorStore,
        });
    });
    (0, globals_1.describe)('verifyImage', () => {
        (0, globals_1.it)('should verify a properly signed image', async () => {
            // Mock successful signature verification
            const signatureOutput = JSON.stringify([
                {
                    critical: {
                        identity: {
                            'docker-reference': 'ghcr.io/test/image',
                        },
                    },
                    optional: {
                        Issuer: 'https://token.actions.githubusercontent.com',
                        Subject: 'https://github.com/test/repo/.github/workflows/release.yml@refs/heads/main',
                        Bundle: {
                            SignedEntryTimestamp: new Date().toISOString(),
                        },
                    },
                },
            ]);
            // Mock crane digest
            mockSpawn.mockReturnValueOnce(createMockProcess('sha256:abc123def456', '', 0));
            // Mock cosign verify
            mockSpawn.mockReturnValueOnce(createMockProcess(signatureOutput, '', 0));
            const result = await verifier.verifyImage('ghcr.io/test/image:v1.0.0');
            (0, globals_1.expect)(result.verified).toBe(true);
            (0, globals_1.expect)(result.signatures.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should reject unsigned images when signatures required', async () => {
            // Mock crane digest
            mockSpawn.mockReturnValueOnce(createMockProcess('sha256:abc123def456', '', 0));
            // Mock cosign verify failure
            mockSpawn.mockReturnValueOnce(createMockProcess('', 'no signatures found', 1));
            const result = await verifier.verifyImage('docker.io/malicious/image:latest');
            (0, globals_1.expect)(result.verified).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.code === 'NO_VALID_SIGNATURES')).toBe(true);
        });
        (0, globals_1.it)('should handle digest resolution failure', async () => {
            // Mock crane digest failure
            mockSpawn.mockReturnValueOnce(createMockProcess('', 'image not found', 1));
            const result = await verifier.verifyImage('nonexistent/image:v1');
            (0, globals_1.expect)(result.verified).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.code === 'DIGEST_RESOLUTION_FAILED')).toBe(true);
        });
        (0, globals_1.it)('should cache successful verification results', async () => {
            // Mock successful verification
            mockSpawn.mockReturnValueOnce(createMockProcess('sha256:abc123', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess('[]', '', 0));
            // First call
            await verifier.verifyImage('cached/image:v1');
            // Second call - should use cache
            const result = await verifier.verifyImage('cached/image:v1');
            // spawn should only be called twice (for first verification)
            (0, globals_1.expect)(mockSpawn).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should extract signature information correctly', async () => {
            const signatureOutput = JSON.stringify([
                {
                    critical: {
                        identity: {
                            'docker-reference': 'ghcr.io/sigstore/cosign',
                        },
                    },
                    optional: {
                        Issuer: 'https://accounts.google.com',
                        Subject: 'keyless@sigstore.dev',
                        Bundle: {
                            SignedEntryTimestamp: '2025-01-15T10:00:00Z',
                        },
                    },
                },
            ]);
            mockSpawn.mockReturnValueOnce(createMockProcess('sha256:def456', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess(signatureOutput, '', 0));
            const result = await verifier.verifyImage('ghcr.io/sigstore/cosign:v2');
            (0, globals_1.expect)(result.signatures[0].issuer).toBe('https://accounts.google.com');
            (0, globals_1.expect)(result.signatures[0].subject).toBe('keyless@sigstore.dev');
        });
        (0, globals_1.it)('should fall back to managed key verification and persist Rekor UUIDs', async () => {
            const managedSignatureOutput = JSON.stringify([
                {
                    critical: {
                        identity: { 'docker-reference': 'ghcr.io/test/managed' },
                    },
                    optional: {
                        Issuer: 'https://managed-issuer',
                        Subject: 'managed@issuer',
                        Bundle: {
                            SignedEntryTimestamp: '2025-01-01T00:00:00Z',
                            Payload: {
                                logIndex: 42,
                                logID: { uuid: 'rekor-uuid-123' },
                                integratedTime: 123456,
                            },
                        },
                    },
                },
            ]);
            const verifierWithManagedKey = new cosign_verifier_1.CosignVerifier({
                cosignBinaryPath: '/usr/local/bin/cosign',
                cacheDir,
                rekorUuidStorePath: rekorStore,
            }, {
                trustedKeyRefs: ['managed.pub'],
                trustedIssuers: ['https://token.actions.githubusercontent.com'],
            });
            mockSpawn.mockReturnValueOnce(createMockProcess('sha256:fallback', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess('', 'keyless failed', 1));
            mockSpawn.mockReturnValueOnce(createMockProcess(managedSignatureOutput, '', 0));
            const result = await verifierWithManagedKey.verifyImage('ghcr.io/test/managed:v1');
            (0, globals_1.expect)(result.verified).toBe(true);
            (0, globals_1.expect)(result.usedManagedFallback).toBe(true);
            (0, globals_1.expect)(result.rekorEntries[0].uuid).toBe('rekor-uuid-123');
            (0, globals_1.expect)(result.errors.some((error) => error.code === 'KEYLESS_FALLBACK_USED')).toBe(true);
            (0, globals_1.expect)((0, fs_1.existsSync)(rekorStore)).toBe(true);
            const persisted = JSON.parse((0, fs_1.readFileSync)(rekorStore, 'utf-8'));
            (0, globals_1.expect)(persisted[0].entries[0].uuid).toBe('rekor-uuid-123');
        });
    });
    (0, globals_1.describe)('verifyImage with custom policy', () => {
        (0, globals_1.it)('should respect trusted issuers configuration', async () => {
            const customPolicy = {
                trustedIssuers: ['https://token.actions.githubusercontent.com'],
                requireSignature: true,
            };
            const verifierWithPolicy = new cosign_verifier_1.CosignVerifier({}, customPolicy);
            mockSpawn.mockReturnValueOnce(createMockProcess('sha256:abc123', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess('[]', '', 0));
            const result = await verifierWithPolicy.verifyImage('test/image:v1');
            // Should have called cosign with the trusted issuer
            (0, globals_1.expect)(mockSpawn).toHaveBeenCalledWith(globals_1.expect.any(String), globals_1.expect.arrayContaining([
                globals_1.expect.stringContaining('--certificate-oidc-issuer'),
            ]), globals_1.expect.any(Object));
        });
    });
});
(0, globals_1.describe)('CosignAdmissionController', () => {
    let controller;
    let mockVerifier;
    const mockSpawn = child_process_1.spawn;
    const cacheDir = '/tmp/cosign-admission-cache';
    const rekorStore = (0, path_1.join)(cacheDir, 'rekor-entries.json');
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        (0, fs_1.rmSync)(cacheDir, { recursive: true, force: true });
        (0, fs_1.mkdirSync)(cacheDir, { recursive: true });
        mockVerifier = new cosign_verifier_1.CosignVerifier({
            timeout: 5000,
            cacheDir,
            rekorUuidStorePath: rekorStore,
        });
        controller = new cosign_verifier_1.CosignAdmissionController(mockVerifier, ['kube-system']);
    });
    (0, globals_1.describe)('review', () => {
        (0, globals_1.it)('should allow pods with verified images', async () => {
            // Mock successful verification
            mockSpawn.mockReturnValue(createMockProcess('sha256:abc123', '', 0));
            const request = {
                uid: 'test-uid',
                kind: { group: '', version: 'v1', kind: 'Pod' },
                resource: { group: '', version: 'v1', resource: 'pods' },
                name: 'test-pod',
                namespace: 'default',
                operation: 'CREATE',
                object: {
                    spec: {
                        containers: [{ image: 'verified/image:v1' }],
                    },
                },
            };
            const response = await controller.review(request);
            (0, globals_1.expect)(response.allowed).toBe(true);
            (0, globals_1.expect)(response.uid).toBe('test-uid');
        });
        (0, globals_1.it)('should deny pods with unverified images', async () => {
            // Mock failed verification
            mockSpawn.mockReturnValueOnce(createMockProcess('sha256:abc123', '', 0));
            mockSpawn.mockReturnValueOnce(createMockProcess('', 'verification failed', 1));
            const request = {
                uid: 'test-uid-2',
                kind: { group: '', version: 'v1', kind: 'Pod' },
                resource: { group: '', version: 'v1', resource: 'pods' },
                name: 'malicious-pod',
                namespace: 'default',
                operation: 'CREATE',
                object: {
                    spec: {
                        containers: [{ image: 'unverified/image:latest' }],
                    },
                },
            };
            const response = await controller.review(request);
            (0, globals_1.expect)(response.allowed).toBe(false);
            (0, globals_1.expect)(response.status?.code).toBe(403);
            (0, globals_1.expect)(response.status?.message).toContain('verification failed');
        });
        (0, globals_1.it)('should skip verification for exempt namespaces', async () => {
            const request = {
                uid: 'test-uid-3',
                kind: { group: '', version: 'v1', kind: 'Pod' },
                resource: { group: '', version: 'v1', resource: 'pods' },
                name: 'system-pod',
                namespace: 'kube-system',
                operation: 'CREATE',
                object: {
                    spec: {
                        containers: [{ image: 'any/image:v1' }],
                    },
                },
            };
            const response = await controller.review(request);
            (0, globals_1.expect)(response.allowed).toBe(true);
            (0, globals_1.expect)(response.warnings).toContain('Namespace kube-system is exempt from verification');
            // spawn should not be called for exempt namespace
            (0, globals_1.expect)(mockSpawn).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should verify both containers and initContainers', async () => {
            mockSpawn.mockReturnValue(createMockProcess('sha256:abc123', '', 0));
            const request = {
                uid: 'test-uid-4',
                kind: { group: '', version: 'v1', kind: 'Pod' },
                resource: { group: '', version: 'v1', resource: 'pods' },
                name: 'multi-container-pod',
                namespace: 'default',
                operation: 'CREATE',
                object: {
                    spec: {
                        initContainers: [{ image: 'init/image:v1' }],
                        containers: [
                            { image: 'main/image:v1' },
                            { image: 'sidecar/image:v1' },
                        ],
                    },
                },
            };
            await controller.review(request);
            // Should verify all 3 unique images
            (0, globals_1.expect)(mockSpawn.mock.calls.length).toBeGreaterThanOrEqual(3);
        });
        (0, globals_1.it)('should deduplicate images', async () => {
            mockSpawn.mockReturnValue(createMockProcess('sha256:abc123', '', 0));
            const request = {
                uid: 'test-uid-5',
                kind: { group: '', version: 'v1', kind: 'Pod' },
                resource: { group: '', version: 'v1', resource: 'pods' },
                name: 'duplicate-image-pod',
                namespace: 'default',
                operation: 'CREATE',
                object: {
                    spec: {
                        containers: [
                            { image: 'same/image:v1' },
                            { image: 'same/image:v1' },
                            { image: 'same/image:v1' },
                        ],
                    },
                },
            };
            await controller.review(request);
            // Should only verify once despite 3 containers with same image
            // (2 calls: crane digest + cosign verify)
            (0, globals_1.expect)(mockSpawn.mock.calls.length).toBe(2);
        });
    });
});
(0, globals_1.describe)('Integration scenarios', () => {
    const mockSpawn = child_process_1.spawn;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should handle real-world GitHub Actions signed image', async () => {
        const verifier = new cosign_verifier_1.CosignVerifier({
            cosignBinaryPath: '/usr/local/bin/cosign',
        }, {
            trustedIssuers: ['https://token.actions.githubusercontent.com'],
        });
        // Simulate GitHub Actions signed image
        const ghActionSignature = JSON.stringify([{
                critical: {
                    identity: {
                        'docker-reference': 'ghcr.io/owner/repo',
                    },
                },
                optional: {
                    Issuer: 'https://token.actions.githubusercontent.com',
                    Subject: 'https://github.com/owner/repo/.github/workflows/build.yml@refs/heads/main',
                    'github_workflow_trigger': 'push',
                    'github_workflow_sha': 'abc123def456',
                    'github_workflow_ref': 'refs/heads/main',
                },
            }]);
        mockSpawn.mockReturnValueOnce(createMockProcess('sha256:fedcba987654', '', 0));
        mockSpawn.mockReturnValueOnce(createMockProcess(ghActionSignature, '', 0));
        const result = await verifier.verifyImage('ghcr.io/owner/repo:v2.0.0');
        (0, globals_1.expect)(result.verified).toBe(true);
        (0, globals_1.expect)(result.digest).toBe('sha256:fedcba987654');
    });
    (0, globals_1.it)('should reject image with wrong issuer', async () => {
        const verifier = new cosign_verifier_1.CosignVerifier({}, {
            trustedIssuers: ['https://token.actions.githubusercontent.com'],
        });
        // Wrong issuer
        const wrongIssuerSignature = JSON.stringify([{
                critical: {
                    identity: { 'docker-reference': 'evil/image' },
                },
                optional: {
                    Issuer: 'https://evil-issuer.com',
                    Subject: 'attacker@evil.com',
                },
            }]);
        mockSpawn.mockReturnValueOnce(createMockProcess('sha256:evil123', '', 0));
        mockSpawn.mockReturnValueOnce(createMockProcess('', 'issuer mismatch', 1));
        const result = await verifier.verifyImage('evil/image:latest');
        (0, globals_1.expect)(result.verified).toBe(false);
    });
});
