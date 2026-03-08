"use strict";
// @ts-nocheck
/**
 * Embedding Service for Semantic Search
 *
 * Provides vector embeddings for:
 * - Conversation turns (for context retrieval)
 * - Extracted facts (for long-term memory search)
 * - Queries (for semantic matching)
 *
 * Supports multiple embedding providers:
 * - OpenAI text-embedding-ada-002 (1536 dims)
 * - OpenAI text-embedding-3-small (1536 dims)
 * - OpenAI text-embedding-3-large (3072 dims)
 * - Cohere embed-english-v3.0 (1024 dims)
 * - Local models via Ollama
 *
 * Features:
 * - Batch embedding with rate limiting
 * - Caching with Redis
 * - Dimensionality reduction option
 * - Chunking for long texts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
exports.createEmbeddingService = createEmbeddingService;
exports.createOpenAIEmbeddingService = createOpenAIEmbeddingService;
const openai_1 = __importDefault(require("openai"));
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = __importDefault(require("crypto"));
// =============================================================================
// EMBEDDING SERVICE
// =============================================================================
class EmbeddingService {
    config;
    openai;
    redis;
    requestCount = 0;
    requestWindowStart = Date.now();
    constructor(config) {
        this.config = {
            cacheEnabled: true,
            cacheTtlSeconds: 86400, // 24 hours
            maxBatchSize: 100,
            rateLimitPerMinute: 3000,
            ...config,
        };
        if (config.provider === 'openai') {
            this.openai = new openai_1.default({
                apiKey: config.apiKey,
                baseURL: config.baseUrl,
            });
        }
        if (config.redis && config.cacheEnabled) {
            this.redis = new ioredis_1.default({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
            });
        }
    }
    // ===========================================================================
    // PUBLIC API
    // ===========================================================================
    /**
     * Generate embedding for a single text
     */
    async embed(text) {
        const results = await this.embedBatch([text]);
        return results.embeddings[0];
    }
    /**
     * Generate embeddings for multiple texts
     */
    async embedBatch(texts) {
        if (texts.length === 0) {
            return {
                embeddings: [],
                totalTokens: 0,
                cachedCount: 0,
                computedCount: 0,
            };
        }
        // Check cache first
        const { cached, uncached, uncachedIndices } = await this.checkCache(texts);
        if (uncached.length === 0) {
            return {
                embeddings: cached,
                totalTokens: 0,
                cachedCount: cached.length,
                computedCount: 0,
            };
        }
        // Rate limiting
        await this.enforceRateLimit(uncached.length);
        // Compute embeddings for uncached texts
        const computed = await this.computeEmbeddings(uncached);
        // Cache the results
        await this.cacheResults(uncached, computed);
        // Merge cached and computed results in original order
        const embeddings = this.mergeResults(cached, computed, uncachedIndices, texts.length);
        return {
            embeddings,
            totalTokens: computed.reduce((sum, r) => sum + r.tokenCount, 0),
            cachedCount: cached.filter((r) => r !== null).length,
            computedCount: computed.length,
        };
    }
    /**
     * Compute cosine similarity between two embeddings
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error(`Embedding dimensions don't match: ${a.length} vs ${b.length}`);
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Find most similar texts from a corpus
     */
    async findSimilar(query, corpus, topK = 10, threshold = 0.7) {
        // Get query embedding
        const queryResult = await this.embed(query);
        // Compute or use cached embeddings for corpus
        const corpusTexts = corpus.filter((c) => !c.embedding).map((c) => c.text);
        let corpusEmbeddings = new Map();
        if (corpusTexts.length > 0) {
            const corpusResults = await this.embedBatch(corpusTexts);
            let idx = 0;
            for (const item of corpus) {
                if (!item.embedding) {
                    corpusEmbeddings.set(item.id, corpusResults.embeddings[idx].embedding);
                    idx++;
                }
            }
        }
        // Compute similarities
        const similarities = [];
        for (const item of corpus) {
            const embedding = item.embedding ?? corpusEmbeddings.get(item.id);
            if (!embedding)
                continue;
            const similarity = this.cosineSimilarity(queryResult.embedding, embedding);
            if (similarity >= threshold) {
                similarities.push({
                    id: item.id,
                    text: item.text,
                    similarity,
                });
            }
        }
        // Sort by similarity and return top K
        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    }
    /**
     * Chunk long text for embedding
     */
    chunkText(text, maxTokens = 8000, overlap = 200) {
        // Rough estimation: 4 chars per token
        const maxChars = maxTokens * 4;
        const overlapChars = overlap * 4;
        if (text.length <= maxChars) {
            return [text];
        }
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            let end = start + maxChars;
            // Try to break at a sentence boundary
            if (end < text.length) {
                const lastPeriod = text.lastIndexOf('.', end);
                const lastNewline = text.lastIndexOf('\n', end);
                const breakPoint = Math.max(lastPeriod, lastNewline);
                if (breakPoint > start + maxChars / 2) {
                    end = breakPoint + 1;
                }
            }
            chunks.push(text.slice(start, end).trim());
            start = end - overlapChars;
        }
        return chunks;
    }
    /**
     * Embed long text by chunking and averaging
     */
    async embedLong(text, maxTokens = 8000) {
        const chunks = this.chunkText(text, maxTokens);
        if (chunks.length === 1) {
            return this.embed(chunks[0]);
        }
        const results = await this.embedBatch(chunks);
        // Weighted average based on chunk length
        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const avgEmbedding = new Array(this.config.dimensions).fill(0);
        for (let i = 0; i < chunks.length; i++) {
            const weight = chunks[i].length / totalLength;
            const embedding = results.embeddings[i].embedding;
            for (let j = 0; j < embedding.length; j++) {
                avgEmbedding[j] += embedding[j] * weight;
            }
        }
        // Normalize
        const norm = Math.sqrt(avgEmbedding.reduce((sum, v) => sum + v * v, 0));
        for (let i = 0; i < avgEmbedding.length; i++) {
            avgEmbedding[i] /= norm;
        }
        return {
            embedding: avgEmbedding,
            tokenCount: results.totalTokens,
            model: this.config.model,
            cached: false,
        };
    }
    // ===========================================================================
    // INTERNAL METHODS
    // ===========================================================================
    async checkCache(texts) {
        if (!this.redis || !this.config.cacheEnabled) {
            return {
                cached: new Array(texts.length).fill(null),
                uncached: texts,
                uncachedIndices: texts.map((_, i) => i),
            };
        }
        const cacheKeys = texts.map((t) => this.getCacheKey(t));
        const cachedValues = await this.redis.mget(cacheKeys);
        const cached = [];
        const uncached = [];
        const uncachedIndices = [];
        for (let i = 0; i < texts.length; i++) {
            if (cachedValues[i]) {
                const parsed = JSON.parse(cachedValues[i]);
                cached.push({ ...parsed, cached: true });
            }
            else {
                cached.push(null);
                uncached.push(texts[i]);
                uncachedIndices.push(i);
            }
        }
        return { cached, uncached, uncachedIndices };
    }
    getCacheKey(text) {
        const hash = crypto_1.default.createHash('sha256').update(text).digest('hex').slice(0, 16);
        return `chatops:embedding:${this.config.model}:${hash}`;
    }
    async cacheResults(texts, results) {
        if (!this.redis || !this.config.cacheEnabled)
            return;
        const pipeline = this.redis.pipeline();
        for (let i = 0; i < texts.length; i++) {
            const key = this.getCacheKey(texts[i]);
            const value = JSON.stringify({
                embedding: results[i].embedding,
                tokenCount: results[i].tokenCount,
                model: results[i].model,
            });
            pipeline.setex(key, this.config.cacheTtlSeconds, value);
        }
        await pipeline.exec();
    }
    mergeResults(cached, computed, uncachedIndices, totalLength) {
        const results = new Array(totalLength);
        let computedIdx = 0;
        for (let i = 0; i < totalLength; i++) {
            if (cached[i]) {
                results[i] = cached[i];
            }
            else {
                results[i] = { ...computed[computedIdx], cached: false };
                computedIdx++;
            }
        }
        return results;
    }
    async enforceRateLimit(requestCount) {
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        if (now - this.requestWindowStart > windowMs) {
            this.requestCount = 0;
            this.requestWindowStart = now;
        }
        if (this.requestCount + requestCount > this.config.rateLimitPerMinute) {
            const waitTime = windowMs - (now - this.requestWindowStart);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.requestWindowStart = Date.now();
        }
        this.requestCount += requestCount;
    }
    async computeEmbeddings(texts) {
        switch (this.config.provider) {
            case 'openai':
                return this.computeOpenAIEmbeddings(texts);
            case 'cohere':
                return this.computeCohereEmbeddings(texts);
            case 'ollama':
                return this.computeOllamaEmbeddings(texts);
            default:
                throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
        }
    }
    async computeOpenAIEmbeddings(texts) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }
        const results = [];
        // Process in batches
        for (let i = 0; i < texts.length; i += this.config.maxBatchSize) {
            const batch = texts.slice(i, i + this.config.maxBatchSize);
            const response = await this.openai.embeddings.create({
                model: this.config.model,
                input: batch,
                dimensions: this.config.dimensions,
            });
            for (let j = 0; j < batch.length; j++) {
                results.push({
                    embedding: response.data[j].embedding,
                    tokenCount: response.usage?.total_tokens ?? 0,
                    model: this.config.model,
                    cached: false,
                });
            }
        }
        return results;
    }
    async computeCohereEmbeddings(texts) {
        // Cohere implementation
        throw new Error('Cohere embeddings not yet implemented');
    }
    async computeOllamaEmbeddings(texts) {
        // Ollama implementation for local models
        const results = [];
        for (const text of texts) {
            const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.model,
                    prompt: text,
                }),
            });
            const data = await response.json();
            results.push({
                embedding: data.embedding,
                tokenCount: text.length / 4, // Rough estimate
                model: this.config.model,
                cached: false,
            });
        }
        return results;
    }
    // ===========================================================================
    // CLEANUP
    // ===========================================================================
    async close() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.EmbeddingService = EmbeddingService;
// =============================================================================
// FACTORY
// =============================================================================
function createEmbeddingService(config) {
    return new EmbeddingService(config);
}
/**
 * Create OpenAI embedding service with sensible defaults
 */
function createOpenAIEmbeddingService(apiKey, options) {
    return new EmbeddingService({
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        apiKey,
        ...options,
    });
}
