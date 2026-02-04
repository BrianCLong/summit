import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockNeoRun = jest.fn();
const mockRequirePurpose = jest.fn();
const mockRunSweep = jest.fn();

const mockSweep = {
  target: 'example.com',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  agents: [
    {
      agentName: 'WhoisAgent',
      success: true,
      findings: { domain: 'example.com', registrantOrg: 'Example Org' },
    },
  ],
};

jest.unstable_mockModule('../../../db/neo4j.js', () => ({
  neo: {
    run: mockNeoRun,
  },
}));

jest.unstable_mockModule('../../../policy/enforcer.js', () => ({
  policyEnforcer: {
    requirePurpose: mockRequirePurpose,
  },
}));

jest.unstable_mockModule('../../../services/osint-synint/SynintClient.js', () => ({
  SynintClient: jest.fn().mockImplementation(() => ({
    runSweep: mockRunSweep,
  })),
}));

const { runSynintSweep } = await import('../osint.js');
const { SynintClient } = await import(
  '../../../services/osint-synint/SynintClient.js'
);

describe('runSynintSweep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNeoRun.mockResolvedValue({});
    mockRequirePurpose.mockResolvedValue({ allow: true });
    mockRunSweep.mockResolvedValue(mockSweep);
  });

  it('runs a sweep and applies graph mutations', async () => {
    const result = await runSynintSweep(
      {},
      { target: 'example.com' },
      { purpose: 'investigation' },
    );

    expect(result).toEqual(mockSweep);
    expect(SynintClient).toHaveBeenCalledTimes(1);
    expect(mockRunSweep).toHaveBeenCalledWith('example.com');
    expect(mockNeoRun).toHaveBeenCalled();
  });

  it('rejects invalid targets', async () => {
    await expect(
      runSynintSweep({}, { target: '!!' }, { purpose: 'investigation' }),
    ).rejects.toThrow('Invalid target length');
  });
});
