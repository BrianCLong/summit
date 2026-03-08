"use strict";
/**
 * OutcomeAmplifier - Main service class for Recursive Outcome Amplifier™
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutcomeAmplifier = void 0;
const CascadeMap_js_1 = require("./models/CascadeMap.js");
const LeveragePoint_js_1 = require("./models/LeveragePoint.js");
const CascadeSimulator_js_1 = require("./algorithms/CascadeSimulator.js");
const PropagationEngine_js_1 = require("./algorithms/PropagationEngine.js");
const pino_1 = __importDefault(require("pino"));
class OutcomeAmplifier {
    simulator;
    context;
    neo4jDriver;
    logger;
    config;
    cascadeCache;
    constructor(config = {}) {
        this.config = {
            neo4jDriver: config.neo4jDriver,
            defaultMaxOrder: config.defaultMaxOrder ?? 5,
            defaultProbabilityThreshold: config.defaultProbabilityThreshold ?? 0.1,
            defaultMagnitudeThreshold: config.defaultMagnitudeThreshold ?? 0.1,
            enableCaching: config.enableCaching ?? true,
        };
        this.simulator = new CascadeSimulator_js_1.CascadeSimulator();
        this.context = (0, PropagationEngine_js_1.createDefaultContext)();
        this.neo4jDriver = config.neo4jDriver;
        this.logger = (0, pino_1.default)({ name: 'OutcomeAmplifier' });
        this.cascadeCache = new Map();
    }
    /**
     * Main entry point: Amplify outcomes for an event
     */
    async amplifyOutcome(event, options) {
        this.logger.info({ event, options }, 'Amplifying outcome');
        const simulationOptions = {
            maxOrder: options?.maxOrder ?? this.config.defaultMaxOrder,
            probabilityThreshold: options?.probabilityThreshold ??
                this.config.defaultProbabilityThreshold,
            magnitudeThreshold: options?.magnitudeThreshold ?? this.config.defaultMagnitudeThreshold,
            includeWeakLinks: options?.includeWeakLinks ?? false,
            timeHorizon: options?.timeHorizon,
        };
        try {
            // Run simulation
            const cascade = this.simulator.simulateCascade(event, simulationOptions, this.context);
            // Store in Neo4j if available
            if (this.neo4jDriver) {
                await this.storeCascadeInNeo4j(cascade);
            }
            // Cache result
            if (this.config.enableCaching) {
                this.cascadeCache.set(cascade.id, cascade);
            }
            this.logger.info({
                cascadeId: cascade.id,
                totalNodes: cascade.totalNodes,
                criticalPaths: cascade.criticalPaths.length,
            }, 'Cascade simulation complete');
            return cascade;
        }
        catch (error) {
            this.logger.error({ error, event }, 'Failed to amplify outcome');
            throw error;
        }
    }
    /**
     * Get cascade map by ID
     */
    async getCascadeMap(cascadeId) {
        // Check cache first
        if (this.config.enableCaching && this.cascadeCache.has(cascadeId)) {
            return this.cascadeCache.get(cascadeId);
        }
        // Try Neo4j if available
        if (this.neo4jDriver) {
            return this.loadCascadeFromNeo4j(cascadeId);
        }
        return null;
    }
    /**
     * Find leverage points in a cascade
     */
    async findLeveragePoints(cascadeId, options = {}) {
        const cascade = await this.getCascadeMap(cascadeId);
        if (!cascade) {
            throw new Error(`Cascade not found: ${cascadeId}`);
        }
        const leveragePoints = (0, LeveragePoint_js_1.filterLeveragePoints)(cascade.leveragePoints, {
            topN: options.topN ?? 10,
            minScore: options.minScore,
            maxCost: options.maxCost,
        });
        return leveragePoints;
    }
    /**
     * Get amplification path to specific node
     */
    async getAmplificationPath(cascadeId, targetNodeId) {
        const cascade = await this.getCascadeMap(cascadeId);
        if (!cascade) {
            throw new Error(`Cascade not found: ${cascadeId}`);
        }
        return this.simulator.findPathToNode(cascade, targetNodeId);
    }
    /**
     * Get amplification analysis
     */
    async getAmplificationAnalysis(cascadeId) {
        const cascade = await this.getCascadeMap(cascadeId);
        if (!cascade) {
            throw new Error(`Cascade not found: ${cascadeId}`);
        }
        const rootNode = cascade.nodes.find((n) => n.order === 1);
        if (!rootNode) {
            throw new Error('No root node found in cascade');
        }
        const totalMagnitude = cascade.nodes.reduce((sum, node) => sum + node.magnitude, 0);
        return {
            rootMagnitude: rootNode.magnitude,
            totalMagnitude,
            amplificationRatio: cascade.amplificationFactor,
            orderBreakdown: (0, CascadeMap_js_1.getAmplificationByOrder)(cascade),
        };
    }
    /**
     * List all cascades
     */
    async listCascades(limit = 20, offset = 0) {
        if (this.neo4jDriver) {
            return this.listCascadesFromNeo4j(limit, offset);
        }
        // Fallback to cache
        const cachedCascades = Array.from(this.cascadeCache.values());
        return cachedCascades.slice(offset, offset + limit);
    }
    /**
     * Store cascade in Neo4j
     */
    async storeCascadeInNeo4j(cascade) {
        if (!this.neo4jDriver)
            return;
        const session = this.neo4jDriver.session();
        try {
            const query = `
        MERGE (cm:CascadeMap {id: $cascadeId})
        SET cm.rootEvent = $rootEvent,
            cm.maxOrder = $maxOrder,
            cm.totalNodes = $totalNodes,
            cm.amplificationFactor = $amplificationFactor,
            cm.createdAt = datetime($createdAt)

        WITH cm
        UNWIND $nodes AS node
        MERGE (o:Outcome {id: node.id})
        SET o.event = node.event,
            o.order = node.order,
            o.probability = node.probability,
            o.magnitude = node.magnitude,
            o.domain = node.domain,
            o.confidence = node.confidence,
            o.timeDelay = node.timeDelay
        MERGE (cm)-[:CONTAINS]->(o)

        WITH cm
        UNWIND $edges AS edge
        MATCH (parent:Outcome {id: edge.parentId})
        MATCH (child:Outcome {id: edge.childId})
        MERGE (parent)-[r:CAUSES]->(child)
        SET r.strength = edge.strength,
            r.evidenceQuality = edge.evidenceQuality

        RETURN cm
      `;
            const edges = cascade.nodes.flatMap((node) => node.childNodes.map((childId) => {
                const child = cascade.nodes.find((n) => n.id === childId);
                return {
                    parentId: node.id,
                    childId,
                    strength: child?.probability ?? 0.5,
                    evidenceQuality: child?.evidenceStrength ?? 0.5,
                };
            }));
            await session.run(query, {
                cascadeId: cascade.id,
                rootEvent: cascade.rootEvent,
                maxOrder: cascade.maxOrder,
                totalNodes: cascade.totalNodes,
                amplificationFactor: cascade.amplificationFactor,
                createdAt: cascade.createdAt.toISOString(),
                nodes: cascade.nodes.map((n) => ({
                    id: n.id,
                    event: n.event,
                    order: n.order,
                    probability: n.probability,
                    magnitude: n.magnitude,
                    domain: n.domain,
                    confidence: n.confidence,
                    timeDelay: n.timeDelay,
                })),
                edges,
            });
            this.logger.info({ cascadeId: cascade.id }, 'Cascade stored in Neo4j');
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to store cascade in Neo4j');
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Load cascade from Neo4j
     */
    async loadCascadeFromNeo4j(cascadeId) {
        if (!this.neo4jDriver)
            return null;
        const session = this.neo4jDriver.session();
        try {
            const result = await session.run(`
        MATCH (cm:CascadeMap {id: $cascadeId})
        MATCH (cm)-[:CONTAINS]->(o:Outcome)
        OPTIONAL MATCH (o)-[r:CAUSES]->(child:Outcome)
        RETURN cm, collect(DISTINCT o) as nodes, collect(DISTINCT {parent: o.id, child: child.id, strength: r.strength}) as edges
      `, { cascadeId });
            if (result.records.length === 0)
                return null;
            const record = result.records[0];
            const cmNode = record.get('cm');
            const nodes = record.get('nodes');
            // Reconstruct cascade map
            // This is simplified - full implementation would reconstruct all relationships
            const cascade = {
                id: cmNode.properties.id,
                rootEvent: cmNode.properties.rootEvent,
                maxOrder: cmNode.properties.maxOrder,
                totalNodes: cmNode.properties.totalNodes,
                amplificationFactor: cmNode.properties.amplificationFactor,
                createdAt: new Date(cmNode.properties.createdAt),
                criticalPaths: [],
                leveragePoints: [],
                metadata: {},
                nodes: nodes.map((n) => ({
                    id: n.properties.id,
                    event: n.properties.event,
                    order: n.properties.order,
                    probability: n.properties.probability,
                    magnitude: n.properties.magnitude,
                    domain: n.properties.domain,
                    confidence: n.properties.confidence,
                    timeDelay: n.properties.timeDelay,
                    evidenceStrength: n.properties.evidenceStrength || 0.5,
                    parentNodes: [],
                    childNodes: [],
                    createdAt: new Date(),
                })),
            };
            return cascade;
        }
        catch (error) {
            this.logger.error({ error, cascadeId }, 'Failed to load cascade from Neo4j');
            return null;
        }
        finally {
            await session.close();
        }
    }
    /**
     * List cascades from Neo4j
     */
    async listCascadesFromNeo4j(limit, offset) {
        if (!this.neo4jDriver)
            return [];
        const session = this.neo4jDriver.session();
        try {
            const result = await session.run(`
        MATCH (cm:CascadeMap)
        RETURN cm
        ORDER BY cm.createdAt DESC
        SKIP $offset
        LIMIT $limit
      `, { offset, limit });
            return result.records.map((record) => {
                const cm = record.get('cm');
                return {
                    id: cm.properties.id,
                    rootEvent: cm.properties.rootEvent,
                    maxOrder: cm.properties.maxOrder,
                    totalNodes: cm.properties.totalNodes,
                    amplificationFactor: cm.properties.amplificationFactor,
                    createdAt: new Date(cm.properties.createdAt),
                    criticalPaths: [],
                    leveragePoints: [],
                    metadata: {},
                    nodes: [],
                };
            });
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to list cascades from Neo4j');
            return [];
        }
        finally {
            await session.close();
        }
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cascadeCache.clear();
        this.logger.info('Cache cleared');
    }
    /**
     * Get cache size
     */
    getCacheSize() {
        return this.cascadeCache.size;
    }
}
exports.OutcomeAmplifier = OutcomeAmplifier;
