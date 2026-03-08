"use strict";
/**
 * Hybrid Semantic Retriever
 * Combines pgvector semantic search with graph-based retrieval
 *
 * Features:
 * - pgvector ANN search for document retrieval
 * - Graph-based reranking using structural signals
 * - Context window optimization
 * - Reciprocal rank fusion for result merging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridSemanticRetriever = exports.SemanticSnippetSchema = void 0;
const zod_1 = require("zod");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const serviceLogger = logger_js_1.default.child({ name: 'HybridSemanticRetriever' });
// ============================================================================
// Types
// ============================================================================
exports.SemanticSnippetSchema = zod_1.z.object({
    id: zod_1.z.number(),
    entityId: zod_1.z.string(),
    kind: zod_1.z.string(),
    text: zod_1.z.string(),
    similarity: zod_1.z.number(),
    scope: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    provenance: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    timestamp: zod_1.z.string().optional(),
});
const DEFAULT_CONFIG = {
    vectorWeight: 0.6,
    graphWeight: 0.4,
    maxVectorResults: 50,
    maxGraphResults: 50,
    maxFusedResults: 20,
    minSimilarity: 0.5,
    rrf_k: 60,
    contextWindowTokens: 8000,
    enableReranking: true,
};
// ============================================================================
// Hybrid Semantic Retriever
// ============================================================================
class HybridSemanticRetriever {
    pgPool;
    neo4jDriver;
    embeddingService;
    config;
    constructor(pgPool, neo4jDriver, embeddingService, config) {
        this.pgPool = pgPool;
        this.neo4jDriver = neo4jDriver;
        this.embeddingService = embeddingService;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Perform hybrid search combining vector and graph results
     */
    async search(query, investigationId, options) {
        const startTime = Date.now();
        logger_js_1.default.info({
            queryLength: query.length,
            investigationId,
            focusEntities: options?.focusEntityIds?.length || 0,
        }, 'Starting hybrid search');
        // Generate query embedding
        const queryEmbedding = await this.embeddingService.generateEmbedding({
            text: query,
        });
        // Execute vector and graph searches in parallel
        const [vectorResult, graphResult] = await Promise.all([
            this.vectorSearch(queryEmbedding, investigationId, options),
            this.graphSearch(query, queryEmbedding, investigationId, options),
        ]);
        const fusionStartTime = Date.now();
        // Fuse results using Reciprocal Rank Fusion
        const fusedRankings = this.fuseResults(vectorResult.snippets, graphResult.nodes, vectorResult.timeMs, graphResult.timeMs);
        const fusionTimeMs = Date.now() - fusionStartTime;
        // Rerank if enabled
        let finalRankings = fusedRankings;
        if (this.config.enableReranking) {
            finalRankings = await this.rerank(fusedRankings, query, graphResult.nodes);
        }
        // Trim to context window
        const trimmedRankings = this.trimToContextWindow(finalRankings);
        const totalTimeMs = Date.now() - startTime;
        logger_js_1.default.info({
            vectorResults: vectorResult.snippets.length,
            graphResults: graphResult.nodes.length,
            fusedResults: trimmedRankings.length,
            totalTimeMs,
        }, 'Hybrid search completed');
        return {
            snippets: vectorResult.snippets,
            graphNodes: graphResult.nodes,
            graphEdges: graphResult.edges,
            fusedRankings: trimmedRankings,
            metrics: {
                vectorSearchTimeMs: vectorResult.timeMs,
                graphSearchTimeMs: graphResult.timeMs,
                fusionTimeMs,
                totalTimeMs,
                vectorResultCount: vectorResult.snippets.length,
                graphResultCount: graphResult.nodes.length,
                fusedResultCount: trimmedRankings.length,
            },
        };
    }
    /**
     * Vector search using pgvector
     */
    async vectorSearch(queryEmbedding, investigationId, options) {
        const startTime = Date.now();
        const client = await this.pgPool.connect();
        try {
            // Build dynamic WHERE clause
            const conditions = [];
            const params = [`[${queryEmbedding.join(',')}]`];
            if (options?.kinds?.length) {
                params.push(options.kinds);
                conditions.push(`kind = ANY($${params.length})`);
            }
            if (options?.scope) {
                params.push(JSON.stringify(options.scope));
                conditions.push(`scope @> $${params.length}::jsonb`);
            }
            if (options?.temporalWindow) {
                params.push(options.temporalWindow.start.toISOString());
                params.push(options.temporalWindow.end.toISOString());
                conditions.push(`ts >= $${params.length - 1}::timestamptz`);
                conditions.push(`ts <= $${params.length}::timestamptz`);
            }
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            params.push(this.config.maxVectorResults);
            // Use cosine distance for similarity search
            const query = `
        SELECT
          id,
          entity_id,
          kind,
          text,
          1 - (embedding <=> $1::vector) as similarity,
          scope,
          provenance,
          ts
        FROM rag_snippets
        ${whereClause}
        ORDER BY embedding <=> $1::vector
        LIMIT $${params.length}
      `;
            const result = await client.query(query, params);
            const snippets = result.rows
                .filter((row) => row.similarity >= this.config.minSimilarity)
                .map((row) => exports.SemanticSnippetSchema.parse({
                id: row.id,
                entityId: row.entity_id,
                kind: row.kind,
                text: row.text,
                similarity: row.similarity,
                scope: row.scope,
                provenance: row.provenance,
                timestamp: row.ts?.toISOString(),
            }));
            return {
                snippets,
                timeMs: Date.now() - startTime,
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Graph search using Neo4j
     */
    async graphSearch(query, queryEmbedding, investigationId, options) {
        const startTime = Date.now();
        const session = this.neo4jDriver.session();
        try {
            let cypher;
            let params;
            if (options?.focusEntityIds?.length) {
                // Search from focus entities
                cypher = `
          MATCH (focus:Entity)
          WHERE focus.id IN $focusIds AND focus.investigationId = $investigationId
          CALL apoc.path.subgraphAll(focus, {
            maxLevel: 2,
            relationshipFilter: 'RELATED_TO>|RELATIONSHIP>|IOC_CORRELATES>',
            labelFilter: 'Entity'
          }) YIELD nodes, relationships
          WITH nodes, relationships
          UNWIND nodes as node
          WITH DISTINCT node, relationships
          WHERE node.embedding IS NOT NULL
          WITH node, relationships,
               gds.similarity.cosine(node.embedding, $queryEmbedding) as similarity
          WHERE similarity >= $minSimilarity
          ORDER BY similarity DESC
          LIMIT $maxResults
          RETURN collect(DISTINCT node) as nodes,
                 [r IN relationships WHERE startNode(r).id IN [n IN collect(DISTINCT node) | n.id]
                  AND endNode(r).id IN [n IN collect(DISTINCT node) | n.id]] as edges
        `;
                params = {
                    focusIds: options.focusEntityIds,
                    investigationId,
                    queryEmbedding,
                    minSimilarity: this.config.minSimilarity,
                    maxResults: this.config.maxGraphResults,
                };
            }
            else {
                // Full-text + embedding search
                cypher = `
          CALL db.index.fulltext.queryNodes('entitySearch', $searchQuery)
          YIELD node, score as textScore
          WHERE node.investigationId = $investigationId
          WITH node, textScore
          ORDER BY textScore DESC
          LIMIT $maxResults
          OPTIONAL MATCH (node)-[r:RELATED_TO|RELATIONSHIP|IOC_CORRELATES]-(neighbor:Entity)
          WHERE neighbor.investigationId = $investigationId
          WITH node, textScore, collect(DISTINCT neighbor)[0..5] as neighbors,
               collect(DISTINCT r)[0..5] as edges
          RETURN node, textScore, neighbors, edges
        `;
                params = {
                    searchQuery: this.buildFullTextQuery(query),
                    investigationId,
                    maxResults: this.config.maxGraphResults,
                };
            }
            const result = await session.run(cypher, params);
            const nodes = [];
            const edges = [];
            const seenNodeIds = new Set();
            const seenEdgeIds = new Set();
            for (const record of result.records) {
                // Parse main node
                const node = record.get('node');
                if (node && !seenNodeIds.has(node.properties.id)) {
                    nodes.push(this.parseGraphNode(node));
                    seenNodeIds.add(node.properties.id);
                }
                // Parse neighbor nodes
                const neighbors = record.get('neighbors') || [];
                for (const neighbor of neighbors) {
                    if (!seenNodeIds.has(neighbor.properties.id)) {
                        nodes.push(this.parseGraphNode(neighbor));
                        seenNodeIds.add(neighbor.properties.id);
                    }
                }
                // Parse edges
                const recordEdges = record.get('edges') || [];
                for (const edge of recordEdges) {
                    const edgeId = `${edge.start}-${edge.end}-${edge.type}`;
                    if (!seenEdgeIds.has(edgeId)) {
                        edges.push(this.parseGraphEdge(edge));
                        seenEdgeIds.add(edgeId);
                    }
                }
            }
            return {
                nodes,
                edges,
                timeMs: Date.now() - startTime,
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Fuse vector and graph results using Reciprocal Rank Fusion
     */
    fuseResults(snippets, nodes, vectorTimeMs, graphTimeMs) {
        const k = this.config.rrf_k;
        const fusedScores = new Map();
        // Add vector results with RRF scoring
        for (let i = 0; i < snippets.length; i++) {
            const snippet = snippets[i];
            const rrfScore = this.config.vectorWeight * (1 / (k + i + 1));
            fusedScores.set(`snippet:${snippet.id}`, {
                id: String(snippet.id),
                type: 'snippet',
                score: rrfScore,
                content: snippet.text,
                metadata: {
                    entityId: snippet.entityId,
                    kind: snippet.kind,
                    similarity: snippet.similarity,
                    scope: snippet.scope,
                    provenance: snippet.provenance,
                },
            });
        }
        // Add graph results with RRF scoring
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const rrfScore = this.config.graphWeight * (1 / (k + i + 1));
            const key = `node:${node.id}`;
            if (fusedScores.has(key)) {
                // Combine scores if same entity appears in both
                const existing = fusedScores.get(key);
                existing.score += rrfScore;
            }
            else {
                fusedScores.set(key, {
                    id: node.id,
                    type: 'node',
                    score: rrfScore,
                    content: `${node.label}: ${node.properties.description || ''}`,
                    metadata: {
                        type: node.type,
                        label: node.label,
                        confidence: node.confidence,
                        threatScore: node.threatScore,
                    },
                });
            }
        }
        // Sort by fused score
        return Array.from(fusedScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, this.config.maxFusedResults);
    }
    /**
     * Rerank results using graph structure signals
     */
    async rerank(results, query, graphNodes) {
        // Build node adjacency map for centrality boosting
        const nodeIds = new Set(graphNodes.map(n => n.id));
        const session = this.neo4jDriver.session();
        try {
            // Get centrality scores for nodes
            const centralityResult = await session.run(`
        MATCH (n:Entity)
        WHERE n.id IN $nodeIds
        OPTIONAL MATCH (n)-[r]-(m)
        WITH n, count(DISTINCT m) as degree
        RETURN n.id as id, degree
      `, { nodeIds: Array.from(nodeIds) });
            const centralityScores = new Map();
            let maxDegree = 1;
            for (const record of centralityResult.records) {
                const degree = record.get('degree').toNumber();
                centralityScores.set(record.get('id'), degree);
                maxDegree = Math.max(maxDegree, degree);
            }
            // Apply centrality boost to scores
            return results.map(result => {
                let centralityBoost = 0;
                if (result.type === 'node') {
                    const degree = centralityScores.get(result.id) || 0;
                    centralityBoost = 0.1 * (degree / maxDegree);
                }
                else if (result.metadata.entityId) {
                    const degree = centralityScores.get(result.metadata.entityId) || 0;
                    centralityBoost = 0.05 * (degree / maxDegree);
                }
                return {
                    ...result,
                    score: result.score + centralityBoost,
                };
            }).sort((a, b) => b.score - a.score);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Trim results to fit context window
     */
    trimToContextWindow(results) {
        const avgTokensPerChar = 0.25; // Approximate tokens per character
        let totalTokens = 0;
        const trimmed = [];
        for (const result of results) {
            const estimatedTokens = Math.ceil(result.content.length * avgTokensPerChar);
            if (totalTokens + estimatedTokens <= this.config.contextWindowTokens) {
                trimmed.push(result);
                totalTokens += estimatedTokens;
            }
            else {
                // Truncate content to fit remaining space
                const remainingTokens = this.config.contextWindowTokens - totalTokens;
                const remainingChars = Math.floor(remainingTokens / avgTokensPerChar);
                if (remainingChars > 100) {
                    trimmed.push({
                        ...result,
                        content: result.content.substring(0, remainingChars) + '...',
                    });
                }
                break;
            }
        }
        return trimmed;
    }
    /**
     * Build full-text search query from natural language
     */
    buildFullTextQuery(query) {
        // Extract key terms and build Lucene query
        const terms = query
            .toLowerCase()
            .split(/\s+/)
            .filter(t => t.length > 2)
            .filter(t => !['the', 'and', 'for', 'with', 'that', 'this'].includes(t));
        return terms.map(t => `${t}~`).join(' ');
    }
    /**
     * Parse Neo4j node to GraphNode
     */
    parseGraphNode(node) {
        const props = node.properties;
        return {
            id: props.id,
            type: props.type || 'Entity',
            label: props.label || props.name || props.id,
            properties: props,
            embedding: props.embedding,
            confidence: props.confidence || 1.0,
            timestamp: props.timestamp,
            stixId: props.stixId,
            threatScore: props.threatScore,
        };
    }
    /**
     * Parse Neo4j relationship to GraphEdge
     */
    parseGraphEdge(edge) {
        return {
            id: `${edge.start}-${edge.end}`,
            type: edge.type,
            sourceId: String(edge.start),
            targetId: String(edge.end),
            properties: edge.properties || {},
            weight: edge.properties?.weight || 1.0,
            confidence: edge.properties?.confidence || 1.0,
        };
    }
    /**
     * Ingest document for vector search
     */
    async ingestDocument(entityId, kind, text, scope, provenance) {
        const embedding = await this.embeddingService.generateEmbedding({ text });
        const client = await this.pgPool.connect();
        try {
            const result = await client.query(`
        INSERT INTO rag_snippets (entity_id, kind, text, embedding, scope, provenance)
        VALUES ($1, $2, $3, $4::vector, $5, $6)
        RETURNING id
      `, [
                entityId,
                kind,
                text,
                `[${embedding.join(',')}]`,
                scope || {},
                provenance || {},
            ]);
            return result.rows[0].id;
        }
        finally {
            client.release();
        }
    }
    /**
     * Batch ingest documents
     */
    async batchIngest(documents) {
        const texts = documents.map(d => d.text);
        const embeddings = await this.embeddingService.generateBatchEmbeddings({ texts });
        const client = await this.pgPool.connect();
        const ids = [];
        try {
            await client.query('BEGIN');
            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                const embedding = embeddings[i];
                const result = await client.query(`
          INSERT INTO rag_snippets (entity_id, kind, text, embedding, scope, provenance)
          VALUES ($1, $2, $3, $4::vector, $5, $6)
          RETURNING id
        `, [
                    doc.entityId,
                    doc.kind,
                    doc.text,
                    `[${embedding.join(',')}]`,
                    doc.scope || {},
                    doc.provenance || {},
                ]);
                ids.push(result.rows[0].id);
            }
            await client.query('COMMIT');
            return ids;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.HybridSemanticRetriever = HybridSemanticRetriever;
