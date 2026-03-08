"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphAnalysisService = void 0;
const neo4j_js_1 = require("../db/neo4j.js");
const shortestPath_js_1 = require("./algorithms/shortestPath.js");
const traversal_js_1 = require("./algorithms/traversal.js");
const centrality_js_1 = require("./algorithms/centrality.js");
const community_js_1 = require("./algorithms/community.js");
const uuid_1 = require("uuid");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class GraphAnalysisService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!GraphAnalysisService.instance) {
            GraphAnalysisService.instance = new GraphAnalysisService();
        }
        return GraphAnalysisService.instance;
    }
    // In-memory job storage for this pass (could be Redis/DB later)
    jobs = new Map();
    /**
     * Load graph slice from Neo4j into memory
     */
    async loadGraphSlice(tenantId, nodeLabels = [], edgeTypes = []) {
        const start = Date.now();
        // Default to all nodes/edges for the tenant if not specified
        // In a real scenario, we'd want stronger limits or pagination
        const nodeQuery = `
      MATCH (n)
      WHERE n.tenantId = $tenantId
      ${nodeLabels.length > 0 ? `AND any(l IN labels(n) WHERE l IN $nodeLabels)` : ''}
      RETURN n, labels(n) as lbls
      LIMIT 10000
    `;
        const edgeQuery = `
      MATCH (n)-[r]->(m)
      WHERE n.tenantId = $tenantId AND m.tenantId = $tenantId
      ${edgeTypes.length > 0 ? `AND type(r) IN $edgeTypes` : ''}
      RETURN n.id as source, m.id as target, r, type(r) as type
      LIMIT 50000
    `;
        try {
            const driver = (0, neo4j_js_1.getNeo4jDriver)();
            const session = driver.session();
            const nodeResult = await session.run(nodeQuery, { tenantId, nodeLabels });
            const edgeResult = await session.run(edgeQuery, { tenantId, edgeTypes });
            const nodes = nodeResult.records.map((record) => {
                const n = record.get('n').properties;
                const lbls = record.get('lbls');
                return {
                    id: n.id,
                    type: lbls[0] || 'Unknown', // Primary label
                    label: n.label || n.name || n.id,
                    tenantId: n.tenantId,
                    properties: n
                };
            });
            const edges = edgeResult.records.map((record) => {
                const r = record.get('r').properties;
                return {
                    id: r.id || `${record.get('source')}-${record.get('type')}-${record.get('target')}`, // Fallback ID
                    source: record.get('source'),
                    target: record.get('target'),
                    type: record.get('type'),
                    tenantId: tenantId, // Assumed from context
                    properties: r,
                    weight: r.weight ? Number(r.weight) : undefined
                };
            });
            logger_js_1.default.info(`Loaded graph slice for tenant ${tenantId}: ${nodes.length} nodes, ${edges.length} edges in ${Date.now() - start}ms`);
            await session.close();
            return { nodes, edges };
        }
        catch (error) {
            logger_js_1.default.error('Error loading graph slice', { error, tenantId });
            throw error;
        }
    }
    async createJob(tenantId, algorithm, params) {
        const job = {
            id: (0, uuid_1.v4)(),
            tenantId,
            algorithm,
            params,
            status: 'pending'
        };
        this.jobs.set(job.id, job);
        return job;
    }
    async runJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            throw new Error(`Job ${jobId} not found`);
        job.status = 'running';
        job.startTime = new Date();
        this.jobs.set(jobId, job);
        try {
            // 1. Load Data
            // For MVP, we load the "whole" tenant graph (up to limit).
            // Future: parse params to filter loading.
            const graph = await this.loadGraphSlice(job.tenantId);
            // 2. Run Algorithm
            let result;
            switch (job.algorithm) {
                case 'shortestPath': {
                    const p = job.params;
                    if (!p.sourceNodeId || !p.targetNodeId)
                        throw new Error("Missing sourceNodeId or targetNodeId");
                    result = (0, shortestPath_js_1.shortestPath)(graph, p.sourceNodeId, p.targetNodeId, p.maxDepth);
                    break;
                }
                case 'kHopNeighborhood': {
                    const p = job.params;
                    if (!p.sourceNodeId || !p.k)
                        throw new Error("Missing sourceNodeId or k");
                    result = (0, traversal_js_1.kHopNeighborhood)(graph, p.sourceNodeId, p.k, p.direction);
                    break;
                }
                case 'degreeCentrality': {
                    const p = job.params;
                    result = (0, centrality_js_1.degreeCentrality)(graph, p.direction, p.topK);
                    break;
                }
                case 'connectedComponents': {
                    result = (0, community_js_1.connectedComponents)(graph);
                    break;
                }
                default:
                    throw new Error(`Unknown algorithm: ${job.algorithm}`);
            }
            job.result = result;
            job.status = 'completed';
        }
        catch (error) {
            logger_js_1.default.error(`Graph analysis job ${jobId} failed`, error);
            job.status = 'failed';
            job.error = error.message;
        }
        finally {
            job.endTime = new Date();
            this.jobs.set(jobId, job);
        }
        return job;
    }
    getJob(jobId, tenantId) {
        const job = this.jobs.get(jobId);
        if (job && job.tenantId === tenantId)
            return job;
        return undefined;
    }
}
exports.GraphAnalysisService = GraphAnalysisService;
