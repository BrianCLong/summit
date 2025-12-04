import { CausalHorizonEngine, Neo4jGraphData } from '../CausalHorizonEngine.js';
import { CausalGraph } from '../models/CausalGraph.js';
import { InterventionType } from '../models/Intervention.js';

// Initialize engine instance
const engine = new CausalHorizonEngine();

export const causalHorizonResolvers = {
  Query: {
    /**
     * Get causal graph for an investigation
     */
    getCausalGraph: async (
      _parent: any,
      { investigationId }: { investigationId: string }
    ) => {
      const graph = engine.getCausalGraph(investigationId);
      if (!graph) {
        return null;
      }
      return formatGraphForGraphQL(graph);
    },

    /**
     * Get causal graph by ID
     */
    getCausalGraphById: async (
      _parent: any,
      { graphId }: { graphId: string }
    ) => {
      const graph = engine.getCausalGraphById(graphId);
      if (!graph) {
        return null;
      }
      return formatGraphForGraphQL(graph);
    },

    /**
     * Simulate intervention and predict outcome
     */
    simulateIntervention: async (
      _parent: any,
      {
        graphId,
        interventions,
        target,
        evidence,
      }: {
        graphId: string;
        interventions: any[];
        target: any;
        evidence?: any;
      }
    ) => {
      const result = engine.simulateIntervention(
        graphId,
        interventions.map((i) => ({
          ...i,
          type: InterventionType[i.type as keyof typeof InterventionType],
        })),
        target,
        evidence
      );

      return formatCounterfactualResult(result);
    },

    /**
     * Find optimal intervention sets
     */
    findOptimalInterventions: async (
      _parent: any,
      {
        graphId,
        target,
        constraints,
      }: {
        graphId: string;
        target: any;
        constraints?: any;
      }
    ) => {
      const interventionSets = engine.findOptimalInterventions(
        graphId,
        target,
        constraints || {}
      );

      return interventionSets.map((set) => ({
        interventions: set.interventions,
        totalCost: set.totalCost,
        expectedEffect: set.expectedEffect,
        confidence: set.confidence,
        rank: set.rank,
      }));
    },

    /**
     * Analyze causal paths between variables
     */
    getCausalPaths: async (
      _parent: any,
      {
        graphId,
        source,
        target,
      }: {
        graphId: string;
        source: string;
        target: string;
      }
    ) => {
      const analysis = engine.analyzePaths(graphId, source, target);

      return {
        source: analysis.source,
        target: analysis.target,
        directPaths: analysis.directPaths,
        indirectPaths: analysis.indirectPaths,
        totalEffect: analysis.totalEffect,
        directEffect: analysis.directEffect,
        indirectEffect: analysis.indirectEffect,
      };
    },

    /**
     * Check if causal effect is identifiable
     */
    isIdentifiable: async (
      _parent: any,
      {
        graphId,
        intervention,
        outcome,
      }: {
        graphId: string;
        intervention: string;
        outcome: string;
      }
    ) => {
      return engine.isIdentifiable(graphId, intervention, outcome);
    },

    /**
     * Get counterfactual scenario by ID
     */
    getCounterfactualScenario: async (
      _parent: any,
      { scenarioId }: { scenarioId: string }
    ) => {
      return engine.getScenario(scenarioId);
    },

    /**
     * List all causal graphs
     */
    listCausalGraphs: async (
      _parent: any,
      { limit, offset }: { limit?: number; offset?: number }
    ) => {
      const graphs = engine.listGraphs(limit, offset);
      return graphs.map((g) => formatGraphForGraphQL(g));
    },

    /**
     * List counterfactual scenarios for a graph
     */
    listScenarios: async (_parent: any, { graphId }: { graphId: string }) => {
      return engine.listScenarios(graphId);
    },
  },

  Mutation: {
    /**
     * Create causal model from Neo4j data
     */
    createCausalModel: async (
      _parent: any,
      {
        investigationId,
        config,
      }: {
        investigationId: string;
        config?: any;
      },
      context: any
    ) => {
      // Fetch Neo4j data (placeholder - would use actual Neo4j connection)
      const neo4jData = await fetchNeo4jData(investigationId, context);

      const graph = await engine.createCausalModel(
        investigationId,
        neo4jData,
        config || {}
      );

      return formatGraphForGraphQL(graph);
    },

    /**
     * Add intervention to scenario
     */
    addIntervention: async (
      _parent: any,
      {
        scenarioId,
        intervention,
      }: {
        scenarioId: string;
        intervention: any;
      }
    ) => {
      const scenario = engine.getScenario(scenarioId);
      if (!scenario) {
        throw new Error(`Scenario ${scenarioId} not found`);
      }

      scenario.interventions.push({
        ...intervention,
        type: InterventionType[intervention.type as keyof typeof InterventionType],
      });

      return scenario;
    },

    /**
     * Run counterfactual analysis
     */
    runCounterfactual: async (
      _parent: any,
      { scenario: scenarioInput }: { scenario: any }
    ) => {
      // Create scenario
      const scenario = engine.createScenario(
        scenarioInput.graphId,
        scenarioInput.name,
        scenarioInput.interventions.map((i: any) => ({
          ...i,
          type: InterventionType[i.type as keyof typeof InterventionType],
        })),
        scenarioInput.target,
        scenarioInput.description,
        scenarioInput.evidence
      );

      // Run simulation
      const result = engine.runCounterfactual(scenario);

      return formatCounterfactualResult(result);
    },

    /**
     * Update causal graph structure
     */
    updateCausalGraph: async (
      _parent: any,
      {
        graphId,
        updates,
      }: {
        graphId: string;
        updates: any;
      }
    ) => {
      const graph = engine.getCausalGraphById(graphId);
      if (!graph) {
        throw new Error(`Graph ${graphId} not found`);
      }

      // Apply updates
      if (updates.addNodes) {
        for (const nodeInput of updates.addNodes) {
          graph.addNode(nodeInput);
        }
      }

      if (updates.removeNodes) {
        for (const nodeId of updates.removeNodes) {
          graph.removeNode(nodeId);
        }
      }

      if (updates.addEdges) {
        for (const edgeInput of updates.addEdges) {
          graph.addEdge(edgeInput);
        }
      }

      if (updates.removeEdges) {
        for (const edgeId of updates.removeEdges) {
          graph.removeEdge(edgeId);
        }
      }

      return formatGraphForGraphQL(graph);
    },

    /**
     * Delete causal graph
     */
    deleteCausalGraph: async (_parent: any, { graphId }: { graphId: string }) => {
      return engine.deleteGraph(graphId);
    },

    /**
     * Create counterfactual scenario
     */
    createScenario: async (
      _parent: any,
      {
        graphId,
        name,
        description,
        interventions,
        target,
        evidence,
      }: {
        graphId: string;
        name: string;
        description?: string;
        interventions: any[];
        target: any;
        evidence?: any;
      }
    ) => {
      return engine.createScenario(
        graphId,
        name,
        interventions.map((i) => ({
          ...i,
          type: InterventionType[i.type as keyof typeof InterventionType],
        })),
        target,
        description,
        evidence
      );
    },

    /**
     * Delete counterfactual scenario
     */
    deleteScenario: async (_parent: any, { scenarioId }: { scenarioId: string }) => {
      return engine.deleteScenario(scenarioId);
    },
  },

  // Type resolvers
  CausalNode: {
    incomingEdges: (parent: any, _args: any, _context: any) => {
      const graph = engine.getCausalGraphById(parent.graphId);
      if (!graph) return [];

      const edges = [];
      for (const edge of graph.edges.values()) {
        if (edge.to === parent.id) {
          edges.push(formatEdge(edge, graph));
        }
      }
      return edges;
    },

    outgoingEdges: (parent: any, _args: any, _context: any) => {
      const graph = engine.getCausalGraphById(parent.graphId);
      if (!graph) return [];

      const edges = [];
      for (const edge of graph.edges.values()) {
        if (edge.from === parent.id) {
          edges.push(formatEdge(edge, graph));
        }
      }
      return edges;
    },

    ancestors: (parent: any, _args: any, _context: any) => {
      const graph = engine.getCausalGraphById(parent.graphId);
      if (!graph) return [];

      const ancestors = graph.getAncestors(parent.id);
      return Array.from(ancestors).map((nodeId) => {
        const node = graph.getNode(nodeId);
        return node ? { ...node, graphId: graph.id } : null;
      }).filter(Boolean);
    },

    descendants: (parent: any, _args: any, _context: any) => {
      const graph = engine.getCausalGraphById(parent.graphId);
      if (!graph) return [];

      const descendants = graph.getDescendants(parent.id);
      return Array.from(descendants).map((nodeId) => {
        const node = graph.getNode(nodeId);
        return node ? { ...node, graphId: graph.id } : null;
      }).filter(Boolean);
    },
  },

  CausalEdge: {
    from: (parent: any, _args: any, _context: any) => {
      const graph = engine.getCausalGraphById(parent.graphId);
      if (!graph) return null;

      const node = graph.getNode(parent.from);
      return node ? { ...node, graphId: graph.id } : null;
    },

    to: (parent: any, _args: any, _context: any) => {
      const graph = engine.getCausalGraphById(parent.graphId);
      if (!graph) return null;

      const node = graph.getNode(parent.to);
      return node ? { ...node, graphId: graph.id } : null;
    },
  },
};

