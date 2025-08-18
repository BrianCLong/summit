import { DecisionCache } from '../policy/DecisionCache';

describe('DecisionCache', () => {
  it('caches per tenant', () => {
    const cache = new DecisionCache<string>(2);
    cache.set('t1', 'a', 'A');
    cache.set('t2', 'a', 'B');
    expect(cache.get('t1', 'a')).toBe('A');
    expect(cache.get('t2', 'a')).toBe('B');
  });
});
