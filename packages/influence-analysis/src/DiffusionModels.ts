/**
 * Influence propagation and diffusion models
 */

import type { Graph, DiffusionModel, PropagationResult, InfluenceScore } from '@intelgraph/network-analysis';

export class DiffusionSimulator {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Independent Cascade Model simulation
   */
  independentCascade(
    seedNodes: Set<string>,
    activationProbability = 0.1,
    maxIterations = 100
  ): PropagationResult {
    const activated = new Set<string>(seedNodes);
    const activationTimes = new Map<string, number>();

    // Initialize seed nodes at time 0
    seedNodes.forEach(node => activationTimes.set(node, 0));

    let newlyActivated = new Set<string>(seedNodes);
    let iteration = 0;

    while (newlyActivated.size > 0 && iteration < maxIterations) {
      const nextActivated = new Set<string>();

      // Each newly activated node tries to activate its neighbors
      newlyActivated.forEach(activeNode => {
        this.graph.edges.forEach(edge => {
          if (edge.source === activeNode) {
            const target = edge.target;

            // If target is not already activated
            if (!activated.has(target)) {
              // Try to activate with probability
              const prob = edge.weight || activationProbability;
              if (Math.random() < prob) {
                activated.add(target);
                nextActivated.add(target);
                activationTimes.set(target, iteration + 1);
              }
            }
          }
        });
      });

      newlyActivated = nextActivated;
      iteration++;
    }

    return {
      seedNodes,
      activatedNodes: activated,
      activationTimes,
      cascadeSize: activated.size
    };
  }

  /**
   * Linear Threshold Model simulation
   */
  linearThreshold(
    seedNodes: Set<string>,
    thresholds?: Map<string, number>,
    maxIterations = 100
  ): PropagationResult {
    const activated = new Set<string>(seedNodes);
    const activationTimes = new Map<string, number>();

    // Initialize seed nodes at time 0
    seedNodes.forEach(node => activationTimes.set(node, 0));

    // Set random thresholds if not provided
    const nodeThresholds = thresholds || this.generateRandomThresholds();

    // Calculate influence weights
    const influenceWeights = this.calculateInfluenceWeights();

    let newlyActivated = new Set<string>(seedNodes);
    let iteration = 0;

    while (newlyActivated.size > 0 && iteration < maxIterations) {
      const nextActivated = new Set<string>();

      // Check each inactive node
      this.graph.nodes.forEach((_, nodeId) => {
        if (!activated.has(nodeId)) {
          // Calculate total influence from activated neighbors
          let totalInfluence = 0;

          this.graph.edges.forEach(edge => {
            if (edge.target === nodeId && activated.has(edge.source)) {
              const weight = influenceWeights.get(`${edge.source}-${nodeId}`) || 0;
              totalInfluence += weight;
            }
          });

          // Activate if threshold is exceeded
          const threshold = nodeThresholds.get(nodeId) || 0.5;
          if (totalInfluence >= threshold) {
            activated.add(nodeId);
            nextActivated.add(nodeId);
            activationTimes.set(nodeId, iteration + 1);
          }
        }
      });

      newlyActivated = nextActivated;
      iteration++;
    }

    return {
      seedNodes,
      activatedNodes: activated,
      activationTimes,
      cascadeSize: activated.size
    };
  }

  /**
   * Simulate multiple cascades and return average results
   */
  monteCarloSimulation(
    seedNodes: Set<string>,
    model: DiffusionModel,
    numSimulations = 1000
  ): {
    averageCascadeSize: number;
    standardDeviation: number;
    cascadeSizes: number[];
  } {
    const cascadeSizes: number[] = [];

    for (let i = 0; i < numSimulations; i++) {
      let result: PropagationResult;

      if (model.type === 'independent_cascade') {
        result = this.independentCascade(
          seedNodes,
          model.parameters.activationProbability || 0.1
        );
      } else if (model.type === 'linear_threshold') {
        result = this.linearThreshold(seedNodes);
      } else {
        throw new Error(`Unknown diffusion model: ${model.type}`);
      }

      cascadeSizes.push(result.cascadeSize);
    }

    const average = cascadeSizes.reduce((a, b) => a + b, 0) / numSimulations;
    const variance =
      cascadeSizes.reduce((sum, size) => sum + Math.pow(size - average, 2), 0) / numSimulations;
    const standardDeviation = Math.sqrt(variance);

    return {
      averageCascadeSize: average,
      standardDeviation,
      cascadeSizes
    };
  }

  /**
   * Calculate expected influence spread for each node
   */
  calculateInfluenceScores(numSimulations = 100): Map<string, InfluenceScore> {
    const scores = new Map<string, InfluenceScore>();

    this.graph.nodes.forEach((_, nodeId) => {
      const seedSet = new Set([nodeId]);
      const simulation = this.monteCarloSimulation(
        seedSet,
        { type: 'independent_cascade', parameters: { activationProbability: 0.1 } },
        numSimulations
      );

      scores.set(nodeId, {
        nodeId,
        influenceValue: simulation.averageCascadeSize,
        reachability: simulation.averageCascadeSize / this.graph.nodes.size,
        spreadProbability: simulation.averageCascadeSize > 1 ? 1 : 0
      });
    });

    return scores;
  }

