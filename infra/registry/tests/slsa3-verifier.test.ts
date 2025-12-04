/**
 * Tests for SLSA Level 3 Provenance Verifier
 *
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import {
  SLSA3Verifier,
  CombinedVerifier,
  type SLSAProvenanceV1,
  type SLSAVerificationResult,
} from '../slsa/slsa3-verifier';

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

// Sample SLSA v1 provenance
const sampleProvenanceV1: SLSAProvenanceV1 = {
  _type: 'https://in-toto.io/Statement/v1',
  subject: [
    {
      name: 'ghcr.io/test/image',
      digest: { sha256: 'abc123def456789' },
    },
  ],
  predicateType: 'https://slsa.dev/provenance/v1',
  predicate: {
    buildDefinition: {
      buildType: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_container_slsa3.yml@refs/tags/v1.9.0',
      externalParameters: {
        source: 'https://github.com/test/repo',
      },
      resolvedDependencies: [
        {
          uri: 'git+https://github.com/test/repo@refs/heads/main',
          digest: { sha1: 'abc123' },
        },
      ],
    },
    runDetails: {
      builder: {
        id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_container_slsa3.yml@refs/tags/v1.9.0',
      },
      metadata: {
        invocationId: 'https://github.com/test/repo/actions/runs/123456',
        startedOn: '2025-01-15T10:00:00Z',
        finishedOn: '2025-01-15T10:05:00Z',
      },
    },
  },
};

describe('SLSA3Verifier', () => {
  let verifier: SLSA3Verifier;
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();
    verifier = new SLSA3Verifier({
      requiredLevel: 3,
      cacheDir: '/tmp/slsa-test',
      timeout: 5000,
    });
  });

  describe('verifyProvenance', () => {
    it('should verify image with valid SLSA L3 provenance', async () => {
      // Mock cosign download attestation
      const attestationEnvelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(sampleProvenanceV1)).toString('base64'),
      });

      mockSpawn.mockReturnValueOnce(
        createMockProcess(attestationEnvelope, '', 0) as any
      );

      const result = await verifier.verifyProvenance('ghcr.io/test/image:v1.0.0');

      expect(result.verified).toBe(true);
      expect(result.slsaLevel).toBe(3);
      expect(result.builder?.trusted).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject image without provenance', async () => {
      // Mock cosign download attestation failure
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', 'no attestations found', 1) as any
      );
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', 'no attestations found', 1) as any
      );

      const result = await verifier.verifyProvenance('unattested/image:v1');

      expect(result.verified).toBe(false);
      expect(result.slsaLevel).toBe(0);
      expect(result.violations.some((v) => v.code === 'NO_PROVENANCE')).toBe(true);
    });

    it('should reject untrusted builder', async () => {
      const untrustedProvenance = {
        ...sampleProvenanceV1,
        predicate: {
          ...sampleProvenanceV1.predicate,
          runDetails: {
            ...sampleProvenanceV1.predicate.runDetails,
            builder: {
              id: 'https://evil-builder.com/workflow',
            },
          },
        },
      };

      const attestationEnvelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(untrustedProvenance)).toString('base64'),
      });

      mockSpawn.mockReturnValueOnce(
        createMockProcess(attestationEnvelope, '', 0) as any
      );

      const result = await verifier.verifyProvenance('evil/image:v1');

      expect(result.verified).toBe(false);
      expect(result.builder?.trusted).toBe(false);
      expect(result.violations.some((v) => v.code === 'UNTRUSTED_BUILDER')).toBe(true);
    });

    it('should identify SLSA level correctly based on builder', async () => {
      // Test various builders
      const testCases = [
        {
          builderId: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_container_slsa3.yml',
          expectedLevel: 3,
        },
        {
          builderId: 'https://cloudbuild.googleapis.com/GoogleHostedWorker',
          expectedLevel: 3,
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const provenance = {
          ...sampleProvenanceV1,
          predicate: {
            ...sampleProvenanceV1.predicate,
            runDetails: {
              ...sampleProvenanceV1.predicate.runDetails,
              builder: { id: testCase.builderId },
            },
          },
        };

        const envelope = JSON.stringify({
          payload: Buffer.from(JSON.stringify(provenance)).toString('base64'),
        });

        mockSpawn.mockReturnValueOnce(
          createMockProcess(envelope, '', 0) as any
        );

        const result = await verifier.verifyProvenance('test/image:v1');
        expect(result.slsaLevel).toBe(testCase.expectedLevel);
      }
    });

    it('should extract source information from provenance', async () => {
      const envelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(sampleProvenanceV1)).toString('base64'),
      });

      mockSpawn.mockReturnValueOnce(
        createMockProcess(envelope, '', 0) as any
      );

      const result = await verifier.verifyProvenance('ghcr.io/test/image:v1');

      expect(result.source).toBeDefined();
      expect(result.source?.repository).toContain('github.com/test/repo');
      expect(result.source?.commit).toBe('abc123');
    });

    it('should flag missing source commit as violation', async () => {
      const provenanceNoCommit = {
        ...sampleProvenanceV1,
        predicate: {
          ...sampleProvenanceV1.predicate,
          buildDefinition: {
            ...sampleProvenanceV1.predicate.buildDefinition,
            resolvedDependencies: [
              {
                uri: 'git+https://github.com/test/repo',
                digest: {}, // No commit hash
              },
            ],
          },
        },
      };

      const envelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(provenanceNoCommit)).toString('base64'),
      });

      mockSpawn.mockReturnValueOnce(
        createMockProcess(envelope, '', 0) as any
      );

      const result = await verifier.verifyProvenance('test/image:v1');

      expect(result.violations.some((v) => v.code === 'NO_SOURCE_COMMIT')).toBe(true);
    });

    it('should check build parameterlessness for L3', async () => {
      const provenanceWithManyParams = {
        ...sampleProvenanceV1,
        predicate: {
          ...sampleProvenanceV1.predicate,
          buildDefinition: {
            ...sampleProvenanceV1.predicate.buildDefinition,
            externalParameters: {
              param1: 'value1',
              param2: 'value2',
              param3: 'value3',
              param4: 'value4',
            },
          },
        },
      };

      const envelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(provenanceWithManyParams)).toString('base64'),
      });

      mockSpawn.mockReturnValueOnce(
        createMockProcess(envelope, '', 0) as any
      );

      const result = await verifier.verifyProvenance('test/image:v1');

      expect(result.buildInfo?.parameterless).toBe(false);
      expect(result.violations.some((v) => v.code === 'EXCESSIVE_BUILD_PARAMS')).toBe(true);
    });

    it('should cache successful verifications', async () => {
      const envelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(sampleProvenanceV1)).toString('base64'),
      });

      mockSpawn.mockReturnValueOnce(
        createMockProcess(envelope, '', 0) as any
      );

      // First verification
      await verifier.verifyProvenance('cached/image:v1');

      // Second verification should use cache
      await verifier.verifyProvenance('cached/image:v1');

      // spawn should only be called once
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('SLSA v0.2 compatibility', () => {
    it('should convert SLSA v0.2 provenance to v1 format', async () => {
      const provenanceV02 = {
        _type: 'https://in-toto.io/Statement/v0.1',
        subject: [
          { name: 'test/image', digest: { sha256: 'abc123' } },
        ],
        predicateType: 'https://slsa.dev/provenance/v0.2',
        predicate: {
          builder: {
            id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_container_slsa3.yml',
          },
          buildType: 'https://github.com/slsa-framework/slsa-github-generator',
          invocation: {
            parameters: {},
          },
          metadata: {
            buildInvocationId: 'run-123',
            buildStartedOn: '2025-01-15T10:00:00Z',
            buildFinishedOn: '2025-01-15T10:05:00Z',
          },
          materials: [
            {
              uri: 'git+https://github.com/test/repo',
              digest: { sha1: 'commit123' },
            },
          ],
        },
      };

      // v1 fails first
      mockSpawn.mockReturnValueOnce(
        createMockProcess('', 'no v1 attestation', 1) as any
      );

      // v0.2 succeeds
      const envelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(provenanceV02)).toString('base64'),
      });
      mockSpawn.mockReturnValueOnce(
        createMockProcess(envelope, '', 0) as any
      );

      const result = await verifier.verifyProvenance('legacy/image:v1');

      expect(result.verified).toBe(true);
      expect(result.slsaLevel).toBe(3);
    });
  });

  describe('exportReport', () => {
    it('should generate comprehensive verification report', async () => {
      const results: SLSAVerificationResult[] = [
        {
          verified: true,
          slsaLevel: 3,
          imageRef: 'image1:v1',
          digest: 'sha256:abc',
          builder: { id: 'builder1', trusted: true, slsaLevel: 3 },
          source: { repository: 'github.com/test', commit: 'abc', verified: true },
          buildInfo: { buildType: 'test', reproducible: false, isolated: true, parameterless: true },
          violations: [],
          timestamp: new Date(),
          verificationDuration: 1000,
        },
        {
          verified: false,
          slsaLevel: 0,
          imageRef: 'image2:v1',
          digest: 'sha256:def',
          violations: [
            { code: 'NO_PROVENANCE', severity: 'critical', message: 'No provenance', requirement: 'L1' },
          ],
          timestamp: new Date(),
          verificationDuration: 500,
        },
      ];

      const report = verifier.exportReport(results);
      const parsed = JSON.parse(report);

      expect(parsed.totalImages).toBe(2);
      expect(parsed.summary.verified).toBe(1);
      expect(parsed.summary.failed).toBe(1);
      expect(parsed.summary.byLevel.level3).toBe(1);
      expect(parsed.summary.byLevel.level0).toBe(1);
    });
  });
});

describe('CombinedVerifier', () => {
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify both signature and SLSA provenance', async () => {
    const verifier = new CombinedVerifier({ requiredLevel: 3 });

    const envelope = JSON.stringify({
      payload: Buffer.from(JSON.stringify(sampleProvenanceV1)).toString('base64'),
    });

    mockSpawn.mockReturnValueOnce(
      createMockProcess(envelope, '', 0) as any
    );

    const result = await verifier.verify('secure/image:v1');

    expect(result.verified).toBe(true);
    expect(result.slsaVerified).toBe(true);
    expect(result.slsaLevel).toBe(3);
  });

  it('should collect errors from failed verifications', async () => {
    const verifier = new CombinedVerifier({ requiredLevel: 3 });

    mockSpawn.mockReturnValueOnce(
      createMockProcess('', 'failed', 1) as any
    );
    mockSpawn.mockReturnValueOnce(
      createMockProcess('', 'failed', 1) as any
    );

    const result = await verifier.verify('bad/image:v1');

    expect(result.verified).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Trusted Builder Configuration', () => {
  it('should recognize all official SLSA GitHub generators', async () => {
    const verifier = new SLSA3Verifier();
    const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

    const officialBuilders = [
      'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_go_slsa3.yml',
      'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_container_slsa3.yml',
      'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_nodejs_slsa3.yml',
      'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml',
    ];

    for (const builderId of officialBuilders) {
      jest.clearAllMocks();

      const provenance = {
        ...sampleProvenanceV1,
        predicate: {
          ...sampleProvenanceV1.predicate,
          runDetails: {
            ...sampleProvenanceV1.predicate.runDetails,
            builder: { id: builderId },
          },
        },
      };

      const envelope = JSON.stringify({
        payload: Buffer.from(JSON.stringify(provenance)).toString('base64'),
      });

      mockSpawn.mockReturnValueOnce(
        createMockProcess(envelope, '', 0) as any
      );

      const result = await verifier.verifyProvenance('test/image:v1');

      expect(result.builder?.trusted).toBe(true);
      expect(result.builder?.slsaLevel).toBe(3);
    }
  });

  it('should recognize Google Cloud Build', async () => {
    const verifier = new SLSA3Verifier();
    const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

    const provenance = {
      ...sampleProvenanceV1,
      predicate: {
        ...sampleProvenanceV1.predicate,
        runDetails: {
          ...sampleProvenanceV1.predicate.runDetails,
          builder: { id: 'https://cloudbuild.googleapis.com/GoogleHostedWorker' },
        },
      },
    };

    const envelope = JSON.stringify({
      payload: Buffer.from(JSON.stringify(provenance)).toString('base64'),
    });

    mockSpawn.mockReturnValueOnce(
      createMockProcess(envelope, '', 0) as any
    );

    const result = await verifier.verifyProvenance('gcr.io/project/image:v1');

    expect(result.builder?.trusted).toBe(true);
    expect(result.builder?.slsaLevel).toBe(3);
  });
});
