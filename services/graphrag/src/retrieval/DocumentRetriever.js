"use strict";
/**
 * Document Retriever
 * Semantic document search with embedding-based retrieval
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentRetriever = void 0;
const uuid_1 = require("uuid");
const api_1 = require("@opentelemetry/api");
const redis_1 = require("redis");
const openai_1 = __importDefault(require("openai"));
const tracer = api_1.trace.getTracer('graphrag-document-retriever');
class DocumentRetriever {
    config;
    redis = null;
    openai;
    documentStore = new Map();
    constructor(openaiApiKey, redisUrl, config = {}) {
        this.config = {
            embeddingModel: config.embeddingModel ?? 'text-embedding-3-small',
            maxDocuments: config.maxDocuments ?? 20,
            minRelevance: config.minRelevance ?? 0.3,
            chunkSize: config.chunkSize ?? 1000,
            chunkOverlap: config.chunkOverlap ?? 100,
            cacheEnabled: config.cacheEnabled ?? true,
            cacheTtlSeconds: config.cacheTtlSeconds ?? 3600,
        };
        this.openai = new openai_1.default({ apiKey: openaiApiKey });
        if (redisUrl && this.config.cacheEnabled) {
            this.initializeRedis(redisUrl);
        }
    }
    async initializeRedis(url) {
        try {
            this.redis = (0, redis_1.createClient)({ url });
            await this.redis.connect();
        }
        catch (error) {
            console.warn('Redis connection failed, caching disabled:', error);
            this.redis = null;
        }
    }
    /**
     * Retrieve relevant document chunks based on query
     */
    async retrieve(query) {
        return tracer.startActiveSpan('document_retrieval', async (span) => {
            const startTime = Date.now();
            try {
                span.setAttribute('query.length', query.query.length);
                span.setAttribute('config.maxDocuments', this.config.maxDocuments);
                // Generate query embedding
                const queryEmbedding = await this.generateEmbedding(query.query);
                span.setAttribute('embedding.dimensions', queryEmbedding.length);
                // Search for similar chunks
                const searchResults = await this.searchSimilarChunks(queryEmbedding, query.tenantId, query.maxDocuments, query.minRelevance);
                span.setAttribute('results.count', searchResults.length);
                // Convert to evidence chunks
                const evidenceChunks = searchResults.map((result) => this.toEvidenceChunk(result, query.tenantId));
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                span.setAttribute('processing.timeMs', Date.now() - startTime);
                return evidenceChunks;
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
     * Index a document into the retriever
     */
    async indexDocument(documentId, title, content, tenantId, metadata = {}) {
        return tracer.startActiveSpan('document_indexing', async (span) => {
            try {
                span.setAttribute('document.id', documentId);
                span.setAttribute('document.length', content.length);
                // Chunk the document
                const textChunks = this.chunkText(content);
                span.setAttribute('chunks.count', textChunks.length);
                // Generate embeddings for all chunks
                const chunks = [];
                for (let i = 0; i < textChunks.length; i++) {
                    const chunk = textChunks[i];
                    const embedding = await this.generateEmbedding(chunk.text);
                    chunks.push({
                        id: `${documentId}_chunk_${i}`,
                        documentId,
                        documentTitle: title,
                        content: chunk.text,
                        embedding,
                        spanStart: chunk.start,
                        spanEnd: chunk.end,
                        metadata: {
                            ...metadata,
                            tenantId,
                            chunkIndex: i,
                            totalChunks: textChunks.length,
                        },
                    });
                }
                // Store chunks
                const key = `${tenantId}:${documentId}`;
                this.documentStore.set(key, chunks);
                // Cache in Redis if available
                if (this.redis) {
                    await this.redis.setEx(`doc:${key}`, this.config.cacheTtlSeconds, JSON.stringify(chunks));
                }
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return chunks.length;
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
     * Generate embedding for text
     */
    async generateEmbedding(text) {
        // Check cache first
        if (this.redis && this.config.cacheEnabled) {
            const cacheKey = `emb:${this.hashText(text)}`;
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        const response = await this.openai.embeddings.create({
            model: this.config.embeddingModel,
            input: text.slice(0, 8000), // Limit input length
        });
        const embedding = response.data[0].embedding;
        // Cache the embedding
        if (this.redis && this.config.cacheEnabled) {
            const cacheKey = `emb:${this.hashText(text)}`;
            await this.redis.setEx(cacheKey, this.config.cacheTtlSeconds, JSON.stringify(embedding));
        }
        return embedding;
    }
    /**
     * Search for similar chunks using cosine similarity
     */
    async searchSimilarChunks(queryEmbedding, tenantId, maxResults, minRelevance) {
        const results = [];
        // Search through all documents for this tenant
        for (const [key, chunks] of this.documentStore.entries()) {
            if (!key.startsWith(`${tenantId}:`))
                continue;
            for (const chunk of chunks) {
                const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
                if (similarity >= minRelevance) {
                    results.push({ chunk, similarity });
                }
            }
        }
        // Sort by similarity and limit
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
    }
    /**
     * Compute cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same dimensions');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }
    /**
     * Chunk text into overlapping segments
     */
    chunkText(text) {
        const chunks = [];
        const { chunkSize, chunkOverlap } = this.config;
        if (text.length <= chunkSize) {
            return [{ text, start: 0, end: text.length }];
        }
        let start = 0;
        while (start < text.length) {
            let end = start + chunkSize;
            // Try to break at sentence boundary
            if (end < text.length) {
                const sentenceEnd = text.lastIndexOf('.', end);
                if (sentenceEnd > start + chunkSize / 2) {
                    end = sentenceEnd + 1;
                }
            }
            else {
                end = text.length;
            }
            const chunkText = text.slice(start, end).trim();
            if (chunkText.length > 0) {
                chunks.push({ text: chunkText, start, end });
            }
            start = end - chunkOverlap;
            if (start >= text.length)
                break;
        }
        return chunks;
    }
    /**
     * Convert search result to evidence chunk
     */
    toEvidenceChunk(result, tenantId) {
        const citation = {
            id: (0, uuid_1.v4)(),
            documentId: result.chunk.documentId,
            documentTitle: result.chunk.documentTitle,
            spanStart: result.chunk.spanStart,
            spanEnd: result.chunk.spanEnd,
            content: result.chunk.content,
            confidence: result.similarity,
            sourceType: 'document',
            metadata: result.chunk.metadata,
        };
        return {
            id: (0, uuid_1.v4)(),
            content: result.chunk.content,
            embedding: result.chunk.embedding,
            citations: [citation],
            graphPaths: [],
            relevanceScore: result.similarity,
            tenantId,
        };
    }
    /**
     * Simple hash function for cache keys
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    /**
     * Close connections
     */
    async close() {
        if (this.redis) {
            await this.redis.disconnect();
        }
    }
}
exports.DocumentRetriever = DocumentRetriever;
