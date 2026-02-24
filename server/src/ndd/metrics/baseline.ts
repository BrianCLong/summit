export interface NarrativeCluster {
  id: string;
  frames: string[];
  originators: string[]; // Actor IDs
  volume: number;
  startTime: string; // ISO String
  lastActive: string; // ISO String
  connectivityIndex: number; // 0..1 (0 = disconnected, 1 = fully connected)
  postCorrectionVolume?: number;
  expectedDecay?: number;
}

export interface MetricVector {
  clusterId: string;
  originDensityScore: number;
  narrativePersistenceScore: number;
  timestamp: string;
}

/**
 * Calculates Origin Density Score.
 * Formula: unique_originators / (connectivity_index + epsilon)
 * High density of weak origins -> High score.
 */
export function calculateOriginDensity(uniqueOriginatorsCount: number, connectivityIndex: number): number {
  const epsilon = 0.001; // Avoid division by zero
  return uniqueOriginatorsCount / (connectivityIndex + epsilon);
}

/**
 * Calculates Narrative Persistence Score.
 * Formula: post_correction_volume / (expected_decay + epsilon)
 * High persistence despite expected decay -> High score.
 */
export function calculateNarrativePersistence(postCorrectionVolume: number, expectedDecay: number): number {
  const epsilon = 0.001;
  return postCorrectionVolume / (expectedDecay + epsilon);
}

/**
 * Computes baseline metrics for a cluster at a given timestamp.
 */
export function computeBaselineMetrics(cluster: NarrativeCluster, timestamp: string): MetricVector {
  const uniqueOrigins = new Set(cluster.originators).size;

  const originDensity = calculateOriginDensity(
    uniqueOrigins,
    cluster.connectivityIndex
  );

  const persistence = calculateNarrativePersistence(
    cluster.postCorrectionVolume || 0,
    cluster.expectedDecay || 1
  );

  return {
    clusterId: cluster.id,
    originDensityScore: Number(originDensity.toFixed(4)), // Deterministic rounding
    narrativePersistenceScore: Number(persistence.toFixed(4)),
    timestamp
  };
}
