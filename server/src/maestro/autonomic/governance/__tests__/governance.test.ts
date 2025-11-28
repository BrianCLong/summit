
import { GovernanceEngine } from '../governance-engine';
import { AdaptationPlan } from '../../loops/types';

describe('GovernanceEngine', () => {
  let engine: GovernanceEngine;

  beforeEach(() => {
    engine = new GovernanceEngine();
  });

  it('should deny red-line actions', async () => {
    const plan: AdaptationPlan = {
      id: 'p1',
      loopName: 'test',
      timestamp: new Date(),
      justification: 'test',
      actions: [{ type: 'DISABLE_SECURITY_SCANNERS', payload: {} }]
    };

    const results = await engine.reviewPlan(plan);
    expect(results[0].status).toBe('DENIED');
    expect(results[0].denialReason).toContain('Red Line');
  });

  it('should approve safe actions', async () => {
    const plan: AdaptationPlan = {
        id: 'p2',
        loopName: 'test',
        timestamp: new Date(),
        justification: 'test',
        actions: [{ type: 'THROTTLE_QUEUE', payload: { factor: 0.5 } }]
      };

      const results = await engine.reviewPlan(plan);
      expect(results[0].status).toBe('APPROVED');
  });

  it('should deny OPA violations', async () => {
    const plan: AdaptationPlan = {
        id: 'p3',
        loopName: 'test',
        timestamp: new Date(),
        justification: 'test',
        actions: [{ type: 'RELAX_SAFETY_RULES', payload: { approved: false } }]
      };

      const results = await engine.reviewPlan(plan);
      expect(results[0].status).toBe('DENIED');
  });
});
