import { ForecastFeatureVector } from '../types';

export function attachEmbeddingFeature(
  base: ForecastFeatureVector,
  embedding: number[]
): ForecastFeatureVector {
  return { ...base, embedding };
}
