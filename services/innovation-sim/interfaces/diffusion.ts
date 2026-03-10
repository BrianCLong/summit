/**
 * Diffusion and Lock-in Types
 *
 * Models how innovations spread through networks and create lock-in effects
 * that resist migration to alternatives.
 */

export interface DiffusionSignal {
  timestamp: string;
  fromNode: string;
  toNode: string;
  channel: "dependency" | "adoption" | "mention" | "collaboration";
  strength: number;      // 0.0 - 1.0
  confidence: number;
}

export interface NetworkMetrics {
  nodeId: string;
  degree: number;              // Total connections
  inDegree: number;            // Incoming connections
  outDegree: number;           // Outgoing connections
  betweenness: number;         // Bridging centrality (0.0 - 1.0)
  closeness: number;           // Average distance to others (0.0 - 1.0)
  pageRank: number;            // Influence score (0.0 - 1.0)
  clusteringCoefficient: number; // Local clustering (0.0 - 1.0)
}

export interface DiffusionState {
  nodeId: string;
  adoptionLevel: number;       // 0.0 - 1.0
  susceptibility: number;      // Likelihood to adopt (0.0 - 1.0)
  exposureCount: number;       // Number of adopting neighbors
  lastUpdated: string;
}

export interface SwitchingCost {
  fromNode: string;
  toNode: string;
  costType: "technical" | "organizational" | "economic" | "cognitive" | "network";
  magnitude: number;           // 0.0 - 1.0 (normalized)
  factors: {
    retrainingCost?: number;
    migrationEffort?: number;
    compatibilityRisk?: number;
    networkEffect?: number;
    sunkenInvestment?: number;
  };
  confidence: number;
}

export interface LockInEffect {
  nodeId: string;
  strength: number;            // Overall lock-in strength (0.0 - 1.0)
  components: {
    networkEffect: number;     // Value from user base
    switchingCost: number;     // Barriers to leaving
    complementAssets: number;  // Ecosystem dependencies
    standardization: number;   // Industry entrenchment
  };
  dependencyGraph: {
    directDependents: string[];
    indirectDependents: string[];
    totalDependencyWeight: number;
  };
  confidence: number;
}

export interface DiffusionEstimate {
  nodeId: string;
  currentAdoption: number;
  predictedAdoption: {
    t30: number;               // 30 days
    t90: number;               // 90 days
    t180: number;              // 180 days
    t365: number;              // 365 days
  };
  diffusionRate: number;       // Current spread velocity
  networkMetrics: NetworkMetrics;
  lockInEffect: LockInEffect;
  vulnerabilities: {
    competitors: string[];     // Competing alternatives
    switchingFeasibility: number; // How easy to switch (0.0 - 1.0)
    replacementRisk: number;   // Risk of being replaced (0.0 - 1.0)
  };
  confidence: number;
}

/**
 * Bass Diffusion Model
 *
 * dA/dt = (p + q*A(t)) * (1 - A(t))
 *
 * Where:
 * - A(t): Adoption at time t
 * - p: Innovation coefficient (external influence)
 * - q: Imitation coefficient (network influence)
 *
 * Solution: A(t) = (1 - e^(-(p+q)t)) / (1 + (q/p)*e^(-(p+q)t))
 */
export interface BassDiffusionParams {
  p: number;  // Innovation coefficient (0.0 - 1.0)
  q: number;  // Imitation coefficient (0.0 - 1.0)
  m: number;  // Market potential (max adopters)
}

export function evaluateBassDiffusion(t: number, params: BassDiffusionParams): number {
  const { p, q, m } = params;

  if (q === 0) {
    // Pure innovation diffusion
    return m * (1 - Math.exp(-p * t));
  }

  const denominator = 1 + (q / p) * Math.exp(-(p + q) * t);
  const numerator = 1 - Math.exp(-(p + q) * t);

  return m * (numerator / denominator);
}

/**
 * Calculate network diffusion using threshold model
 *
 * Node adopts if: (adopting_neighbors / total_neighbors) >= threshold
 */
