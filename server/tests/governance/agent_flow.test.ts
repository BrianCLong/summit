import { jest } from '@jest/globals';

const mockQuery = jest.fn();

jest.mock('../../src/config/database.js', () => ({
  getPostgresPool: () => ({
    query: mockQuery,
  }),
}));

const queryMock = mockQuery as any;

describe('Governance & Control Plane Flow', () => {
  let agentRegistry: any;
  let agentControlPlane: any;
  let agentROITracker: any;

  beforeAll(async () => {
    const registryModule = await import('../../src/governance/agent-registry.js');
    agentRegistry = registryModule.agentRegistry;

    const cpModule = await import('../../src/maestro/control-plane.js');
    agentControlPlane = cpModule.agentControlPlane;

    const roiModule = await import('../../src/maestro/roi-tracker.js');
    agentROITracker = roiModule.agentROITracker;
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  it('should create an agent', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'agent-123',
        tenant_id: 'tenant-1',
        name: 'DevAgent',
        status: 'DRAFT',
        created_at: new Date(),
        updated_at: new Date()
      }]
    });

    const agent = await agentRegistry.createAgent({
      name: 'DevAgent',
      tenantId: 'tenant-1'
    });

    expect(agent.id).toBe('agent-123');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO agents'), expect.any(Array));
  });

  it('should verify agent action (allow default)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await agentControlPlane.verifyAgentAction('agent-123', 'deploy', {});
    expect(result.allowed).toBe(true);
  });

  it('should block agent action if policy fails', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'policy-1',
        agent_id: 'agent-123',
        name: 'Manual Approval',
        policy_type: 'MANUAL_APPROVAL',
        configuration: {},
        is_blocking: true
      }]
    });

    const result = await agentControlPlane.verifyAgentAction('agent-123', 'deploy', {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requires manual approval');
  });

  it('should record ROI metric', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'metric-1',
        agent_id: 'agent-123',
        metric_type: 'TIME_SAVED',
        value: 10,
        recorded_at: new Date()
      }]
    });

    const metric = await agentROITracker.recordMetric('agent-123', 'TIME_SAVED', 10);
    expect(metric.value).toBe(10);
  });
});
