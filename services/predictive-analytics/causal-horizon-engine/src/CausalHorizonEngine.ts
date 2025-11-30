import { CausalGraph, CausalNode, CausalEdge, NodeType, DomainType, EdgeType } from './models/CausalGraph.js';
import { Intervention, Target, Constraints, InterventionSet } from './models/Intervention.js';
import {
  CounterfactualScenario,
  CounterfactualResult,
  createScenario,
} from './models/CounterfactualScenario.js';
import {
  isIdentifiable,
  findBackdoorSets,
  findFrontdoorSets,
  backdoorAdjustment,
  frontdoorAdjustment,
  IdentifiabilityResult,
} from './algorithms/CausalInference.js';
import { analyzeCausalPaths, PathAnalysis } from './algorithms/PathAnalysis.js';
import {
  findOptimalInterventions,
  greedySearch,
  beamSearch,
} from './algorithms/InterventionOptimizer.js';
import { simulateCounterfactual, monteCarloSimulation } from './algorithms/CounterfactualSimulation.js';
import winston from 'winston';

export interface CausalModelConfig {
  edgeConfidenceThreshold?: number;
  includeLatentVariables?: boolean;
  temporalOrdering?: boolean;
  maxNodes?: number;
}

export interface Neo4jGraphData {
  nodes: Array<{
    id: string;
    type: string;
    properties: Record<string, any>;
  }>;
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    weight?: number;
    confidence?: number;
    timestamp?: number;
  }>;
}

/**
 * Main Causal Horizon Engine
 * Provides causal inference and counterfactual reasoning capabilities
 */
export class CausalHorizonEngine {
  private logger: winston.Logger;
  private graphs: Map<string, CausalGraph>;
  private scenarios: Map<string, CounterfactualScenario>;

