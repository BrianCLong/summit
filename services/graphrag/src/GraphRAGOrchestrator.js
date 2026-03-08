"use strict";
/**
 * GraphRAG Orchestrator
 * Main service coordinating all GraphRAG components
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRAGOrchestrator = void 0;
exports.createGraphRAGOrchestrator = createGraphRAGOrchestrator;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const api_1 = require("@opentelemetry/api");
const index_js_1 = require("./types/index.js");
const GraphRetriever_js_1 = require("./retrieval/GraphRetriever.js");
const DocumentRetriever_js_1 = require("./retrieval/DocumentRetriever.js");
const kg2ragPipeline_js_1 = require("./kg2rag/kg2ragPipeline.js");
const TemporalRetriever_js_1 = require("./retrieval/TemporalRetriever.js");
const PolicyRetriever_js_1 = require("./retrieval/PolicyRetriever.js");
const CitationManager_js_1 = require("./citation/CitationManager.js");
const ContextFusion_js_1 = require("./fusion/ContextFusion.js");
const CounterfactualEngine_js_1 = require("./analysis/CounterfactualEngine.js");
const LLMIntegration_js_1 = require("./llm/LLMIntegration.js");
const tracer = api_1.trace.getTracer('graphrag-orchestrator');
class GraphRAGOrchestrator {
    driver;
    graphRetriever;
    documentRetriever;
    temporalRetriever;
    policyRetriever;
    citationManager;
    contextFusion;
    counterfactualEngine;
    kg2ragPipeline;
    llm;
    config;
    constructor(config) {
        this.config = { ...index_js_1.DEFAULT_CONFIG, ...config };
        // Initialize Neo4j driver
        this.driver = neo4j_driver_1.default.driver(config.neo4j.uri, neo4j_driver_1.default.auth.basic(config.neo4j.username, config.neo4j.password));
        // Initialize LLM
        const llmConfig = {
            provider: 'openai',
            model: config.openai.model,
            embeddingModel: config.openai.embeddingModel,
            apiKey: config.openai.apiKey,
            maxTokens: config.generation.maxTokens,
            temperature: config.generation.temperature,
            topP: config.generation.topP,
            costPerInputToken: 0.00001,
            costPerOutputToken: 0.00003,
        };
        this.llm = new LLMIntegration_js_1.LLMIntegration(llmConfig);
        // Initialize retrievers
        this.graphRetriever = new GraphRetriever_js_1.GraphRetriever(this.driver, {
            maxHops: config.retrieval.maxHops,
            maxNodes: config.retrieval.maxNodes,
            minRelevance: config.retrieval.minRelevance,
        });
        this.documentRetriever = new DocumentRetriever_js_1.DocumentRetriever(config.openai.apiKey, config.redis.url, {
            maxDocuments: config.retrieval.maxDocuments,
            minRelevance: config.retrieval.minRelevance,
        });
        this.temporalRetriever = new TemporalRetriever_js_1.TemporalRetriever(this.driver);
        this.policyRetriever = new PolicyRetriever_js_1.PolicyRetriever(this.driver, config.policy.opaEndpoint);
        // Initialize other components
        this.citationManager = new CitationManager_js_1.CitationManager(this.driver);
        this.contextFusion = new ContextFusion_js_1.ContextFusion({
            maxTokens: config.generation.maxTokens * 2,
        });
        this.counterfactualEngine = new CounterfactualEngine_js_1.CounterfactualEngine(this.driver, this.llm);
        this.kg2ragPipeline = new kg2ragPipeline_js_1.Kg2RagPipeline({
            documentRetriever: this.documentRetriever,
            driver: this.driver,
        });
    }
    /**
     * Main query method - orchestrates the full RAG pipeline
     */
    async query(query, options = {}) {
        return tracer.startActiveSpan('graphrag_query', async (span) => {
            const startTime = Date.now();
            const timings = {
                retrieval: 0,
                fusion: 0,
                generation: 0,
            };
            try {
                span.setAttribute('query.length', query.query.length);
                span.setAttribute('query.tenantId', query.tenantId);
                // Phase 1: Retrieval
                const retrievalStart = Date.now();
                const retrievalResult = await this.performRetrieval(query, options);
                timings.retrieval = Date.now() - retrievalStart;
                span.setAttribute('retrieval.timeMs', timings.retrieval);
                span.setAttribute('retrieval.chunks', retrievalResult.evidenceChunks.length);
                // Phase 2: Policy enforcement
                let evidenceChunks = retrievalResult.evidenceChunks;
                if (options.policyContext) {
                    const policyResult = await this.policyRetriever.retrieveWithPolicy(evidenceChunks, options.policyContext);
                    evidenceChunks = [...policyResult.allowed, ...policyResult.redacted];
                    span.setAttribute('policy.denied', policyResult.denied.length);
                }
                // Phase 3: Context fusion
                const fusionStart = Date.now();
                const fusedContext = await this.performFusion(evidenceChunks, options);
                timings.fusion = Date.now() - fusionStart;
                span.setAttribute('fusion.timeMs', timings.fusion);
                // Phase 4: Answer generation
                const generationStart = Date.now();
                const answer = await this.generateAnswer(query, evidenceChunks, options);
                timings.generation = Date.now() - generationStart;
                span.setAttribute('generation.timeMs', timings.generation);
                // Phase 5: Optional counterfactuals
                let counterfactuals;
                let sensitivityAnalysis;
                if (options.includeCounterfactuals) {
                    counterfactuals = await this.counterfactualEngine.generateCounterfactuals(answer, evidenceChunks);
                    span.setAttribute('counterfactuals.count', counterfactuals.length);
                }
                if (options.includeSensitivityAnalysis) {
                    sensitivityAnalysis = await this.counterfactualEngine.analyzeSensitivity(answer, evidenceChunks);
                    span.setAttribute('sensitivity.robustness', sensitivityAnalysis.robustnessScore);
                }
                const totalTime = Date.now() - startTime;
                span.setAttribute('total.timeMs', totalTime);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return {
                    answer,
                    retrievalResult,
                    fusedContext,
                    counterfactuals,
                    sensitivityAnalysis,
                    metadata: {
                        totalProcessingTimeMs: totalTime,
                        retrievalTimeMs: timings.retrieval,
                        fusionTimeMs: timings.fusion,
                        generationTimeMs: timings.generation,
                        totalCost: this.llm.getTotalCost(),
                    },
                };
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Perform multi-source retrieval
     */
    async performRetrieval(query, options) {
        if (query.strategy === 'KG2RAG') {
            return this.performKg2RagRetrieval(query, options);
        }
        // Run retrievers in parallel
        const [graphResult, documentChunks, temporalChunks] = await Promise.all([
            this.graphRetriever.retrieve(query),
            this.documentRetriever.retrieve(query),
            options.temporalScope
                ? this.temporalRetriever.retrieve(query, options.temporalScope)
                : Promise.resolve([]),
        ]);
        // Merge evidence chunks
        const allChunks = [
            ...graphResult.evidenceChunks,
            ...documentChunks,
            ...temporalChunks,
        ];
        // Deduplicate and rank
        const rankedChunks = this.rankAndDeduplicateChunks(allChunks);
        return {
            ...graphResult,
            evidenceChunks: rankedChunks,
            totalDocumentsSearched: documentChunks.length,
        };
    }
    /**
     * Perform context fusion
     */
    async performFusion(evidenceChunks, options) {
        const graphEvidence = evidenceChunks.filter((c) => c.citations.some((ci) => ci.sourceType === 'graph'));
        const documentEvidence = evidenceChunks.filter((c) => c.citations.some((ci) => ci.sourceType === 'document'));
        const temporalEvidence = evidenceChunks.filter((c) => c.temporalContext);
        return this.contextFusion.fuse(graphEvidence, documentEvidence, temporalEvidence);
    }
    /**
     * Generate answer from evidence
     */
    async generateAnswer(query, evidenceChunks, options) {
        return this.llm.generateAnswer(query.query, evidenceChunks, {
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            includeReasoning: true,
        });
    }
    /**
     * Rank and deduplicate evidence chunks
     */
    rankAndDeduplicateChunks(chunks) {
        const seen = new Set();
        const unique = [];
        // Sort by relevance
        const sorted = [...chunks].sort((a, b) => b.relevanceScore - a.relevanceScore);
        for (const chunk of sorted) {
            // Simple deduplication by content hash
            const hash = this.hashContent(chunk.content);
            if (!seen.has(hash)) {
                seen.add(hash);
                unique.push(chunk);
            }
        }
        return unique;
    }
    /**
     * Hash content for deduplication
     */
    hashContent(content) {
        const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
        let hash = 0;
        for (let i = 0; i < Math.min(normalized.length, 200); i++) {
            hash = (hash << 5) - hash + normalized.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    /**
     * Index a document for retrieval
     */
    async indexDocument(documentId, title, content, tenantId, metadata = {}) {
        return this.documentRetriever.indexDocument(documentId, title, content, tenantId, metadata);
    }
    /**
     * Generate Cypher from natural language
     */
    async naturalLanguageToCypher(naturalLanguage, tenantId) {
        // Get schema from database
        const schema = await this.getGraphSchema();
        return this.llm.generateCypher(naturalLanguage, schema);
    }
    /**
     * Get graph schema for Cypher generation
     */
    async getGraphSchema() {
        const session = this.driver.session();
        try {
            const [nodeResult, relResult] = await Promise.all([
                session.run('CALL db.labels()'),
                session.run('CALL db.relationshipTypes()'),
            ]);
            return {
                nodeTypes: nodeResult.records.map((r) => r.get(0)),
                relationshipTypes: relResult.records.map((r) => r.get(0)),
                properties: {
                    Entity: ['id', 'name', 'type', 'confidence', 'tenantId'],
                    Document: ['id', 'title', 'content', 'source'],
                },
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Health check
     */
    async healthCheck() {
        const components = {};
        // Check Neo4j
        try {
            const session = this.driver.session();
            await session.run('RETURN 1');
            await session.close();
            components.neo4j = true;
        }
        catch {
            components.neo4j = false;
        }
        // Check LLM
        try {
            await this.llm.embed('health check');
            components.llm = true;
        }
        catch {
            components.llm = false;
        }
        return {
            healthy: Object.values(components).every((v) => v),
            components,
        };
    }
    /**
     * Close connections
     */
    /**
   * Perform KG2RAG retrieval
   */
    async performKg2RagRetrieval(query, options) {
        const startTime = Date.now();
        const seed = await this.kg2ragPipeline.buildSeedSet(query.query, {
            tenantId: query.tenantId,
            query: query.query,
            maxHops: query.maxHops,
            maxNodes: query.maxNodes,
        });
        const subgraph = await this.kg2ragPipeline.expandViaGraph(seed, {
            tenantId: query.tenantId,
            query: query.query,
            maxHops: query.maxHops,
            maxNodes: query.maxNodes,
        });
        const context = this.kg2ragPipeline.organizeContext(subgraph, query.query, {
            tenantId: query.tenantId,
            query: query.query,
        });
        // Map back to RetrievalResult format
        const evidenceChunks = context.paragraphs.map((p, i) => {
            // Calculate a score based on rank (Reciprocal Rank-ish or linear decay)
            const rank = i + 1;
            const relevanceScore = 1.0 / (1 + Math.log(rank));
            return {
                id: `kg2rag-${i}-${Date.now()}`,
                content: p,
                citations: [],
                graphPaths: [],
                relevanceScore,
                tenantId: query.tenantId,
            };
        });
        const processingTimeMs = Date.now() - startTime;
        return {
            id: `res-${Date.now()}`,
            query: query.query,
            evidenceChunks,
            subgraph: {
                nodes: subgraph.nodes,
                edges: subgraph.edges,
            },
            totalDocumentsSearched: seed.seedChunks.length,
            totalNodesTraversed: subgraph.nodes.length,
            processingTimeMs,
        };
    }
    async close() {
        await this.driver.close();
        await this.documentRetriever.close();
    }
}
exports.GraphRAGOrchestrator = GraphRAGOrchestrator;
// Factory function
function createGraphRAGOrchestrator(config) {
    return new GraphRAGOrchestrator(config);
}
