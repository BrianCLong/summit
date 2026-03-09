export type AnswerDistribution = Record<string, number>;

export interface UncertaintyRecord {
  sysEu: number; // Epistemic Uncertainty (JSD)
  sysAu: number; // Aleatoric Uncertainty (Average Entropy)
  totalUncertainty: number;
}

/**
 * Calculates the Shannon Entropy of a single probability distribution.
 * H(p) = - sum(p(x) * log2(p(x)))
 */
export function calculateEntropy(dist: AnswerDistribution): number {
  let entropy = 0;
  for (const prob of Object.values(dist)) {
    if (prob > 0) {
      entropy -= prob * Math.log2(prob);
    }
  }
  return entropy;
}

/**
 * Normalizes an array of counts or unnormalized probabilities into a valid probability distribution.
 */
export function normalizeDistribution(dist: AnswerDistribution): AnswerDistribution {
  const total = Object.values(dist).reduce((sum, val) => sum + val, 0);
  if (total === 0) return {};

  const normalized: AnswerDistribution = {};
  for (const [key, value] of Object.entries(dist)) {
    normalized[key] = value / total;
  }
  return normalized;
}

/**
 * Calculates the mixture distribution (average of all agent distributions).
 */
export function calculateMixtureDistribution(dists: AnswerDistribution[]): AnswerDistribution {
  const mixture: AnswerDistribution = {};
  const n = dists.length;
  if (n === 0) return mixture;

  for (const dist of dists) {
    for (const [key, prob] of Object.entries(dist)) {
      mixture[key] = (mixture[key] || 0) + (prob / n);
    }
  }
  return mixture;
}

/**
 * Calculates the Jensen-Shannon Divergence (JSD) across multiple distributions.
 * JSD(p1, p2, ... pn) = H(Mixture(p1..pn)) - (1/n * sum(H(pi)))
 */
export function calculateJSD(dists: AnswerDistribution[]): number {
  if (dists.length === 0) return 0;

  const mixture = calculateMixtureDistribution(dists);
  const entropyOfMixture = calculateEntropy(mixture);

  const avgEntropy = dists.reduce((sum, dist) => sum + calculateEntropy(dist), 0) / dists.length;

  // To avoid floating point negative zeroes
  return Math.max(0, entropyOfMixture - avgEntropy);
}

/**
 * Decomposes uncertainty in Multi-Agent Debate into Epistemic (Sys-EU) and Aleatoric (Sys-AU).
 * @param agentDistributions Array of answer distributions (one per agent).
 *                           Each distribution maps an answer to its probability (0-1).
 */
export function computeUncertaintyDecomposition(agentDistributions: AnswerDistribution[]): UncertaintyRecord {
  if (agentDistributions.length === 0) {
    return { sysEu: 0, sysAu: 0, totalUncertainty: 0 };
  }

  // Sys-AU is the average entropy of the agents' distributions.
  const sysAu = agentDistributions.reduce((sum, dist) => sum + calculateEntropy(dist), 0) / agentDistributions.length;

  // Sys-EU is the Jensen-Shannon divergence across agents.
  const sysEu = calculateJSD(agentDistributions);

  return {
    sysEu,
    sysAu,
    totalUncertainty: sysEu + sysAu
  };
}
