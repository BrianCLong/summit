import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';

const appendEntryMock = jest.fn();
const verifySignatureMock = jest.fn();
const createDefaultCryptoPipelineMock = jest.fn(async () => ({
  verifySignature: verifySignatureMock,
}));
const infoMock = jest.fn();

jest.unstable_mockModule('../../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: appendEntryMock,
  },
}));

jest.unstable_mockModule('../../../config/logger.js', () => ({
  default: {
    info: infoMock,
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../security/crypto/index.js', () => ({
  createDefaultCryptoPipeline: createDefaultCryptoPipelineMock,
}));

let agentAttestationVerifier: typeof import('../agent-attestation.js').agentAttestationVerifier;

describe('agent-attestation', () => {
  beforeAll(async () => {
    ({ agentAttestationVerifier } = await import('../agent-attestation.js'));
  });

  beforeEach(() => {
    appendEntryMock.mockReset();
    verifySignatureMock.mockReset();
  });

  it('verifies and records valid attestations', async () => {
    verifySignatureMock.mockResolvedValue({ valid: true, errors: [] });
    const attestation = {
      tenantId: 'tenant-1',
      taskId: 'task-12345678',
      agentId: 'agent-1',
      signedPayload: JSON.stringify({
        tenantId: 'tenant-1',
        taskId: 'task-12345678',
        agentId: 'agent-1',
        resourceType: 'task',
        humanApprover: 'user-1',
        policyRefs: ['GC-01'],
        issuedAt: '2026-01-01T00:00:00Z',
      }),
      signature: {
        keyId: 'key-1',
        signature: 'sig',
        algorithm: 'rsa',
      },
      resourceType: 'task' as const,
      humanApprover: 'user-1',
      policyRefs: ['GC-01'],
      issuedAt: '2026-01-01T00:00:00Z',
    };

    await agentAttestationVerifier.verifyAndRecord(attestation);

    expect(verifySignatureMock).toHaveBeenCalled();
    expect(appendEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        resourceId: 'task-12345678',
        actionType: 'task_attestation',
      }),
    );
  });

  it('rejects attestation payload mismatches', async () => {
    verifySignatureMock.mockResolvedValue({ valid: true, errors: [] });
    const attestation = {
      tenantId: 'tenant-1',
      taskId: 'task-12345678',
      agentId: 'agent-1',
      signedPayload: JSON.stringify({
        tenantId: 'tenant-1',
        taskId: 'task-00000000',
        agentId: 'agent-1',
        resourceType: 'task',
        humanApprover: 'user-1',
        policyRefs: ['GC-01'],
        issuedAt: '2026-01-01T00:00:00Z',
      }),
      signature: {
        keyId: 'key-1',
        signature: 'sig',
        algorithm: 'rsa',
      },
      resourceType: 'task' as const,
      humanApprover: 'user-1',
      policyRefs: ['GC-01'],
      issuedAt: '2026-01-01T00:00:00Z',
    };

    await expect(
      agentAttestationVerifier.verifyAndRecord(attestation),
    ).rejects.toThrow('Signed payload taskId does not match attestation');
  });
});
