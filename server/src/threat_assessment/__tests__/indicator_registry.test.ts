import { INDICATOR_REGISTRY } from '../indicator_registry';

describe('indicator registry', () => {
  it('has 120 indicators and unique IDs', () => {
    expect(INDICATOR_REGISTRY).toHaveLength(120);
    const ids = INDICATOR_REGISTRY.map((i) => i.indicator_id);
    expect(new Set(ids).size).toBe(120);
  });
});