  constructor() {
    this.graphs = new Map();
    this.scenarios = new Map();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  /**
   * Create causal model from Neo4j graph data
   */
  async createCausalModel(
    investigationId: string,
    neo4jData: Neo4jGraphData,
    config: CausalModelConfig = {}
  ): Promise<CausalGraph> {
    this.logger.info(`Creating causal model for investigation ${investigationId}`);

    const graph = new CausalGraph(investigationId);

    // Add nodes
    for (const nodeData of neo4jData.nodes) {
      const node: Omit<CausalNode, 'id'> = {
        name: nodeData.id,
        type: this.inferNodeType(nodeData),
        domain: this.inferDomain(nodeData),
        description: nodeData.properties.description,
        metadata: nodeData.properties,
      };

      graph.addNode(node);
    }

    // Add edges
    for (const relData of neo4jData.relationships) {
      // Filter by confidence threshold
      const confidence = relData.confidence || 0.8;
      if (
        config.edgeConfidenceThreshold &&
        confidence < config.edgeConfidenceThreshold
      ) {
        continue;
      }

      const edge: Omit<CausalEdge, 'id'> = {
        from: relData.from,
        to: relData.to,
        type: this.inferEdgeType(relData),
        strength: relData.weight || 0.5,
        confidence,
        mechanism: relData.type,
        metadata: { timestamp: relData.timestamp },
      };

      try {
        graph.addEdge(edge);
      } catch (error) {
        this.logger.warn(`Failed to add edge ${relData.from}->${relData.to}: ${error}`);
      }
    }

    // Add latent confounders if configured
    if (config.includeLatentVariables) {
      this.addLatentConfounders(graph);
    }

    // Validate graph
    if (graph.hasCycle()) {
      this.logger.warn('Graph contains cycles - attempting to resolve');
      this.breakCycles(graph);
    }

    this.graphs.set(graph.id, graph);
    this.logger.info(
      `Created causal graph ${graph.id} with ${graph.nodes.size} nodes and ${graph.edges.size} edges`
    );

    return graph;
  }

  /**
   * Get causal graph by investigation ID
   */
  getCausalGraph(investigationId: string): CausalGraph | undefined {
    for (const graph of this.graphs.values()) {
      if (graph.investigationId === investigationId) {
        return graph;
      }
    }
    return undefined;
  }

  /**
   * Get causal graph by ID
   */
  getCausalGraphById(graphId: string): CausalGraph | undefined {
    return this.graphs.get(graphId);
  }

  /**
   * Check if causal effect is identifiable
   */
  isIdentifiable(
    graphId: string,
    intervention: string,
    outcome: string
  ): IdentifiabilityResult {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    return isIdentifiable(graph, intervention, outcome);
  }

  /**
   * Analyze causal paths between variables
   */
  analyzePaths(
    graphId: string,
    source: string,
    target: string
  ): PathAnalysis {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    return analyzeCausalPaths(graph, source, target);
  }

  /**
   * Simulate intervention and predict outcome
   */
  simulateIntervention(
    graphId: string,
    interventions: Intervention[],
    target: Target,
    evidence?: Record<string, any>
  ): CounterfactualResult {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    this.logger.info(
      `Simulating intervention on ${interventions.map((i) => i.variable).join(', ')}`
    );

    return simulateCounterfactual(graph, interventions, target, evidence);
  }

  /**
   * Find optimal intervention sets
   */
  findOptimalInterventions(
    graphId: string,
    target: Target,
    constraints: Constraints = {},
    method: 'exhaustive' | 'greedy' | 'beam' = 'exhaustive'
  ): InterventionSet[] {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    this.logger.info(`Finding optimal interventions for target ${target.variable}`);

    switch (method) {
      case 'greedy': {
        const result = greedySearch(graph, target, constraints);
        return result ? [result] : [];
      }
      case 'beam':
        return beamSearch(graph, target, constraints, 5);
      case 'exhaustive':
      default:
        return findOptimalInterventions(graph, target, constraints);
    }
  }

  /**
   * Create counterfactual scenario
   */
  createScenario(
    graphId: string,
    name: string,
    interventions: Intervention[],
    target: Target,
    description?: string,
    evidence?: Record<string, any>
  ): CounterfactualScenario {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    const scenario = createScenario(
      graphId,
      name,
      interventions,
      target,
      description,
      evidence
    );

    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  /**
   * Run counterfactual scenario
   */
  runCounterfactual(scenario: CounterfactualScenario): CounterfactualResult {
    const graph = this.graphs.get(scenario.graphId);
    if (!graph) {
      throw new Error(`Graph ${scenario.graphId} not found`);
    }

    return simulateCounterfactual(
      graph,
      scenario.interventions,
      scenario.target,
      scenario.evidence
    );
  }

  /**
   * Get counterfactual scenario by ID
   */
  getScenario(scenarioId: string): CounterfactualScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * List all scenarios for a graph
   */
  listScenarios(graphId: string): CounterfactualScenario[] {
    return Array.from(this.scenarios.values()).filter(
      (s) => s.graphId === graphId
    );
  }

  /**
   * Delete scenario
   */
  deleteScenario(scenarioId: string): boolean {
    return this.scenarios.delete(scenarioId);
  }

  /**
   * Delete graph
   */
  deleteGraph(graphId: string): boolean {
    // Also delete associated scenarios
    const scenarios = this.listScenarios(graphId);
    for (const scenario of scenarios) {
      this.scenarios.delete(scenario.id);
    }

    return this.graphs.delete(graphId);
  }

  /**
   * List all graphs
   */
  listGraphs(limit?: number, offset?: number): CausalGraph[] {
    const graphs = Array.from(this.graphs.values());
    const start = offset || 0;
    const end = limit ? start + limit : graphs.length;
    return graphs.slice(start, end);
  }

  /**
   * Perform Monte Carlo simulation for uncertainty quantification
   */
  monteCarloSimulation(
    graphId: string,
    interventions: Intervention[],
    target: Target,
    numSimulations: number = 1000,
    evidence?: Record<string, any>
  ): {
    mean: number;
    variance: number;
    confidenceInterval: [number, number];
  } {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    return monteCarloSimulation(
      graph,
      interventions,
      target,
      numSimulations,
      evidence
    );
  }

  // Private helper methods

  private inferNodeType(nodeData: any): NodeType {
    // Infer from node properties
    if (nodeData.properties.isLatent || nodeData.type === 'Latent') {
      return NodeType.LATENT;
    }
    if (nodeData.properties.isIntervention || nodeData.type === 'Intervention') {
      return NodeType.INTERVENTION;
    }
    return NodeType.OBSERVABLE;
  }

  private inferDomain(nodeData: any): DomainType {
    // Infer from node properties
    const domain = nodeData.properties.domain;
    if (domain) {
      return domain as DomainType;
    }

    // Heuristics based on type
    if (nodeData.type === 'Person' || nodeData.type === 'Event') {
      return DomainType.CATEGORICAL;
    }

    return DomainType.BINARY; // Default
  }

  private inferEdgeType(relData: any): EdgeType {
    // Infer from relationship type
    const type = relData.type.toUpperCase();

    if (type.includes('CONFOUND')) {
      return EdgeType.CONFOUNDER;
    }
    if (type.includes('MEDIATE')) {
      return EdgeType.MEDIATOR;
    }
    if (type.includes('COLLIDE')) {
      return EdgeType.COLLIDER;
    }

    return EdgeType.DIRECT_CAUSE; // Default
  }

  private addLatentConfounders(graph: CausalGraph): void {
    // Find pairs of nodes that might have unmeasured common causes
    const nodes = Array.from(graph.nodes.values());

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        // Check if they're correlated but no direct edge
        if (!graph.hasPath(node1.id, node2.id) && !graph.hasPath(node2.id, node1.id)) {
          // Potentially add latent confounder
          // (In real implementation, would use statistical tests)
        }
      }
    }
  }

  private breakCycles(graph: CausalGraph): void {
    // Simple strategy: remove weakest edge in each cycle
    while (graph.hasCycle()) {
      let weakestEdge: CausalEdge | null = null;
      let minStrength = Infinity;

      // Find weakest edge
      for (const edge of graph.edges.values()) {
        const strength = Math.abs(edge.strength);
        if (strength < minStrength) {
          minStrength = strength;
          weakestEdge = edge;
        }
      }

      if (weakestEdge) {
        this.logger.warn(`Removing edge ${weakestEdge.id} to break cycle`);
        graph.removeEdge(weakestEdge.id);
      } else {
        break; // Safety check
      }
    }
  }
}
