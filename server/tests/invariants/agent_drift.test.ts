import { invariantService } from '../../src/invariants/enforcer';

describe('Agent Drift Defense', () => {
  // We simulate an agent operation context
  const mockAgentContext = {
    agentId: 'agent_rogue_001',
    role: 'researcher',
    allowedScopes: ['read_data', 'analyze_data'],
    budgetUsd: 5.00
  };

  it('should block agent performing action outside scope', async () => {
    // Attempting 'write_policy' which is not in allowedScopes
    const actionContext = {
      ...mockAgentContext,
      scope: 'write_policy'
    };

    const isValid = await invariantService.checkInvariant('INV-002', actionContext);
    expect(isValid).toBe(false);
  });

  it('should allow agent performing allowed action', async () => {
    const actionContext = {
      ...mockAgentContext,
      scope: 'analyze_data'
    };

    const isValid = await invariantService.checkInvariant('INV-002', actionContext);
    expect(isValid).toBe(true);
  });

  // Future: Budget checks (requires implementation in definitions.ts or dynamic loading)
});
