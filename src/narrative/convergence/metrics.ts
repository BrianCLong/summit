import { getImplicationVector, cosineSimilarity, Vector } from './implication_vector';
import { ConvergenceMetrics } from '../schema/evidence_v1';

export function calculateConvergenceMetrics(narratives: string[], timeSpanHours: number): ConvergenceMetrics {
  if (narratives.length === 0) {
    return {
      interpretive_variance: 0,
      convergence_direction: 'stable',
      speed_score: 0,
      vector: [0, 0, 0]
    };
  }

  const vectors = narratives.map(getImplicationVector);

  // Calculate average vector (centroid)
  const centroid: Vector = [0, 0, 0];
  for (const v of vectors) {
    centroid[0] += v[0];
    centroid[1] += v[1];
    centroid[2] += v[2];
  }
  // Normalize centroid
  const mag = Math.sqrt(centroid.reduce((s, x) => s + x*x, 0));
  if (mag > 0) {
    centroid[0] /= mag;
    centroid[1] /= mag;
    centroid[2] /= mag;
  }

  // Calculate Variance (average distance from centroid)
  let totalSim = 0;
  for (const v of vectors) {
    totalSim += cosineSimilarity(v, centroid);
  }
  const avgSim = totalSim / vectors.length;
  // Variance is inverse of similarity (0 sim -> 1 var, 1 sim -> 0 var)
  const interpretive_variance = 1 - avgSim;

  // Speed Score: Mock logic (in real system, requires time-series delta)
  // Here we use magnitude of centroid as a proxy for "strength" of direction
  // divided by variance (high strength + low variance = high speed/consensus)
  const speed_score = (mag / narratives.length) * (1 - interpretive_variance);

  let direction: 'converging' | 'diverging' | 'stable' = 'stable';
  if (interpretive_variance < 0.2 && mag > 0.5) direction = 'converging';
  if (interpretive_variance > 0.5) direction = 'diverging';

  return {
    interpretive_variance,
    convergence_direction: direction,
    speed_score,
    vector: centroid
  };
}
