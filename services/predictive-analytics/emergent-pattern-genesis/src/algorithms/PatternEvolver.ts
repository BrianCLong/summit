/**
 * Pattern Evolver
 * Simulates how proto-patterns develop into full patterns
 */

import { ProtoPatternModel } from '../models/ProtoPattern.js';

export interface Trajectory {
  id: string;
  simulationRun: number;
  timeSteps: TrajectoryStep[];
  finalState: Record<string, any>;
  probability: number;
  convergenceTime?: number;
}

export interface TrajectoryStep {
  time: number;
  state: Record<string, any>;
  strength: number;
  completeness: number;
}

export interface EvolutionConstraints {
  maxNodes?: number;
  maxEdges?: number;
  allowedNodeTypes?: string[];
  allowedEdgeTypes?: string[];
  temporalConstraints?: Record<string, any>;
  domainRules?: Record<string, any>;
}

export interface EvolutionConfig {
  simulations: number;
  timeSteps: number;
  convergenceThreshold: number;
  growthRate: number;
  mutationRate: number;
}

export class PatternEvolver {
  private random: () => number;

  constructor(seed?: number) {
    // Use seeded random for reproducibility
    this.random = seed !== undefined ? this.seededRandom(seed) : Math.random;
  }

  /**
   * Evolve proto-pattern through Monte Carlo simulation
   */
  async evolvePattern(
    protoPattern: ProtoPatternModel,
    config: EvolutionConfig,
    constraints?: EvolutionConstraints
  ): Promise<Trajectory[]> {
    const trajectories: Trajectory[] = [];

    for (let run = 0; run < config.simulations; run++) {
      const trajectory = await this.simulateTrajectory(
        protoPattern,
        config,
        constraints,
        run
      );

      trajectories.push(trajectory);
    }

    // Analyze trajectories and calculate probabilities
    const analyzed = this.analyzeTrajectories(trajectories);

    return analyzed;
  }

  /**
   * Simulate a single evolution trajectory
   */
  private async simulateTrajectory(
    protoPattern: ProtoPatternModel,
    config: EvolutionConfig,
    constraints: EvolutionConstraints | undefined,
    runNumber: number
  ): Promise<Trajectory> {
    const steps: TrajectoryStep[] = [];

    // Initialize state from proto-pattern
    let currentState = this.initializeState(protoPattern);

    steps.push({
      time: 0,
      state: { ...currentState },
      strength: protoPattern.confidence,
      completeness: protoPattern.completeness,
    });

    let converged = false;
    let convergenceTime: number | undefined;

    // Simulate forward
    for (let t = 1; t <= config.timeSteps; t++) {
      // Apply evolution rules
      currentState = this.evolveState(
        currentState,
        config,
        constraints
      );

      // Calculate metrics
      const strength = this.calculateStrength(currentState);
      const completeness = this.calculateCompleteness(
        currentState,
        protoPattern.expectedPattern
      );

      steps.push({
        time: t,
        state: { ...currentState },
        strength: strength,
        completeness: completeness,
      });

      // Check for convergence
      if (
        !converged &&
        this.hasConverged(steps, config.convergenceThreshold)
      ) {
        converged = true;
        convergenceTime = t;
      }

      // Early termination if converged
      if (converged && t > convergenceTime! + 10) {
        break;
      }
    }

    return {
      id: `traj_${runNumber}`,
      simulationRun: runNumber,
      timeSteps: steps,
      finalState: currentState,
      probability: 0, // Will be calculated later
      convergenceTime: convergenceTime,
    };
  }

  /**
   * Initialize state from proto-pattern
   */
  private initializeState(
    protoPattern: ProtoPatternModel
  ): Record<string, any> {
    return {
      nodes: protoPattern.partialMotif.subgraph?.nodes || [],
      edges: protoPattern.partialMotif.subgraph?.edges || [],
      features: { ...protoPattern.partialMotif.features },
      strength: protoPattern.confidence,
    };
  }

