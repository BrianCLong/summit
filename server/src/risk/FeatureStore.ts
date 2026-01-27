export type FeatureVector = Record<string, number>;

export class FeatureStore {
  // Aggregates features per entity over 24h/7d/30d using placeholders
  async getFeatures(
    entityId: string,
    window: '24h' | '7d' | '30d',
  ): Promise<FeatureVector> {
    // V1.0.0: Placeholder interface for feature engineering. 
    // Real-time aggregation to be implemented in v2.0 with a dedicated feature store (Feast/Hopsworks).
    return {
      alerts_24h: 0,
      vt_hits_7d: 0,
      case_links_30d: 0,
      temporal_anomaly_24h: 0,
      centrality_30d: 0,
      first_seen_recent: 0,
    };
  }
}
