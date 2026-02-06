import { StructuralGraph } from './structure_encoder';

export function calculateStructuralSimilarity(g1: StructuralGraph, g2: StructuralGraph): number {
  if (g1.fingerprint === g2.fingerprint) return 1.0;

  // Simple distance metric based on counts
  const g1Causal = g1.edges.find(e => e.relation === 'causal')?.count || 0;
  const g2Causal = g2.edges.find(e => e.relation === 'causal')?.count || 0;

  const diff = Math.abs(g1Causal - g2Causal);
  const max = Math.max(g1Causal, g2Causal, 1); // Avoid div by zero

  // Similarity is 1 - normalized difference
  // This is a very basic proxy for structural similarity
  return 1 - (diff / max);
}
