"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorArtService = void 0;
// @ts-nocheck
const database_js_1 = require("../../config/database.js");
const EmbeddingService_js_1 = __importDefault(require("../../services/EmbeddingService.js"));
class PriorArtService {
    static instance;
    embeddingService;
    constructor() {
        this.embeddingService = new EmbeddingService_js_1.default();
    }
    static getInstance() {
        if (!PriorArtService.instance) {
            PriorArtService.instance = new PriorArtService();
        }
        return PriorArtService.instance;
    }
    async findSimilar(text, tenantId, limit = 10) {
        const embedding = await this.embeddingService.generateEmbedding({ text });
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            // Use vector index for similarity search
            // Note: Assuming 'patent_embedding_index' exists as defined in schema.ts
            // TODO: Migrate to Cypher 25 for Neo4j 2025.01+
            // db.index.vector.queryNodes is deprecated. Use native VECTOR type and vector search.
            const result = await session.run(`
        CALL db.index.vector.queryNodes('patent_embedding_index', $limit, $embedding)
        YIELD node, score
        WHERE node.tenantId = $tenantId OR node.tenantId IS NULL
        RETURN node, score
      `, {
                limit,
                embedding,
                tenantId
            });
            return result.records.map(r => ({
                ...r.get('node').properties,
                score: r.get('score')
            }));
        }
        finally {
            await session.close();
        }
    }
    async clusterPatents(tenantId) {
        // Simplified graph-based community detection (Louvain) on CITATION or SIMILARITY graph
        // In a real impl, we might use GDS or external Python ML service
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            // 1. Create similarity links based on embeddings if not exist (naive O(N^2) for demo,
            // production would use KNN)
            // For MVP, we'll skip the heavy computation and just assume
            // we are running a community detection on existing CITES relationships.
            /*
            await session.run(`
              CALL gds.louvain.write({
                  nodeProjection: 'Patent',
                  relationshipProjection: 'CITES',
                  writeProperty: 'communityId'
              })
            `);
            */
            // Mock clustering logic: Group by classification (IPC) as a proxy
            await session.run(`
            MATCH (p:Patent)
            WHERE p.tenantId = $tenantId
            UNWIND p.classification AS ipc
            MERGE (c:PriorArtCluster {name: ipc, tenantId: $tenantId})
            MERGE (p)-[:BELONGS_TO]->(c)
         `, { tenantId });
        }
        finally {
            await session.close();
        }
    }
}
exports.PriorArtService = PriorArtService;