// Helper functions

function formatGraphForGraphQL(graph: CausalGraph) {
  return {
    id: graph.id,
    investigationId: graph.investigationId,
    nodes: Array.from(graph.nodes.values()).map((node) => ({
      ...node,
      graphId: graph.id,
    })),
    edges: Array.from(graph.edges.values()).map((edge) => ({
      ...edge,
      graphId: graph.id,
    })),
    metadata: graph.metadata,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
  };
}

function formatEdge(edge: any, graph: CausalGraph) {
  return {
    ...edge,
    graphId: graph.id,
  };
}

function formatCounterfactualResult(result: any) {
  return {
    scenario: result.scenario,
    outcome: result.outcome,
    causalPaths: result.causalPaths,
    comparisonToFactual: result.comparisonToFactual,
    sensitivity: result.sensitivity,
  };
}

/**
 * Fetch Neo4j data for investigation
 * This is a placeholder - in production would connect to actual Neo4j
 */
async function fetchNeo4jData(
  investigationId: string,
  context: any
): Promise<Neo4jGraphData> {
  // Mock data for demonstration
  return {
    nodes: [
      {
        id: 'ThreatActor1',
        type: 'Person',
        properties: { name: 'Threat Actor 1', domain: 'CATEGORICAL' },
      },
      {
        id: 'ThreatActor2',
        type: 'Person',
        properties: { name: 'Threat Actor 2', domain: 'CATEGORICAL' },
      },
      {
        id: 'Infrastructure',
        type: 'Asset',
        properties: { name: 'Infrastructure', domain: 'CATEGORICAL' },
      },
      {
        id: 'Malware',
        type: 'Tool',
        properties: { name: 'Malware', domain: 'CATEGORICAL' },
      },
      {
        id: 'Victim',
        type: 'Person',
        properties: { name: 'Victim', domain: 'BINARY' },
      },
    ],
    relationships: [
      {
        from: 'ThreatActor1',
        to: 'ThreatActor2',
        type: 'FUNDS',
        weight: 0.8,
        confidence: 0.9,
      },
      {
        from: 'ThreatActor2',
        to: 'Infrastructure',
        type: 'OPERATES',
        weight: 0.7,
        confidence: 0.85,
      },
      {
        from: 'Infrastructure',
        to: 'Malware',
        type: 'HOSTS',
        weight: 0.9,
        confidence: 0.95,
      },
      {
        from: 'Malware',
        to: 'Victim',
        type: 'TARGETS',
        weight: 0.75,
        confidence: 0.8,
      },
    ],
  };
}

export default causalHorizonResolvers;