  /**
   * Evolve state by one time step
   */
  private evolveState(
    state: Record<string, any>,
    config: EvolutionConfig,
    constraints?: EvolutionConstraints
  ): Record<string, any> {
    const newState = { ...state };

    // Growth: add nodes and edges
    if (this.random() < config.growthRate) {
      this.addNode(newState, constraints);
    }

    if (this.random() < config.growthRate * 0.8) {
      this.addEdge(newState, constraints);
    }

    // Mutation: modify existing structure
    if (this.random() < config.mutationRate) {
      this.mutateStructure(newState, constraints);
    }

    // Apply domain constraints
    if (constraints?.domainRules) {
      this.applyDomainRules(newState, constraints.domainRules);
    }

    // Update strength
    newState.strength = this.calculateStrength(newState);

    return newState;
  }

  /**
   * Add a node to the pattern
   */
  private addNode(
    state: Record<string, any>,
    constraints?: EvolutionConstraints
  ): void {
    if (
      constraints?.maxNodes &&
      state.nodes.length >= constraints.maxNodes
    ) {
      return;
    }

    const allowedTypes = constraints?.allowedNodeTypes || [
      'entity',
      'event',
      'location',
    ];
    const nodeType =
      allowedTypes[Math.floor(this.random() * allowedTypes.length)];

    const newNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: nodeType,
      label: `${nodeType}_${state.nodes.length + 1}`,
      timestamp: new Date(),
    };

