// Mock for risk/FeatureStore
export class FeatureStore {
  async getFeatures(_entityId: string, _window: string): Promise<Record<string, number>> {
    return {
      'feature_a': 1,
      'feature_b': 0.5,
    };
  }
}

export default FeatureStore;
