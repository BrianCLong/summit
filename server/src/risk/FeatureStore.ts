export type FeatureVector = Record<string, number>;

/**
 * Retrieves aggregated features for entities to be used in risk scoring.
 * Features are aggregated over different time windows (24h, 7d, 30d).
 */
export class FeatureStore {
  /**
   * Fetches the feature vector for a given entity and time window.
   *
   * @param entityId - The ID of the entity.
   * @param window - The time window for aggregation ('24h', '7d', '30d').
   * @returns A promise resolving to the FeatureVector.
   */
  async getFeatures(
    entityId: string,
    window: '24h' | '7d' | '30d',
  ): Promise<FeatureVector> {
    // TODO: Implement real aggregation logic
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