    state.nodes.push(newNode);
    state.features.nodeCount = state.nodes.length;
  }

  /**
   * Add an edge to the pattern
   */
  private addEdge(
    state: Record<string, any>,
    constraints?: EvolutionConstraints
  ): void {
    if (state.nodes.length < 2) {
      return;
    }

    if (
      constraints?.maxEdges &&
      state.edges.length >= constraints.maxEdges
    ) {
      return;
    }

    const allowedTypes = constraints?.allowedEdgeTypes || [
      'related',
      'connected',
      'influences',
    ];
    const edgeType =
      allowedTypes[Math.floor(this.random() * allowedTypes.length)];

    // Select random source and target
    const sourceIdx = Math.floor(this.random() * state.nodes.length);
    let targetIdx = Math.floor(this.random() * state.nodes.length);

    // Ensure source != target
    while (targetIdx === sourceIdx && state.nodes.length > 1) {
      targetIdx = Math.floor(this.random() * state.nodes.length);
    }

    const newEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: edgeType,
      source: state.nodes[sourceIdx].id,
      target: state.nodes[targetIdx].id,
      timestamp: new Date(),
    };

    state.edges.push(newEdge);
    state.features.edgeCount = state.edges.length;
    state.features.density =
      state.nodes.length > 1
        ? (2 * state.edges.length) /
          (state.nodes.length * (state.nodes.length - 1))
        : 0;
  }

  /**
   * Mutate structure
   */
  private mutateStructure(
    state: Record<string, any>,
    constraints?: EvolutionConstraints
  ): void {
    // Randomly choose mutation type
    const mutationType = this.random();

    if (mutationType < 0.3 && state.edges.length > 0) {
      // Remove random edge
      const idx = Math.floor(this.random() * state.edges.length);
      state.edges.splice(idx, 1);
    } else if (mutationType < 0.6 && state.nodes.length > 2) {
      // Remove random node and its edges
      const idx = Math.floor(this.random() * state.nodes.length);
      const nodeId = state.nodes[idx].id;
      state.nodes.splice(idx, 1);
      state.edges = state.edges.filter(
        (e: any) => e.source !== nodeId && e.target !== nodeId
      );
    } else if (state.edges.length > 0) {
      // Rewire random edge
      const edgeIdx = Math.floor(this.random() * state.edges.length);
      const nodeIdx = Math.floor(this.random() * state.nodes.length);
      const edge = state.edges[edgeIdx];

      if (this.random() < 0.5) {
        edge.source = state.nodes[nodeIdx].id;
      } else {
        edge.target = state.nodes[nodeIdx].id;
      }
    }

    // Update features
    state.features.nodeCount = state.nodes.length;
    state.features.edgeCount = state.edges.length;
  }

  /**
   * Apply domain-specific rules
   */
  private applyDomainRules(
    state: Record<string, any>,
    rules: Record<string, any>
  ): void {
    // Example: enforce maximum hub degree
    if (rules.maxHubDegree) {
      const degrees = new Map<string, number>();

      for (const edge of state.edges) {
        degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
        degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
      }

      // Remove edges from nodes exceeding max degree
      state.edges = state.edges.filter((edge: any) => {
        return (
          (degrees.get(edge.source) || 0) <= rules.maxHubDegree &&
          (degrees.get(edge.target) || 0) <= rules.maxHubDegree
        );
      });
    }
  }

  /**
   * Calculate pattern strength
   */
  private calculateStrength(state: Record<string, any>): number {
    // Strength based on size and connectivity
    const nodeScore = Math.min(1, state.nodes.length / 10);
    const edgeScore = Math.min(1, state.edges.length / 20);
    const densityScore = state.features.density || 0;

    return (nodeScore + edgeScore + densityScore) / 3;
  }

  /**
   * Calculate completeness relative to expected pattern
   */
  private calculateCompleteness(
    state: Record<string, any>,
    expectedPattern?: Record<string, any>
  ): number {
    if (!expectedPattern) {
      return 0.5;
    }

    const expected = expectedPattern.features || {};
    const current = state.features || {};

    let matchScore = 0;
    let totalFeatures = 0;

    for (const [key, value] of Object.entries(expected)) {
      totalFeatures++;
      if (current[key] !== undefined) {
        // Normalize comparison
        const similarity =
          typeof value === 'number' && typeof current[key] === 'number'
            ? 1 - Math.abs(value - current[key]) / Math.max(value, current[key])
            : value === current[key]
            ? 1
            : 0;

        matchScore += Math.max(0, similarity);
      }
    }

    return totalFeatures > 0 ? matchScore / totalFeatures : 0;
  }

  /**
   * Check if trajectory has converged
   */
  private hasConverged(
    steps: TrajectoryStep[],
    threshold: number
  ): boolean {
    if (steps.length < 5) {
      return false;
    }

    // Check if last 5 steps are within threshold
    const recent = steps.slice(-5);
    const avgStrength =
      recent.reduce((sum, s) => sum + s.strength, 0) / recent.length;

    for (const step of recent) {
      if (Math.abs(step.strength - avgStrength) > threshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Analyze trajectories and calculate probabilities
   */
  private analyzeTrajectories(trajectories: Trajectory[]): Trajectory[] {
    // Cluster final states
    const clusters = this.clusterFinalStates(trajectories);

    // Calculate probability for each cluster
    for (const cluster of clusters) {
      const probability = cluster.members.length / trajectories.length;

      for (const trajectory of cluster.members) {
        trajectory.probability = probability;
      }
    }

    return trajectories.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Cluster final states
   */
  private clusterFinalStates(trajectories: Trajectory[]): any[] {
    const clusters: any[] = [];

    for (const trajectory of trajectories) {
      let assigned = false;

      for (const cluster of clusters) {
        const similarity = this.stateSimilarity(
          trajectory.finalState,
          cluster.centroid
        );

        if (similarity > 0.7) {
          cluster.members.push(trajectory);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        clusters.push({
          centroid: trajectory.finalState,
          members: [trajectory],
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate similarity between two states
   */
  private stateSimilarity(
    state1: Record<string, any>,
    state2: Record<string, any>
  ): number {
    const nodeSimilarity =
      1 -
      Math.abs(state1.nodes.length - state2.nodes.length) /
        Math.max(state1.nodes.length, state2.nodes.length);

    const edgeSimilarity =
      1 -
      Math.abs(state1.edges.length - state2.edges.length) /
        Math.max(state1.edges.length, state2.edges.length);

    return (nodeSimilarity + edgeSimilarity) / 2;
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
}
