import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../../services/osint-synint/SynintClient.js', () => ({
  SynintClient: jest.fn()
}));

jest.unstable_mockModule('../../../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn()
}));

describe("runSynintSweep Resolver", () => {
  let resolvers: any;
  let SynintClient: any;
  let getNeo4jDriver: any;
  let mockRunSweep: any;
  let mockSessionRun: any;
  let mockSessionClose: any;

  beforeAll(async () => {
    const clientModule = await import('../../../services/osint-synint/SynintClient.js');
    SynintClient = clientModule.SynintClient;

    const dbModule = await import('../../../db/neo4j.js');
    getNeo4jDriver = dbModule.getNeo4jDriver;

    const module = await import('../osint-synint.js');
    resolvers = module.osintSynintResolvers;
  });

  beforeEach(() => {
    mockRunSweep = jest.fn();
    mockSessionRun = jest.fn();
    mockSessionClose = jest.fn();

    (SynintClient as any).mockImplementation(() => ({
      runSweep: mockRunSweep
    }));

    (getNeo4jDriver as any).mockReturnValue({
      session: () => ({
        run: mockSessionRun,
        close: mockSessionClose
      })
    });
  });

  it("runs sweep and applies mutations", async () => {
    mockRunSweep.mockResolvedValue({
      target: "example.com",
      startedAt: "2023-01-01T00:00:00Z",
      completedAt: "2023-01-01T00:01:00Z",
      agents: [
        { agentName: "WhoisAgent", success: true, findings: { domain: "example.com" } }
      ]
    });

    const res = await resolvers.Mutation.runSynintSweep(null, { target: "example.com" }, {});

    expect(mockRunSweep).toHaveBeenCalledWith("example.com");
    expect(mockSessionRun).toHaveBeenCalled();
    expect(res.target).toBe("example.com");
  });
});