  /**
   * Generate random thresholds for nodes
   */
  private generateRandomThresholds(): Map<string, number> {
    const thresholds = new Map<string, number>();

    this.graph.nodes.forEach((_, nodeId) => {
      thresholds.set(nodeId, Math.random());
    });

    return thresholds;
  }

  /**
   * Calculate influence weights for linear threshold model
   */
  private calculateInfluenceWeights(): Map<string, number> {
    const weights = new Map<string, number>();

    // Calculate in-degree for each node
    const inDegrees = new Map<string, number>();
    this.graph.nodes.forEach((_, nodeId) => {
      inDegrees.set(nodeId, 0);
    });

    this.graph.edges.forEach(edge => {
      inDegrees.set(edge.target, (inDegrees.get(edge.target) || 0) + 1);
    });

    // Normalize edge weights by in-degree
    this.graph.edges.forEach(edge => {
      const inDegree = inDegrees.get(edge.target) || 1;
      const weight = (edge.weight || 1) / inDegree;
      weights.set(`${edge.source}-${edge.target}`, weight);
    });

    return weights;
  }
}

/**
 * Influence Maximization algorithms
 */
export class InfluenceMaximization {
  private graph: Graph;
  private simulator: DiffusionSimulator;

  constructor(graph: Graph) {
    this.graph = graph;
    this.simulator = new DiffusionSimulator(graph);
  }

  /**
   * Greedy algorithm for influence maximization
   */
  greedyMaximization(
    k: number,
    model: DiffusionModel,
    numSimulations = 100
  ): Set<string> {
    const selectedSeeds = new Set<string>();
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < k; i++) {
      let bestNode = '';
      let bestInfluence = 0;

      // Try each unselected node
      for (const nodeId of nodeIds) {
        if (!selectedSeeds.has(nodeId)) {
          const testSeeds = new Set([...selectedSeeds, nodeId]);
          const simulation = this.simulator.monteCarloSimulation(testSeeds, model, numSimulations);

          if (simulation.averageCascadeSize > bestInfluence) {
            bestInfluence = simulation.averageCascadeSize;
            bestNode = nodeId;
          }
        }
      }

      if (bestNode) {
        selectedSeeds.add(bestNode);
      }
    }

    return selectedSeeds;
  }

  /**
   * Degree-based heuristic for seed selection
   */
  degreeHeuristic(k: number): Set<string> {
    const degrees = new Map<string, number>();

    this.graph.nodes.forEach((_, nodeId) => {
      let degree = 0;
      this.graph.edges.forEach(edge => {
        if (edge.source === nodeId) degree++;
      });
      degrees.set(nodeId, degree);
    });

    // Sort by degree and select top k
    const sorted = Array.from(degrees.entries()).sort((a, b) => b[1] - a[1]);
    return new Set(sorted.slice(0, k).map(([nodeId]) => nodeId));
  }

  /**
   * PageRank-based heuristic for seed selection
   */
  pageRankHeuristic(k: number): Set<string> {
    const pageRank = this.calculatePageRank();

    // Sort by PageRank and select top k
    const sorted = Array.from(pageRank.entries()).sort((a, b) => b[1] - a[1]);
    return new Set(sorted.slice(0, k).map(([nodeId]) => nodeId));
  }

  /**
   * Simple PageRank calculation
   */
  private calculatePageRank(dampingFactor = 0.85, maxIterations = 100): Map<string, number> {
    const n = this.graph.nodes.size;
    const scores = new Map<string, number>();

    // Initialize
    this.graph.nodes.forEach((_, nodeId) => {
      scores.set(nodeId, 1 / n);
    });

    // Calculate out-degrees
    const outDegrees = new Map<string, number>();
    this.graph.nodes.forEach((_, nodeId) => {
      let degree = 0;
      this.graph.edges.forEach(edge => {
        if (edge.source === nodeId) degree++;
      });
      outDegrees.set(nodeId, degree || 1);
    });

    // Iterate
    for (let iter = 0; iter < maxIterations; iter++) {
      const newScores = new Map<string, number>();

      this.graph.nodes.forEach((_, nodeId) => {
        let sum = 0;

        this.graph.edges.forEach(edge => {
          if (edge.target === nodeId) {
            sum += (scores.get(edge.source) || 0) / (outDegrees.get(edge.source) || 1);
          }
        });

        newScores.set(nodeId, (1 - dampingFactor) / n + dampingFactor * sum);
      });

      scores.clear();
      newScores.forEach((score, nodeId) => scores.set(nodeId, score));
    }

    return scores;
  }
}
