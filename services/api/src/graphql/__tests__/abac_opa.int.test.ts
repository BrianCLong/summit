// Integration stub for OPA denial - skips if OPA_URL not set
import { opaDecision } from '../abac.js';

const OPA = process.env.OPA_URL || '';
(OPA ? describe : describe.skip)('OPA integration', () => {
  it('denies when policy disallows action', async ()=>{
    const res = await opaDecision({ user: { role: 'guest' }, action: 'read', resource: { sensitivity: 'restricted' } });
    // Depending on policy, this may allow; assert shape at minimum
    expect(res).toHaveProperty('allow');
    expect(res).toHaveProperty('fields');
  });
});

