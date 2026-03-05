import { enforceAnalyticOnly } from '../governance/guards';

describe('enforceAnalyticOnly', () => {
  it('blocks manipulation prompts', () => {
    const result = enforceAnalyticOnly('best message to convince a target audience');
    expect(result.ok).toBe(false);
  });

  it('allows defensive analytics prompts', () => {
    const result = enforceAnalyticOnly(
      'explain why this narrative contradicts an evidence-backed claim',
    );
    expect(result.ok).toBe(true);
  });
});
