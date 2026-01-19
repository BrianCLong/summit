import { jest } from '@jest/globals';
import { AgentGovernanceService } from '../governance-service.js';
import { ProvenanceLedgerV2 } from '../../provenance/ledger.js';

// Mock ProvenanceLedgerV2
jest.mock('../../provenance/ledger.js', () => ({
  ProvenanceLedgerV2: {
    getInstance: jest.fn().mockReturnValue({
      appendEntry: jest.fn().mockResolvedValue({ id: 'mock-entry' }),
    }),
  },
}));

// Mock the opa-integration module
jest.unstable_mockModule('../../conductor/governance/opa-integration.js', () => ({
  opaPolicyEngine: {
    evaluatePolicy: jest.fn(),
  },
}));

const { opaPolicyEngine } = await import('../../conductor/governance/opa-integration.js');

describe('AgentGovernanceService', () => {
  let service: AgentGovernanceService;
  let ledger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = AgentGovernanceService.getInstance();
    ledger = ProvenanceLedgerV2.getInstance();
  });

  it('should allow action when OPA allows and no internal violations', async () => {
    (opaPolicyEngine.evaluatePolicy as jest.Mock).mockResolvedValue({
      allow: true,
      reason: 'Allowed by test',
      policyBundleVersion: 'v1-test'
    });

    const agent = {
        id: 'agent-1',
        tenantId: 'tenant-1',
        capabilities: ['data-query'],
        metadata: { governanceTier: 'tier-1' },
        status: 'active',
        health: {}
    };

    const decision = await service.evaluateAction(agent as any, 'data-query', { target: 'db' });

    expect(decision.allowed).toBe(true);
    expect(ledger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'GOVERNANCE_ALLOW',
      payload: expect.objectContaining({
        decision: 'allow',
        policyHash: 'v1-test'
      })
    }));
  });

  it('should deny action when OPA denies', async () => {
    (opaPolicyEngine.evaluatePolicy as jest.Mock).mockResolvedValue({
      allow: false,
      reason: 'Denied by test policy',
      policyBundleVersion: 'v1-test'
    });

    const agent = {
        id: 'agent-1',
        tenantId: 'tenant-1',
        capabilities: ['data-query'],
        metadata: { governanceTier: 'tier-1' },
        status: 'active',
        health: {}
    };
    const decision = await service.evaluateAction(agent as any, 'data-query', { target: 'db' });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Denied by test policy');
    expect(ledger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'GOVERNANCE_DENY',
      payload: expect.objectContaining({
        decision: 'deny'
      })
    }));
  });

  it('should deny action when internal safety rail fails (unauthorized capability)', async () => {
    (opaPolicyEngine.evaluatePolicy as jest.Mock).mockResolvedValue({
      allow: true,
      reason: 'OPA allowed but internal check should fail',
      policyBundleVersion: 'v1-test'
    });

    const agent = {
        id: 'agent-1',
        tenantId: 'tenant-1',
        capabilities: [],
        metadata: { governanceTier: 'tier-0' },
        status: 'active',
        health: {}
    };
    // 'delete' is not in tier-0 whitelist
    const decision = await service.evaluateAction(agent as any, 'delete', {});

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('UNAUTHORIZED_CAPABILITY');
    expect(ledger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'GOVERNANCE_DENY'
    }));
  });
});
