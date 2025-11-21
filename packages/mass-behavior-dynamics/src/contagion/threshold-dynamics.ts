/**
 * Threshold Dynamics Models
 *
 * Implements Granovetter-style threshold models for collective action
 */

export interface ThresholdDistribution {
  distribution: number[];
  cumulativeDistribution: number[];
}

/**
 * Generate threshold distributions
 */
export function generateThresholdDistribution(
  type: 'UNIFORM' | 'NORMAL' | 'BIMODAL',
  params: DistributionParams
): ThresholdDistribution {
  const n = params.size || 1000;
  const distribution: number[] = [];

  for (let i = 0; i < n; i++) {
    let threshold: number;

    switch (type) {
      case 'UNIFORM':
        threshold = Math.random();
        break;
      case 'NORMAL':
        threshold = normalRandom(params.mean || 0.5, params.std || 0.15);
        threshold = Math.max(0, Math.min(1, threshold));
        break;
      case 'BIMODAL':
        // Mix of two normal distributions
        if (Math.random() < 0.5) {
          threshold = normalRandom(params.mode1 || 0.2, params.std || 0.1);
        } else {
          threshold = normalRandom(params.mode2 || 0.8, params.std || 0.1);
        }
        threshold = Math.max(0, Math.min(1, threshold));
        break;
    }

    distribution.push(threshold);
  }

  distribution.sort((a, b) => a - b);

  // Calculate cumulative distribution
  const cumulativeDistribution = distribution.map((_, i) => (i + 1) / n);

  return { distribution, cumulativeDistribution };
}

/**
 * Simulate threshold cascade
 */
export function simulateThresholdCascade(
  thresholds: number[],
  initialActivation: number
): CascadeResult {
  const n = thresholds.length;
  let activated = Math.floor(n * initialActivation);
  const trajectory: number[] = [activated / n];

  // Sort thresholds to find equilibrium
  const sorted = [...thresholds].sort((a, b) => a - b);

  let converged = false;
  let iterations = 0;
  const maxIterations = n;

  while (!converged && iterations < maxIterations) {
    iterations++;

    // Count how many would be activated at current level
    const currentFraction = activated / n;
    let newActivated = 0;

    for (const threshold of sorted) {
      if (threshold <= currentFraction) {
        newActivated++;
      }
    }

    if (newActivated === activated) {
      converged = true;
    } else {
      activated = newActivated;
      trajectory.push(activated / n);
    }
  }

  return {
    finalActivation: activated / n,
    trajectory,
    converged,
    iterations,
    equilibriumType: categorizeEquilibrium(activated / n),
  };
}

/**
 * Find tipping point in threshold distribution
 */
export function findTippingPoint(thresholds: number[]): TippingPointInfo {
  const n = thresholds.length;
  const sorted = [...thresholds].sort((a, b) => a - b);

  // Find where cumulative distribution crosses 45-degree line
  for (let i = 0; i < n; i++) {
    const threshold = sorted[i];
    const cumulativeFraction = (i + 1) / n;

    if (threshold > cumulativeFraction) {
      // Found the tipping point
      return {
        threshold: i > 0 ? sorted[i - 1] : 0,
        index: i,
        stableEquilibriumBelow: i / n,
        unstableEquilibriumAt: threshold,
      };
    }
  }

  // No tipping point - full cascade
  return {
    threshold: 0,
    index: 0,
    stableEquilibriumBelow: 0,
    unstableEquilibriumAt: null,
  };
}

function normalRandom(mean: number, std: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function categorizeEquilibrium(activation: number): string {
  if (activation < 0.1) return 'NO_CASCADE';
  if (activation < 0.5) return 'PARTIAL_CASCADE';
  if (activation < 0.9) return 'MAJORITY_CASCADE';
  return 'FULL_CASCADE';
}

interface DistributionParams {
  size?: number;
  mean?: number;
  std?: number;
  mode1?: number;
  mode2?: number;
}

interface CascadeResult {
  finalActivation: number;
  trajectory: number[];
  converged: boolean;
  iterations: number;
  equilibriumType: string;
}

interface TippingPointInfo {
  threshold: number;
  index: number;
  stableEquilibriumBelow: number;
  unstableEquilibriumAt: number | null;
}
