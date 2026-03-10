/**
 * Diffusion and Lock-in Engine
 *
 * Models technology spread through networks and lock-in effects.
 */

import type {
  DiffusionSignal,
  NetworkMetrics,
  DiffusionState,
  DiffusionEstimate,
  BassDiffusionParams,
  LockInEffect
} from "../interfaces/diffusion.js";

import {
  evaluateBassDiffusion,
  thresholdDiffusion,
  estimateSwitchingCost,
  calculateLockIn
} from "../interfaces/diffusion.js";

import type { InnovationGraph, InnovationNode, InnovationEdge } from "../interfaces/innovation-graph.js";

export interface DiffusionEngineConfig {
  innovationCoeff: number;    // Bass model p parameter
  imitationCoeff: number;     // Bass model q parameter
  adoptionThreshold: number;  // Threshold for adoption
  timeHorizonDays: number;    // Forecast horizon
}

export const DEFAULT_DIFFUSION_CONFIG: DiffusionEngineConfig = {
  innovationCoeff: 0.03,
  imitationCoeff: 0.38,
  adoptionThreshold: 0.5,
  timeHorizonDays: 365
};

export class DiffusionEngine {
  private config: DiffusionEngineConfig;

  constructor(config: Partial<DiffusionEngineConfig> = {}) {
    this.config = { ...DEFAULT_DIFFUSION_CONFIG, ...config };
  }

  /**
   * Estimate diffusion for all nodes in graph
   */
  estimateDiffusion(graph: InnovationGraph): Map<string, DiffusionEstimate> {
    const estimates = new Map<string, DiffusionEstimate>();

    // Calculate network metrics for all nodes
    const networkMetrics = this.calculateNetworkMetrics(graph);

    // Calculate lock-in effects
    const lockInEffects = this.calculateLockInEffects(graph);

    for (const node of graph.nodes) {
      const metrics = networkMetrics.get(node.id);
      const lockIn = lockInEffects.get(node.id);

      if (!metrics || !lockIn) continue;

      const estimate = this.estimateNodeDiffusion(node, graph, metrics, lockIn);
      estimates.set(node.id, estimate);
    }

    return estimates;
  }

  /**
   * Calculate network metrics (centrality, clustering, etc.)
   */
  private calculateNetworkMetrics(graph: InnovationGraph): Map<string, NetworkMetrics> {
    const metrics = new Map<string, NetworkMetrics>();

    // Build adjacency lists
    const adjacency = new Map<string, Set<string>>();
    const inEdges = new Map<string, number>();
    const outEdges = new Map<string, number>();

    for (const node of graph.nodes) {
      adjacency.set(node.id, new Set());
      inEdges.set(node.id, 0);
      outEdges.set(node.id, 0);
    }

    for (const edge of graph.edges) {
      adjacency.get(edge.from)?.add(edge.to);
      inEdges.set(edge.to, (inEdges.get(edge.to) || 0) + 1);
      outEdges.set(edge.from, (outEdges.get(edge.from) || 0) + 1);
    }

    // Calculate metrics for each node
    for (const node of graph.nodes) {
      const inDegree = inEdges.get(node.id) || 0;
      const outDegree = outEdges.get(node.id) || 0;
      const degree = inDegree + outDegree;

      // Simple PageRank approximation (based on incoming edges)
      const pageRank = inDegree / Math.max(1, graph.edges.length);

      // Closeness approximation (inverse of average in-degree)
      const closeness = degree > 0 ? 1 / (1 + degree / graph.nodes.length) : 0;

      // Betweenness approximation (simplified)
      const betweenness = this.estimateBetweenness(node.id, graph);

      // Clustering coefficient
      const clusteringCoefficient = this.calculateClustering(node.id, adjacency);

      metrics.set(node.id, {
        nodeId: node.id,
        degree,
        inDegree,
        outDegree,
        betweenness,
        closeness,
        pageRank,
        clusteringCoefficient
      });
    }

    return metrics;
  }

  /**
   * Estimate betweenness centrality (simplified)
   */
  private estimateBetweenness(nodeId: string, graph: InnovationGraph): number {
    // Count edges that pass through this node
    const passingEdges = graph.edges.filter(e =>
      e.from === nodeId || e.to === nodeId
    ).length;

    return Math.min(1.0, passingEdges / Math.max(1, graph.edges.length));
  }

  /**
   * Calculate clustering coefficient
   */
  private calculateClustering(nodeId: string, adjacency: Map<string, Set<string>>): number {
    const neighbors = adjacency.get(nodeId);
    if (!neighbors || neighbors.size < 2) return 0;

    // Count edges between neighbors
    let edgeCount = 0;
    const neighborArray = Array.from(neighbors);

    for (let i = 0; i < neighborArray.length; i++) {
      for (let j = i + 1; j < neighborArray.length; j++) {
        const ni = neighborArray[i];
        const nj = neighborArray[j];

        if (adjacency.get(ni)?.has(nj) || adjacency.get(nj)?.has(ni)) {
          edgeCount++;
        }
      }
    }

    const maxEdges = (neighbors.size * (neighbors.size - 1)) / 2;
    return maxEdges > 0 ? edgeCount / maxEdges : 0;
  }

