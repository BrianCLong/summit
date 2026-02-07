import {
  assertAgentIdentity,
  assertBoundaries,
  assertContext,
} from '../../../src/agents/governance/ibc';

describe('IBC governance assertions', () => {
  test('fails when owner missing (deny-by-default)', () => {
    expect(() =>
      assertAgentIdentity({
        agent_id: 'a1',
        team: 't',
        purpose: 'p',
        data_classification: 'internal',
        retention_days: 7,
      }),
    ).toThrow(/IBC_MISSING_FIELDS/);
  });

  test('fails when retention exceeds policy', () => {
    expect(() =>
      assertAgentIdentity({
        agent_id: 'a1',
        owner: 'owner',
        team: 't',
        purpose: 'p',
        data_classification: 'internal',
        retention_days: 45,
      }),
    ).toThrow(/IBC_RETENTION_EXCEEDED/);
  });

  test('passes when all required fields present', () => {
    expect(() =>
      assertAgentIdentity({
        agent_id: 'a1',
        owner: 'owner',
        team: 't',
        purpose: 'p',
        data_classification: 'internal',
        retention_days: 7,
      }),
    ).not.toThrow();
  });

  test('boundaries require tools and actions', () => {
    expect(() =>
      assertBoundaries({
        allowed_tools: ['shell'],
        allowed_actions: ['read'],
      }),
    ).not.toThrow();
  });

  test('context enforces required fields', () => {
    expect(() =>
      assertContext({
        data_classification: 'restricted',
        retention_days: 30,
      }),
    ).not.toThrow();
  });
});
