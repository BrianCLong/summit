import { FeatureStore } from '../risk/FeatureStore';

describe('FeatureStore', () => {
  it('returns default features', async () => {
    const store = new FeatureStore();
    const f = await store.getFeatures('id', '24h');
    expect(Object.keys(f)).toContain('alerts_24h');
  });
});