  /**
   * Calculate lock-in effects for all nodes
   */
  private calculateLockInEffects(graph: InnovationGraph): Map<string, LockInEffect> {
    const effects = new Map<string, LockInEffect>();

    for (const node of graph.nodes) {
      const lockIn = calculateLockIn(node.id, graph);
      effects.set(node.id, lockIn);
    }

    return effects;
  }

  /**
   * Estimate diffusion for a single node
   */
  private estimateNodeDiffusion(
    node: InnovationNode,
    graph: InnovationGraph,
    metrics: NetworkMetrics,
    lockIn: LockInEffect
  ): DiffusionEstimate {
    // Current adoption (proxy from evidence count)
    const currentAdoption = Math.min(1.0, node.evidenceRefs.length / 10);

    // Bass diffusion parameters
    const bassParams: BassDiffusionParams = {
      p: this.config.innovationCoeff,
      q: this.config.imitationCoeff * (metrics.pageRank + 0.1), // Network-adjusted
      m: 1.0 // Normalized market potential
    };

    // Predict future adoption
    const t30 = evaluateBassDiffusion(30, bassParams);
    const t90 = evaluateBassDiffusion(90, bassParams);
    const t180 = evaluateBassDiffusion(180, bassParams);
    const t365 = evaluateBassDiffusion(365, bassParams);

    // Diffusion rate (derivative of Bass model)
    const diffusionRate = (bassParams.p + bassParams.q * currentAdoption) * (1 - currentAdoption);

    // Find competitors (nodes with similar types)
    const competitors = graph.nodes
      .filter(n => n.type === node.type && n.id !== node.id)
      .map(n => n.id)
      .slice(0, 5);

    // Switching feasibility (inverse of lock-in strength)
    const switchingFeasibility = 1 - lockIn.strength;

    // Replacement risk (based on competitors and low lock-in)
    const replacementRisk = competitors.length > 0
      ? (competitors.length / 10) * switchingFeasibility
      : 0;

    // Confidence based on network metrics and data quality
    const confidence = Math.min(1.0,
      0.3 * metrics.degree / 10 +
      0.3 * (node.evidenceRefs.length / 5) +
      0.2 * lockIn.confidence +
      0.2
    );

    return {
      nodeId: node.id,
      currentAdoption,
      predictedAdoption: { t30, t90, t180, t365 },
      diffusionRate,
      networkMetrics: metrics,
      lockInEffect: lockIn,
      vulnerabilities: {
        competitors,
        switchingFeasibility,
        replacementRisk
      },
      confidence
    };
  }

  /**
   * Simulate network diffusion using threshold model
   */
  simulateThresholdDiffusion(
    graph: InnovationGraph,
    initialAdopters: string[],
    threshold: number,
    maxSteps: number = 100
  ): Map<number, DiffusionState[]> {
    const history = new Map<number, DiffusionState[]>();

    // Initialize adoption states
    const adoptionStates = new Map<string, DiffusionState>();

    for (const node of graph.nodes) {
      adoptionStates.set(node.id, {
        nodeId: node.id,
        adoptionLevel: initialAdopters.includes(node.id) ? 1.0 : 0.0,
        susceptibility: 0.5,
        exposureCount: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    // Build neighbor map
    const neighbors = new Map<string, string[]>();

    for (const node of graph.nodes) {
      const nodeNeighbors = graph.edges
        .filter(e => e.from === node.id || e.to === node.id)
        .map(e => e.from === node.id ? e.to : e.from);

      neighbors.set(node.id, nodeNeighbors);
    }

    // Simulate diffusion steps
    for (let step = 0; step < maxSteps; step++) {
      const stepStates: DiffusionState[] = [];
      let changed = false;

      for (const node of graph.nodes) {
        const state = adoptionStates.get(node.id)!;

        if (state.adoptionLevel >= 1.0) {
          // Already fully adopted
          stepStates.push({ ...state });
          continue;
        }

        const nodeNeighbors = neighbors.get(node.id) || [];

        if (thresholdDiffusion(node.id, nodeNeighbors, adoptionStates, threshold)) {
          // Adopt!
          state.adoptionLevel = 1.0;
          state.lastUpdated = new Date().toISOString();
          changed = true;
        }

        // Count exposures
        state.exposureCount = nodeNeighbors.filter(n => {
          const nState = adoptionStates.get(n);
          return nState && nState.adoptionLevel >= 1.0;
        }).length;

        stepStates.push({ ...state });
      }

      history.set(step, stepStates);

      if (!changed) {
        // Reached equilibrium
        break;
      }
    }

    return history;
  }

  /**
   * Calculate diffusion velocity (rate of spread)
   */
  calculateDiffusionVelocity(
    history: Map<number, DiffusionState[]>
  ): Array<{ step: number; adoptionCount: number; velocity: number }> {
    const velocities: Array<{ step: number; adoptionCount: number; velocity: number }> = [];

    let prevCount = 0;

    for (const [step, states] of history.entries()) {
      const adoptionCount = states.filter(s => s.adoptionLevel >= 1.0).length;
      const velocity = adoptionCount - prevCount;

      velocities.push({ step, adoptionCount, velocity });

      prevCount = adoptionCount;
    }

    return velocities;
  }
}
