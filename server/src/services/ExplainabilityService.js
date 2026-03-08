"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainabilityService = exports.ExplainabilityService = void 0;
const neo4j_js_1 = require("../db/neo4j.js");
const logger_js_1 = require("../config/logger.js");
class ExplainabilityService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ExplainabilityService.instance) {
            ExplainabilityService.instance = new ExplainabilityService();
        }
        return ExplainabilityService.instance;
    }
    /**
     * Explain why a node exists (provenance/lineage).
     * This is a heuristic implementation for v1.
     */
    async explainNode(nodeId) {
        const driver = (0, neo4j_js_1.getNeo4jDriver)();
        const session = driver.session({ defaultAccessMode: 'READ' });
        try {
            // Fetch node and related "Source" or "Document" nodes
            const query = `
                MATCH (n) WHERE elementId(n) = $nodeId OR id(n) = toInteger($nodeId)
                OPTIONAL MATCH (n)<-[:MENTIONS|CREATED]-(source)
                RETURN n, collect(distinct source) as sources
            `;
            const result = await session.run(query, { nodeId });
            if (result.records.length === 0) {
                throw new Error('Node not found');
            }
            const record = result.records[0];
            const node = record.get('n');
            const sourceNodes = record.get('sources');
            const sources = sourceNodes.map((s) => s.properties.name || s.properties.title || s.properties.url || 'Unknown');
            // Mock confidence score based on sources
            const confidence = sources.length > 0 ? 0.9 : 0.5;
            return {
                nodeId,
                labels: node.labels,
                properties: node.properties,
                provenance: {
                    sources,
                    confidence,
                    lineage: sources // For now lineage is just source list
                },
                paths: [] // TODO: Add path analysis (shortest path to key entities)
            };
        }
        catch (error) {
            logger_js_1.logger.error({ error, nodeId }, 'Explainability failed');
            throw error;
        }
        finally {
            await session.close();
        }
    }
}
exports.ExplainabilityService = ExplainabilityService;
exports.explainabilityService = ExplainabilityService.getInstance();
