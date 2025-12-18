import { SlaEnforcer } from '../privacy/dp/SlaEnforcer';
import { describe, it, expect } from '@jest/globals';

describe('SlaEnforcer', () => {
  it('credits and pauses on breach', async () => {
    const actions: string[] = [];
    const enforcer = new SlaEnforcer({
      orders: { credit: async (id: string) => actions.push(`credit:${id}`) },
      entitlements: {
        pause: async (id: string) => actions.push(`pause:${id}`),
      },
    });
    const res = await enforcer.check(5, 1, 'ent1', 'ord1');
    expect(res.refunded).toBe(true);
    expect(actions).toEqual(['credit:ord1', 'pause:ent1']);
  });
});
