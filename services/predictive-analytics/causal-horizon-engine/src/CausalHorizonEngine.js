"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CausalHorizonEngine = void 0;
const CausalGraph_js_1 = require("./models/CausalGraph.js");
const CounterfactualScenario_js_1 = require("./models/CounterfactualScenario.js");
const CausalInference_js_1 = require("./algorithms/CausalInference.js");
const PathAnalysis_js_1 = require("./algorithms/PathAnalysis.js");
const InterventionOptimizer_js_1 = require("./algorithms/InterventionOptimizer.js");
const CounterfactualSimulation_js_1 = require("./algorithms/CounterfactualSimulation.js");
const winston_1 = __importDefault(require("winston"));
/**
 * Main Causal Horizon Engine
 * Provides causal inference and counterfactual reasoning capabilities
 */
class CausalHorizonEngine {
    logger;
    graphs;
    scenarios;
    constructor() {
        this.graphs = new Map();
        this.scenarios = new Map();
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.simple(),
                }),
            ],
        });
    }
    /**
     * Create causal model from Neo4j graph data
     */
    async createCausalModel(investigationId, neo4jData, config = {}) {
        this.logger.info(`Creating causal model for investigation ${investigationId}`);
        const graph = new CausalGraph_js_1.CausalGraph(investigationId);
        // Add nodes
        for (const nodeData of neo4jData.nodes) {
            const node = {
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
            if (config.edgeConfidenceThreshold &&
                confidence < config.edgeConfidenceThreshold) {
                continue;
            }
            const edge = {
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
            }
            catch (error) {
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
        this.logger.info(`Created causal graph ${graph.id} with ${graph.nodes.size} nodes and ${graph.edges.size} edges`);
        return graph;
    }
    /**
     * Get causal graph by investigation ID
     */
    getCausalGraph(investigationId) {
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
    getCausalGraphById(graphId) {
        return this.graphs.get(graphId);
    }
    /**
     * Check if causal effect is identifiable
     */
    isIdentifiable(graphId, intervention, outcome) {
        const graph = this.graphs.get(graphId);
        if (!graph) {
            throw new Error(`Graph ${graphId} not found`);
        }
        return (0, CausalInference_js_1.isIdentifiable)(graph, intervention, outcome);
    }
    /**
     * Analyze causal paths between variables
     */
    analyzePaths(graphId, source, target) {
        const graph = this.graphs.get(graphId);
        if (!graph) {
            throw new Error(`Graph ${graphId} not found`);
        }
        return (0, PathAnalysis_js_1.analyzeCausalPaths)(graph, source, target);
    }
    /**
     * Simulate intervention and predict outcome
     */
    simulateIntervention(graphId, interventions, target, evidence) {
        const graph = this.graphs.get(graphId);
        if (!graph) {
            throw new Error(`Graph ${graphId} not found`);
        }
        this.logger.info(`Simulating intervention on ${interventions.map((i) => i.variable).join(', ')}`);
        return (0, CounterfactualSimulation_js_1.simulateCounterfactual)(graph, interventions, target, evidence);
    }
    /**
     * Find optimal intervention sets
     */
    findOptimalInterventions(graphId, target, constraints = {}, method = 'exhaustive') {
        const graph = this.graphs.get(graphId);
        if (!graph) {
            throw new Error(`Graph ${graphId} not found`);
        }
        this.logger.info(`Finding optimal interventions for target ${target.variable}`);
        switch (method) {
            case 'greedy': {
                const result = (0, InterventionOptimizer_js_1.greedySearch)(graph, target, constraints);
                return result ? [result] : [];
            }
            case 'beam':
                return (0, InterventionOptimizer_js_1.beamSearch)(graph, target, constraints, 5);
            case 'exhaustive':
            default:
                return (0, InterventionOptimizer_js_1.findOptimalInterventions)(graph, target, constraints);
        }
    }
    /**
     * Create counterfactual scenario
     */
    createScenario(graphId, name, interventions, target, description, evidence) {
        const graph = this.graphs.get(graphId);
        if (!graph) {
            throw new Error(`Graph ${graphId} not found`);
        }
        const scenario = (0, CounterfactualScenario_js_1.createScenario)(graphId, name, interventions, target, description, evidence);
        this.scenarios.set(scenario.id, scenario);
        return scenario;
    }
    /**
     * Run counterfactual scenario
     */
    runCounterfactual(scenario) {
        const graph = this.graphs.get(scenario.graphId);
        if (!graph) {
            throw new Error(`Graph ${scenario.graphId} not found`);
        }
        return (0, CounterfactualSimulation_js_1.simulateCounterfactual)(graph, scenario.interventions, scenario.target, scenario.evidence);
    }
    /**
     * Get counterfactual scenario by ID
     */
    getScenario(scenarioId) {
        return this.scenarios.get(scenarioId);
    }
    /**
     * List all scenarios for a graph
     */
    listScenarios(graphId) {
        return Array.from(this.scenarios.values()).filter((s) => s.graphId === graphId);
    }
    /**
     * Delete scenario
     */
    deleteScenario(scenarioId) {
        return this.scenarios.delete(scenarioId);
    }
    /**
     * Delete graph
     */
    deleteGraph(graphId) {
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
    listGraphs(limit, offset) {
        const graphs = Array.from(this.graphs.values());
        const start = offset || 0;
        const end = limit ? start + limit : graphs.length;
        return graphs.slice(start, end);
    }
    /**
     * Perform Monte Carlo simulation for uncertainty quantification
     */
    monteCarloSimulation(graphId, interventions, target, numSimulations = 1000, evidence) {
        const graph = this.graphs.get(graphId);
        if (!graph) {
            throw new Error(`Graph ${graphId} not found`);
        }
        return (0, CounterfactualSimulation_js_1.monteCarloSimulation)(graph, interventions, target, numSimulations, evidence);
    }
    // Private helper methods
    inferNodeType(nodeData) {
        // Infer from node properties
        if (nodeData.properties.isLatent || nodeData.type === 'Latent') {
            return CausalGraph_js_1.NodeType.LATENT;
        }
        if (nodeData.properties.isIntervention || nodeData.type === 'Intervention') {
            return CausalGraph_js_1.NodeType.INTERVENTION;
        }
        return CausalGraph_js_1.NodeType.OBSERVABLE;
    }
    inferDomain(nodeData) {
        // Infer from node properties
        const domain = nodeData.properties.domain;
        if (domain) {
            return domain;
        }
        // Heuristics based on type
        if (nodeData.type === 'Person' || nodeData.type === 'Event') {
            return CausalGraph_js_1.DomainType.CATEGORICAL;
        }
        return CausalGraph_js_1.DomainType.BINARY; // Default
    }
    inferEdgeType(relData) {
        // Infer from relationship type
        const type = relData.type.toUpperCase();
        if (type.includes('CONFOUND')) {
            return CausalGraph_js_1.EdgeType.CONFOUNDER;
        }
        if (type.includes('MEDIATE')) {
            return CausalGraph_js_1.EdgeType.MEDIATOR;
        }
        if (type.includes('COLLIDE')) {
            return CausalGraph_js_1.EdgeType.COLLIDER;
        }
        return CausalGraph_js_1.EdgeType.DIRECT_CAUSE; // Default
    }
    addLatentConfounders(graph) {
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
    breakCycles(graph) {
        // Simple strategy: remove weakest edge in each cycle
        while (graph.hasCycle()) {
            let weakestEdge = null;
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
            }
            else {
                break; // Safety check
            }
        }
    }
}
exports.CausalHorizonEngine = CausalHorizonEngine;