export function thresholdDiffusion(
  nodeId: string,
  neighbors: string[],
  adoptionStates: Map<string, DiffusionState>,
  threshold: number
): boolean {
  if (neighbors.length === 0) return false;

  const adoptingNeighbors = neighbors.filter(n => {
    const state = adoptionStates.get(n);
    return state && state.adoptionLevel >= threshold;
  }).length;

  return (adoptingNeighbors / neighbors.length) >= threshold;
}

/**
 * Calculate switching cost between two technologies
 */
export function estimateSwitchingCost(
  fromNode: string,
  toNode: string,
  graph: { nodes: any[]; edges: any[] }
): SwitchingCost {
  // Find nodes
  const from = graph.nodes.find(n => n.id === fromNode);
  const to = graph.nodes.find(n => n.id === toNode);

  if (!from || !to) {
    return {
      fromNode,
      toNode,
      costType: "technical",
      magnitude: 1.0,
      factors: {},
      confidence: 0
    };
  }

  // Count dependencies (higher = higher switching cost)
  const fromDeps = graph.edges.filter(e => e.from === fromNode).length;
  const toDeps = graph.edges.filter(e => e.from === toNode).length;

  const depRatio = fromDeps / Math.max(1, fromDeps + toDeps);

  // Network effect (more users = higher switching cost)
  const fromIncoming = graph.edges.filter(e => e.to === fromNode).length;
  const networkEffect = Math.min(1.0, fromIncoming / 10);

  // Compatibility (same type = lower cost)
  const compatibilityBonus = from.type === to.type ? -0.2 : 0;

  const magnitude = Math.max(0, Math.min(1.0,
    0.4 * depRatio +
    0.3 * networkEffect +
    0.3 * 0.5 + // Default migration effort
    compatibilityBonus
  ));

  return {
    fromNode,
    toNode,
    costType: fromDeps > 5 ? "network" : "technical",
    magnitude,
    factors: {
      migrationEffort: 0.5,
      networkEffect,
      compatibilityRisk: from.type !== to.type ? 0.3 : 0.1
    },
    confidence: 0.6
  };
}

/**
 * Calculate lock-in effect strength
 */
export function calculateLockIn(
  nodeId: string,
  graph: { nodes: any[]; edges: any[] }
): LockInEffect {
  const node = graph.nodes.find(n => n.id === nodeId);

  if (!node) {
    return {
      nodeId,
      strength: 0,
      components: {
        networkEffect: 0,
        switchingCost: 0,
        complementAssets: 0,
        standardization: 0
      },
      dependencyGraph: {
        directDependents: [],
        indirectDependents: [],
        totalDependencyWeight: 0
      },
      confidence: 0
    };
  }

  // Network effect: incoming edges (users/dependents)
  const incomingEdges = graph.edges.filter(e => e.to === nodeId);
  const networkEffect = Math.min(1.0, incomingEdges.length / 20);

  // Switching cost: outgoing edges (dependencies)
  const outgoingEdges = graph.edges.filter(e => e.from === nodeId);
  const switchingCost = Math.min(1.0, outgoingEdges.length / 15);

  // Complement assets: nodes that depend on this node
  const directDependents = incomingEdges.map(e => e.from);
  const complementAssets = Math.min(1.0, directDependents.length / 10);

  // Standardization: evidence count (proxy for entrenchment)
  const standardization = Math.min(1.0, node.evidenceRefs.length / 5);

  // Overall strength (weighted average)
  const strength = (
    0.35 * networkEffect +
    0.30 * switchingCost +
    0.20 * complementAssets +
    0.15 * standardization
  );

  // Find indirect dependents (2-hop)
  const indirectDependents = new Set<string>();
  for (const dep of directDependents) {
    const secondHop = graph.edges
      .filter(e => e.to === dep)
      .map(e => e.from);

    for (const node of secondHop) {
      if (!directDependents.includes(node)) {
        indirectDependents.add(node);
      }
    }
  }

  return {
    nodeId,
    strength,
    components: {
      networkEffect,
      switchingCost,
      complementAssets,
      standardization
    },
    dependencyGraph: {
      directDependents,
      indirectDependents: Array.from(indirectDependents),
      totalDependencyWeight: incomingEdges.reduce((sum, e) => sum + (e.weight || 1), 0)
    },
    confidence: 0.7
  };
}
