import { describe, it, expect, vi } from 'vitest';
import { verifyRun } from './verify.js';
import * as cosign from './cosign.js';

vi.mock('./cosign.js', () => ({
  verifyAttestation: vi.fn(),
}));

describe('verifyRun', () => {
  it('should pass when runId matches attestation', async () => {
    const runId = 'test-run-id';
    const imageRef = 'repo@sha256:digest';

    // Mock cosign output with base64 encoded payload
    const predicate = {
      buildDefinition: {
        externalParameters: {
          openlineage: { runId }
        }
      }
    };
    const payload = Buffer.from(JSON.stringify({ predicate })).toString('base64');
    const cosignOutput = JSON.stringify({ payload });

    vi.mocked(cosign.verifyAttestation).mockReturnValue(cosignOutput);

    const result = await verifyRun({ runId, imageRef });

    expect(result.status).toBe('PASS');
    expect(result.checks.find(c => c.name === 'runId_matches_attestation')?.status).toBe('PASS');
  });

  it('should fail when runId mismatch', async () => {
    const runId = 'test-run-id';
    const otherRunId = 'other-run-id';
    const imageRef = 'repo@sha256:digest';

    const predicate = {
      buildDefinition: {
        externalParameters: {
          openlineage: { runId: otherRunId }
        }
      }
    };
    const payload = Buffer.from(JSON.stringify({ predicate })).toString('base64');
    const cosignOutput = JSON.stringify({ payload });

    vi.mocked(cosign.verifyAttestation).mockReturnValue(cosignOutput);

    const result = await verifyRun({ runId, imageRef });

    expect(result.status).toBe('FAIL');
    expect(result.checks.find(c => c.name === 'runId_matches_attestation')?.status).toBe('FAIL');
  });
});
