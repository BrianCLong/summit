"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathwayRewirer = void 0;
const OperationalPathway_1 = require("../models/OperationalPathway");
/**
 * PathwayRewirer Algorithm
 *
 * Dynamically rewires operational pathways based on predictive signals.
 * Implements strategies: BYPASS, PARALLEL, CONSOLIDATE, OPTIMIZE.
 */
class PathwayRewirer {
    logger;
    opaUrl;
    pathwayModel;
    driver = null;
    constructor(logger, opaUrl) {
        this.logger = logger;
        this.opaUrl = opaUrl;
        this.pathwayModel = new OperationalPathway_1.OperationalPathwayModel();
    }
    /**
     * Initialize with Neo4j driver
     */
    initialize(driver) {
        this.driver = driver;
    }
    /**
     * Rewire a pathway based on prediction
     */
    async rewirePathway(input, prediction) {
        this.logger.info({ pathwayId: input.pathwayId, strategy: input.strategy }, 'Rewiring pathway');
        // 1. Load current pathway
        const pathway = this.pathwayModel.getById(input.pathwayId);
        if (!pathway) {
            this.logger.error({ pathwayId: input.pathwayId }, 'Pathway not found');
            return null;
        }
        // 2. Generate new topology based on strategy
        const newTopology = await this.generateNewTopology(pathway, input.strategy, prediction);
        // 3. Simulate rewiring
        const simulation = this.pathwayModel.simulateRewiring(input.pathwayId, input.strategy, newTopology);
        if (!simulation) {
            this.logger.error('Failed to simulate rewiring');
            return null;
        }
        this.logger.info({ simulation }, 'Rewiring simulation complete');
        // 4. Check OPA policy
        const policyAllowed = await this.checkRewiringPolicy(pathway, newTopology, simulation, input.constraints);
        if (!policyAllowed) {
            this.logger.warn('Rewiring denied by policy');
            return null;
        }
        // 5. Execute rewiring (atomic graph mutation)
        if (this.driver) {
            await this.executeGraphRewiring(pathway, newTopology, input.strategy);
        }
        // 6. Update pathway model
        const rewiredPathway = this.pathwayModel.rewire(input.pathwayId, newTopology, `${input.strategy} rewiring due to prediction ${input.predictionId}`, input.predictionId, simulation.impact);
        if (rewiredPathway) {
            // Update metrics based on simulation
            this.pathwayModel.updateMetrics(input.pathwayId, simulation.projectedMetrics);
        }
        this.logger.info({ pathwayId: input.pathwayId }, 'Pathway rewired successfully');
        return rewiredPathway || null;
    }
    /**
     * Generate new topology based on rewiring strategy
     */
    async generateNewTopology(pathway, strategy, prediction) {
        const { topology } = pathway;
        switch (strategy) {
            case OperationalPathway_1.RewiringStrategy.BYPASS:
                return this.generateBypassTopology(topology, prediction);
            case OperationalPathway_1.RewiringStrategy.PARALLEL:
                return this.generateParallelTopology(topology);
            case OperationalPathway_1.RewiringStrategy.CONSOLIDATE:
                return this.generateConsolidatedTopology(topology);
            case OperationalPathway_1.RewiringStrategy.OPTIMIZE:
                return this.generateOptimizedTopology(topology);
            default:
                return topology;
        }
    }
    /**
     * Generate bypass topology (route around high-risk nodes)
     */
    async generateBypassTopology(topology, prediction) {
        if (!this.driver || !prediction) {
            // Fallback: just remove first intermediate node
            const newIntermediateNodes = topology.intermediateNodes.slice(1);
            return {
                ...topology,
                intermediateNodes: newIntermediateNodes,
                edges: this.rebuildEdges(topology.startNodeId, topology.endNodeId, newIntermediateNodes),
            };
        }
        // Find high-risk node to bypass
        const riskNodeId = prediction.nodeId;
        // Find alternative path in graph
        const alternativePath = await this.findAlternativePath(topology.startNodeId, topology.endNodeId, [riskNodeId]);
        if (alternativePath) {
            return alternativePath;
        }
        // Fallback: direct connection if possible
        return {
            ...topology,
            intermediateNodes: [],
            edges: [
                {
                    from: topology.startNodeId,
                    to: topology.endNodeId,
                    weight: 1.2, // Higher weight for direct bypass
                    properties: { type: 'bypass' },
                },
            ],
        };
    }
    /**
     * Generate parallel topology (add redundant pathways)
     */
    generateParallelTopology(topology) {
        // Create parallel path by duplicating current path
        const parallelNode = `parallel_${Date.now()}`;
        return Promise.resolve({
            ...topology,
            intermediateNodes: [...topology.intermediateNodes, parallelNode],
            edges: [
                ...topology.edges,
                {
                    from: topology.startNodeId,
                    to: parallelNode,
                    weight: 1.0,
                    properties: { type: 'parallel' },
                },
                {
                    from: parallelNode,
                    to: topology.endNodeId,
                    weight: 1.0,
                    properties: { type: 'parallel' },
                },
            ],
        });
    }
    /**
     * Generate consolidated topology (merge underutilized routes)
     */
    generateConsolidatedTopology(topology) {
        // Reduce intermediate nodes by half
        const consolidatedNodes = topology.intermediateNodes.filter((_, index) => index % 2 === 0);
        return Promise.resolve({
            ...topology,
            intermediateNodes: consolidatedNodes,
            edges: this.rebuildEdges(topology.startNodeId, topology.endNodeId, consolidatedNodes),
        });
    }
    /**
     * Generate optimized topology (balanced improvements)
     */
    async generateOptimizedTopology(topology) {
        if (!this.driver) {
            return topology;
        }
        // Find shortest path in graph
        const optimizedPath = await this.findShortestPath(topology.startNodeId, topology.endNodeId);
        return optimizedPath || topology;
    }
    /**
     * Find alternative path in Neo4j graph
     */
    async findAlternativePath(startNodeId, endNodeId, excludeNodes) {
        if (!this.driver)
            return null;
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (start {id: $startNodeId}), (end {id: $endNodeId})
        MATCH path = shortestPath((start)-[*..5]-(end))
        WHERE NONE(n IN nodes(path) WHERE n.id IN $excludeNodes)
        RETURN [n IN nodes(path) | n.id] as nodeIds,
               [r IN relationships(path) | {from: startNode(r).id, to: endNode(r).id, weight: coalesce(r.weight, 1.0)}] as edges
        LIMIT 1
      `, { startNodeId, endNodeId, excludeNodes });
            if (result.records.length === 0) {
                return null;
            }
            const nodeIds = result.records[0].get('nodeIds');
            const edges = result.records[0].get('edges');
            return {
                startNodeId,
                endNodeId,
                intermediateNodes: nodeIds.slice(1, -1),
                edges: edges.map((e) => ({
                    from: e.from,
                    to: e.to,
                    weight: e.weight,
                    properties: {},
                })),
            };
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to find alternative path');
            return null;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find shortest path in Neo4j graph
     */
    async findShortestPath(startNodeId, endNodeId) {
        return this.findAlternativePath(startNodeId, endNodeId, []);
    }
    /**
     * Rebuild edges for a linear path
     */
    rebuildEdges(startNodeId, endNodeId, intermediateNodes) {
        const allNodes = [startNodeId, ...intermediateNodes, endNodeId];
        const edges = [];
        for (let i = 0; i < allNodes.length - 1; i++) {
            edges.push({
                from: allNodes[i],
                to: allNodes[i + 1],
                weight: 1.0,
                properties: {},
            });
        }
        return edges;
    }
    /**
     * Check OPA policy for rewiring
     */
    async checkRewiringPolicy(pathway, newTopology, simulation, constraints) {
        if (!this.opaUrl) {
            this.logger.warn('OPA URL not configured, allowing by default');
            return true;
        }
        try {
            const input = {
                action: 'rewire_pathway',
                actor: 'predictive-orchestrator',
                pathwayId: pathway.id,
                currentMetrics: pathway.metrics,
                projectedMetrics: simulation.projectedMetrics,
                affectedNodes: [
                    pathway.topology.startNodeId,
                    ...pathway.topology.intermediateNodes,
                    pathway.topology.endNodeId,
                ],
                constraints: constraints || {},
            };
            const response = await fetch(`${this.opaUrl}/v1/data/orchestration/rewiring/allow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input }),
            });
            if (!response.ok) {
                throw new Error(`OPA request failed: ${response.statusText}`);
            }
            const result = await response.json();
            return result.result === true || result.result?.allow === true;
        }
        catch (error) {
            this.logger.error({ error }, 'OPA policy check failed, denying by default');
            return false;
        }
    }
    /**
     * Execute graph rewiring in Neo4j (atomic transaction)
     */
    async executeGraphRewiring(pathway, newTopology, strategy) {
        if (!this.driver)
            return;
        const session = this.driver.session();
        const tx = session.beginTransaction();
        try {
            // Deprecate old pathway edges
            await tx.run(`
        MATCH (start {id: $startId})-[r:PATHWAY*]->(end {id: $endId})
        SET r.status = 'DEPRECATED',
            r.deprecatedAt = datetime(),
            r.reason = $reason
      `, {
                startId: pathway.topology.startNodeId,
                endId: pathway.topology.endNodeId,
                reason: `${strategy} rewiring`,
            });
            // Create new pathway edges
            for (const edge of newTopology.edges) {
                await tx.run(`
          MATCH (from {id: $fromId}), (to {id: $toId})
          CREATE (from)-[:PATHWAY {
            status: 'ACTIVE',
            createdBy: 'predictive-orchestrator',
            activatedAt: datetime(),
            weight: $weight,
            properties: $properties
          }]->(to)
        `, {
                    fromId: edge.from,
                    toId: edge.to,
                    weight: edge.weight,
                    properties: JSON.stringify(edge.properties),
                });
            }
            await tx.commit();
            this.logger.info('Graph rewiring executed successfully');
        }
        catch (error) {
            await tx.rollback();
            this.logger.error({ error }, 'Graph rewiring failed, rolled back');
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Simulate rewiring
     */
    async simulateRewiring(input) {
        const pathway = this.pathwayModel.getById(input.pathwayId);
        if (!pathway) {
            return null;
        }
        const newTopology = await this.generateNewTopology(pathway, input.strategy, undefined);
        return this.pathwayModel.simulateRewiring(input.pathwayId, input.strategy, newTopology);
    }
    /**
     * Get pathway by ID
     */
    async getPathway(id) {
        return this.pathwayModel.getById(id);
    }
    /**
     * Get all pathways
     */
    async getPathways(filters) {
        return this.pathwayModel.getAll({
            type: filters?.type,
            status: filters?.status,
        });
    }
    /**
     * Create a new pathway (for testing/initialization)
     */
    async createPathway(input) {
        return this.pathwayModel.create(input);
    }
    /**
     * Get model instance (for testing)
     */
    getModel() {
        return this.pathwayModel;
    }
}
exports.PathwayRewirer = PathwayRewirer;
