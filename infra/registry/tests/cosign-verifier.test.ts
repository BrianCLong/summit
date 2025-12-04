/**
 * Tests for Cosign Signature Verifier
 *
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock child_process before importing the module
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Import after mocking
import {
  CosignVerifier,
  CosignAdmissionController,
  type CosignVerificationResult,
  type VerificationPolicy,
} from '../cosign/cosign-verifier';

// Helper to create mock spawn process
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

describe('CosignVerifier', () => {
  let verifier: CosignVerifier;
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();
    verifier = new CosignVerifier({
      cosignBinaryPath: '/usr/local/bin/cosign',
      timeout: 5000,
    });
  });

  describe('verifyImage', () => {
    it('should verify a properly signed image', async () => {
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
      mockSpawn.mockReturnValueOnce(
        createMockProcess('sha256:abc123def456', '', 0) as any
      );

      // Mock cosign verify
      mockSpawn.mockReturnValueOnce(
        createMockProcess(signatureOutput, '', 0) as any
      );

      const result = await verifier.verifyImage('ghcr.io/test/image:v1.0.0');

      expect(result.verified).toBe(true);
      expect(result.signatures.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsigned images when signatures required', async () => {
      // Mock crane digest
      mockSpawn.mockReturnValueOnce(
        createMockProcess('sha256:abc123def456', '', 0) as any
      );

      // Mock cosign verify failure
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', 'no signatures found', 1) as any
      );

      const result = await verifier.verifyImage('docker.io/malicious/image:latest');

      expect(result.verified).toBe(false);
      expect(result.errors.some((e) => e.code === 'NO_VALID_SIGNATURES')).toBe(true);
    });

    it('should handle digest resolution failure', async () => {
      // Mock crane digest failure
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', 'image not found', 1) as any
      );

      const result = await verifier.verifyImage('nonexistent/image:v1');

      expect(result.verified).toBe(false);
      expect(result.errors.some((e) => e.code === 'DIGEST_RESOLUTION_FAILED')).toBe(true);
    });

    it('should cache successful verification results', async () => {
      // Mock successful verification
      mockSpawn.mockReturnValueOnce(
        createMockProcess('sha256:abc123', '', 0) as any
      );
      mockSpawn.mockReturnValueOnce(
        createMockProcess('[]', '', 0) as any
      );

      // First call
      await verifier.verifyImage('cached/image:v1');

      // Second call - should use cache
      const result = await verifier.verifyImage('cached/image:v1');

      // spawn should only be called twice (for first verification)
      expect(mockSpawn).toHaveBeenCalledTimes(2);
    });

    it('should extract signature information correctly', async () => {
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

      mockSpawn.mockReturnValueOnce(
        createMockProcess('sha256:def456', '', 0) as any
      );
      mockSpawn.mockReturnValueOnce(
        createMockProcess(signatureOutput, '', 0) as any
      );

      const result = await verifier.verifyImage('ghcr.io/sigstore/cosign:v2');

      expect(result.signatures[0].issuer).toBe('https://accounts.google.com');
      expect(result.signatures[0].subject).toBe('keyless@sigstore.dev');
    });
  });

  describe('verifyImage with custom policy', () => {
    it('should respect trusted issuers configuration', async () => {
      const customPolicy: Partial<VerificationPolicy> = {
        trustedIssuers: ['https://token.actions.githubusercontent.com'],
        requireSignature: true,
      };

      const verifierWithPolicy = new CosignVerifier({}, customPolicy);

      mockSpawn.mockReturnValueOnce(
        createMockProcess('sha256:abc123', '', 0) as any
      );
      mockSpawn.mockReturnValueOnce(
        createMockProcess('[]', '', 0) as any
      );

      const result = await verifierWithPolicy.verifyImage('test/image:v1');

      // Should have called cosign with the trusted issuer
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.stringContaining('--certificate-oidc-issuer'),
        ]),
        expect.any(Object)
      );
    });
  });
});

describe('CosignAdmissionController', () => {
  let controller: CosignAdmissionController;
  let mockVerifier: CosignVerifier;
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifier = new CosignVerifier({ timeout: 5000 });
    controller = new CosignAdmissionController(mockVerifier, ['kube-system']);
  });

  describe('review', () => {
    it('should allow pods with verified images', async () => {
      // Mock successful verification
      mockSpawn.mockReturnValue(
        createMockProcess('sha256:abc123', '', 0) as any
      );

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

      expect(response.allowed).toBe(true);
      expect(response.uid).toBe('test-uid');
    });

    it('should deny pods with unverified images', async () => {
      // Mock failed verification
      mockSpawn.mockReturnValueOnce(
        createMockProcess('sha256:abc123', '', 0) as any
      );
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', 'verification failed', 1) as any
      );

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

      expect(response.allowed).toBe(false);
      expect(response.status?.code).toBe(403);
      expect(response.status?.message).toContain('verification failed');
    });

    it('should skip verification for exempt namespaces', async () => {
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

      expect(response.allowed).toBe(true);
      expect(response.warnings).toContain('Namespace kube-system is exempt from verification');
      // spawn should not be called for exempt namespace
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should verify both containers and initContainers', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess('sha256:abc123', '', 0) as any
      );

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
      expect(mockSpawn.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should deduplicate images', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess('sha256:abc123', '', 0) as any
      );

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
      expect(mockSpawn.mock.calls.length).toBe(2);
    });
  });
});

describe('Integration scenarios', () => {
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle real-world GitHub Actions signed image', async () => {
    const verifier = new CosignVerifier({
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

    mockSpawn.mockReturnValueOnce(
      createMockProcess('sha256:fedcba987654', '', 0) as any
    );
    mockSpawn.mockReturnValueOnce(
      createMockProcess(ghActionSignature, '', 0) as any
    );

    const result = await verifier.verifyImage('ghcr.io/owner/repo:v2.0.0');

    expect(result.verified).toBe(true);
    expect(result.digest).toBe('sha256:fedcba987654');
  });

  it('should reject image with wrong issuer', async () => {
    const verifier = new CosignVerifier({}, {
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

    mockSpawn.mockReturnValueOnce(
      createMockProcess('sha256:evil123', '', 0) as any
    );
    mockSpawn.mockReturnValueOnce(
      createMockProcess('', 'issuer mismatch', 1) as any
    );

    const result = await verifier.verifyImage('evil/image:latest');

    expect(result.verified).toBe(false);
  });
});
