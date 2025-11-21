/**
 * Critical Mass Analysis
 *
 * Analyzes when collective action reaches tipping points
 * using percolation theory and cascade dynamics.
 */

export interface CriticalMassAnalysis {
  currentAdoption: number;
  criticalThreshold: number;
  distanceToCritical: number;
  cascadeProbability: number;
  keyInfluencers: string[];
  vulnerableSegments: string[];
  timeToTipping?: number;
}

/**
 * Critical Mass Analyzer
 */
export class CriticalMassAnalyzer {
  /**
   * Estimate critical mass threshold for cascade
   *
   * Uses mean-field approximation:
   * Critical fraction ≈ 1/<k> where <k> is average degree
   *
   * For complex contagion with threshold τ:
   * Critical fraction ≈ τ / (τ + (1-τ)<k>)
   */
  estimateCriticalThreshold(
    averageDegree: number,
    adoptionThreshold: number,
    contagionType: 'SIMPLE' | 'COMPLEX'
  ): number {
    if (contagionType === 'SIMPLE') {
      // Simple contagion (like disease)
      return 1 / averageDegree;
    } else {
      // Complex contagion (requires social reinforcement)
      return adoptionThreshold / (adoptionThreshold + (1 - adoptionThreshold) * averageDegree);
    }
  }

  /**
   * Analyze current state relative to critical mass
   */
  analyzeCriticalMass(
    currentAdoption: number,
    networkMetrics: NetworkMetrics,
    thresholdDistribution: CriticalMassThresholdConfig
  ): CriticalMassAnalysis {
    // Estimate critical threshold
    const meanThreshold =
      thresholdDistribution.mean || this.estimateMeanThreshold(thresholdDistribution);

    const criticalThreshold = this.estimateCriticalThreshold(
      networkMetrics.averageDegree,
      meanThreshold,
      thresholdDistribution.type
    );

    // Calculate distance
    const distance = Math.max(0, criticalThreshold - currentAdoption);

    // Estimate cascade probability
    const cascadeProb = this.estimateCascadeProbability(
      currentAdoption,
      criticalThreshold,
      networkMetrics.clusteringCoefficient
    );

    // Identify key influencers
    const keyInfluencers = this.identifyKeyInfluencers(networkMetrics);

    // Identify vulnerable segments
    const vulnerableSegments = this.identifyVulnerableSegments(thresholdDistribution);

    return {
      currentAdoption,
      criticalThreshold,
      distanceToCritical: distance,
      cascadeProbability: cascadeProb,
      keyInfluencers,
      vulnerableSegments,
      timeToTipping: this.estimateTimeToTipping(currentAdoption, criticalThreshold, networkMetrics),
    };
  }

  /**
   * Identify minimum "seed" set for cascade
   *
   * Greedy algorithm for influence maximization
   */
  findMinimumSeedSet(
    network: AdjacencyList,
    thresholds: Map<string, number>,
    targetCoverage: number
  ): string[] {
    const seeds: string[] = [];
    const activated = new Set<string>();

    while (this.calculateCoverage(activated, network) < targetCoverage) {
      // Find node that would activate the most additional nodes
      let bestNode = '';
      let bestGain = 0;

      for (const node of network.keys()) {
        if (activated.has(node)) continue;

        // Simulate adding this node
        const gain = this.simulateActivation(node, activated, network, thresholds);
        if (gain > bestGain) {
          bestGain = gain;
          bestNode = node;
        }
      }

      if (bestNode === '') break;

      seeds.push(bestNode);
      this.propagateActivation(bestNode, activated, network, thresholds);
    }

    return seeds;
  }

  private estimateMeanThreshold(dist: CriticalMassThresholdConfig): number {
    return dist.mean || 0.25;
  }

  private estimateCascadeProbability(
    adoption: number,
    threshold: number,
    clustering: number
  ): number {
    if (adoption >= threshold) return 0.95;

    // Probability increases as we approach threshold
    // Clustering helps local cascades
    const baseProbability = Math.pow(adoption / threshold, 2);
    const clusteringBonus = clustering * 0.2;

    return Math.min(0.95, baseProbability + clusteringBonus);
  }

  private identifyKeyInfluencers(metrics: NetworkMetrics): string[] {
    // Return top nodes by centrality
    return metrics.topCentralityNodes?.slice(0, 5) || [];
  }

  private identifyVulnerableSegments(dist: CriticalMassThresholdConfig): string[] {
    return dist.lowThresholdSegments || [];
  }

  private estimateTimeToTipping(
    current: number,
    threshold: number,
    metrics: NetworkMetrics
  ): number | undefined {
    if (current >= threshold) return 0;

    const growthRate = metrics.adoptionVelocity || 0.01;
    if (growthRate <= 0) return undefined;

    return (threshold - current) / growthRate;
  }

  private calculateCoverage(activated: Set<string>, network: AdjacencyList): number {
    return activated.size / network.size;
  }

  private simulateActivation(
    node: string,
    currentActive: Set<string>,
    network: AdjacencyList,
    thresholds: Map<string, number>
  ): number {
    const testActive = new Set(currentActive);
    testActive.add(node);

    let newActivations = 1;
    let changed = true;

    while (changed) {
      changed = false;
      for (const [n, neighbors] of network.entries()) {
        if (testActive.has(n)) continue;

        const activeNeighbors = neighbors.filter((nb) => testActive.has(nb)).length;
        const threshold = thresholds.get(n) || 0.5;

        if (activeNeighbors / neighbors.length >= threshold) {
          testActive.add(n);
          newActivations++;
          changed = true;
        }
      }
    }

    return newActivations;
  }

  private propagateActivation(
    node: string,
    activated: Set<string>,
    network: AdjacencyList,
    thresholds: Map<string, number>
  ): void {
    activated.add(node);

    let changed = true;
    while (changed) {
      changed = false;
      for (const [n, neighbors] of network.entries()) {
        if (activated.has(n)) continue;

        const activeNeighbors = neighbors.filter((nb) => activated.has(nb)).length;
        const threshold = thresholds.get(n) || 0.5;

        if (activeNeighbors / neighbors.length >= threshold) {
          activated.add(n);
          changed = true;
        }
      }
    }
  }
}

export interface NetworkMetrics {
  averageDegree: number;
  clusteringCoefficient: number;
  topCentralityNodes?: string[];
  adoptionVelocity?: number;
}

export interface CriticalMassThresholdConfig {
  type: 'SIMPLE' | 'COMPLEX';
  mean?: number;
  variance?: number;
  lowThresholdSegments?: string[];
}

export type AdjacencyList = Map<string, string[]>;
