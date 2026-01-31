import { FeatureStore } from '../risk/FeatureStore';
import { describe, it, expect } from '@jest/globals';

describe('FeatureStore', () => {
  it('returns default features', async () => {
    const store = new FeatureStore();
    const f = await store.getFeatures('id', '24h');
    expect(Object.keys(f)).toContain('alerts_24h');
  });
});
