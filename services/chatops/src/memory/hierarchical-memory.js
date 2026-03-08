"use strict";
// @ts-nocheck
/**
 * Hierarchical Memory Manager
 *
 * Implements 3-tier memory system for long-horizon (50-100+ turn) conversations:
 * - Tier 1 (Short-term): Last 5 turns, full verbatim (Redis)
 * - Tier 2 (Medium-term): Turns 6-20, compressed summaries (PostgreSQL)
 * - Tier 3 (Long-term): Persistent facts/relationships (Neo4j)
 *
 * Key Features:
 * - Automatic tier promotion as conversation grows
 * - Semantic selection for context window construction
 * - Token budget management
 * - Session isolation with tenant boundaries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchicalMemoryManager = void 0;
exports.createMemoryManager = createMemoryManager;
const ioredis_1 = __importDefault(require("ioredis"));
const pg_1 = require("pg");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
// =============================================================================
// CONFIGURATION
// =============================================================================
const DEFAULT_TIER_CONFIGS = [
    {
        tier: 'short',
        storage: 'redis',
        maxTokens: 4000, // 50% of typical 8k budget
        retentionMs: 0, // Session lifetime
    },
    {
        tier: 'medium',
        storage: 'postgres',
        maxTokens: 2400, // 30% of budget
        retentionMs: 24 * 60 * 60 * 1000, // 24 hours
        compressionThreshold: 5, // Compress after 5 turns
    },
    {
        tier: 'long',
        storage: 'neo4j',
        maxTokens: 1600, // 20% of budget
        retentionMs: -1, // Permanent
    },
];
const SHORT_TERM_MAX_TURNS = 5;
const MEDIUM_TERM_MAX_TURNS = 20;
class HierarchicalMemoryManager {
    redis;
    pg;
    neo4j;
    tierConfigs;
    constructor(config) {
        this.redis = new ioredis_1.default({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
        });
        this.pg = new pg_1.Pool({
            connectionString: config.postgres.connectionString,
        });
        this.neo4j = neo4j_driver_1.default.driver(config.neo4j.uri, neo4j_driver_1.default.auth.basic(config.neo4j.username, config.neo4j.password));
        this.tierConfigs = config.tierConfigs ?? DEFAULT_TIER_CONFIGS;
    }
    // ===========================================================================
    // CORE OPERATIONS
    // ===========================================================================
    /**
     * Add a new conversation turn
     * Automatically handles tier promotion when thresholds are reached
     */
    async addTurn(turn) {
        const memory = await this.getOrCreateMemory(turn.sessionId, turn.userId, turn.tenantId);
        // Add to short-term memory
        memory.shortTerm.turns.push(turn);
        memory.shortTerm.totalTokens += turn.tokenCount;
        memory.metadata.totalTurns++;
        memory.metadata.lastActiveAt = new Date();
        // Check if we need to promote turns from short to medium
        if (memory.shortTerm.turns.length > SHORT_TERM_MAX_TURNS) {
            await this.promoteToMediumTerm(memory);
        }
        // Persist short-term memory to Redis
        await this.persistShortTerm(turn.sessionId, memory.shortTerm);
        // Check if we need to promote to long-term
        if (memory.metadata.totalTurns > MEDIUM_TERM_MAX_TURNS) {
            await this.promoteToLongTerm(memory);
        }
    }
    /**
     * Get context window for LLM prompt construction
     * Uses semantic selection to maximize relevance within token budget
     */
    async getContextWindow(sessionId, query, maxTokens) {
        const memory = await this.getMemory(sessionId);
        if (!memory) {
            return { chunks: [], totalTokens: 0, tierDistribution: { short: 0, medium: 0, long: 0 } };
        }
        const chunks = [];
        let totalTokens = 0;
        // Allocate budget per tier
        const shortBudget = Math.floor(maxTokens * 0.5);
        const mediumBudget = Math.floor(maxTokens * 0.3);
        const longBudget = Math.floor(maxTokens * 0.2);
        // Tier 1: Short-term (most recent, highest priority)
        const shortChunks = await this.selectFromShortTerm(memory.shortTerm, query, shortBudget);
        chunks.push(...shortChunks);
        totalTokens += shortChunks.reduce((sum, c) => sum + c.tokenCount, 0);
        // Tier 2: Medium-term (semantically selected summaries)
        const mediumChunks = await this.selectFromMediumTerm(memory.mediumTerm, query, mediumBudget);
        chunks.push(...mediumChunks);
        totalTokens += mediumChunks.reduce((sum, c) => sum + c.tokenCount, 0);
        // Tier 3: Long-term (graph-based facts)
        const longChunks = await this.selectFromLongTerm(sessionId, memory.userId, memory.tenantId, query, longBudget);
        chunks.push(...longChunks);
        totalTokens += longChunks.reduce((sum, c) => sum + c.tokenCount, 0);
        // Sort by relevance score
        chunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return {
            chunks,
            totalTokens,
            tierDistribution: {
                short: shortChunks.reduce((sum, c) => sum + c.tokenCount, 0),
                medium: mediumChunks.reduce((sum, c) => sum + c.tokenCount, 0),
                long: longChunks.reduce((sum, c) => sum + c.tokenCount, 0),
            },
        };
    }
    /**
     * Promote oldest turns from short-term to medium-term
     * Compresses into summaries
     */
    async compressTier() {
        // Implementation note: This is called automatically by addTurn
        // when short-term exceeds threshold
    }
    /**
     * Extract facts and relationships to long-term graph
     */
    async extractToGraph() {
        // Implementation note: This is called automatically when
        // medium-term accumulates enough summaries
    }
    /**
     * Clean up expired memory entries
     */
    async pruneExpired() {
        const now = Date.now();
        // Prune medium-term entries older than retention
        const mediumConfig = this.tierConfigs.find((c) => c.tier === 'medium');
        const mediumCutoff = new Date(now - mediumConfig.retentionMs);
        await this.pg.query(`DELETE FROM chatops_medium_term_memory
       WHERE created_at < $1`, [mediumCutoff]);
    }
    // ===========================================================================
    // INTERNAL METHODS
    // ===========================================================================
    async getOrCreateMemory(sessionId, userId, tenantId) {
        const existing = await this.getMemory(sessionId);
        if (existing)
            return existing;
        const memory = {
            sessionId,
            userId,
            tenantId,
            shortTerm: { turns: [], totalTokens: 0 },
            mediumTerm: {
                summaries: [],
                keyFacts: [],
                decisions: [],
                openQuestions: [],
                totalTokens: 0,
            },
            longTerm: {
                entityMentions: [],
                relationships: [],
                userPatterns: [],
            },
            metadata: {
                createdAt: new Date(),
                lastActiveAt: new Date(),
                totalTurns: 0,
            },
        };
        await this.persistShortTerm(sessionId, memory.shortTerm);
        return memory;
    }
    async getMemory(sessionId) {
        // Load short-term from Redis
        const shortTermJson = await this.redis.get(`chatops:memory:${sessionId}`);
        if (!shortTermJson)
            return null;
        const shortTerm = JSON.parse(shortTermJson);
        // Load medium-term from PostgreSQL
        const mediumTermResult = await this.pg.query(`SELECT data FROM chatops_medium_term_memory WHERE session_id = $1`, [sessionId]);
        const mediumTerm = mediumTermResult.rows[0]?.data ?? {
            summaries: [],
            keyFacts: [],
            decisions: [],
            openQuestions: [],
            totalTokens: 0,
        };
        // Load metadata
        const metadataJson = await this.redis.get(`chatops:metadata:${sessionId}`);
        const metadata = metadataJson
            ? JSON.parse(metadataJson)
            : {
                createdAt: new Date(),
                lastActiveAt: new Date(),
                totalTurns: shortTerm.turns.length,
            };
        // Load user/tenant from first turn
        const firstTurn = shortTerm.turns[0];
        return {
            sessionId,
            userId: firstTurn?.userId ?? 'unknown',
            tenantId: firstTurn?.tenantId ?? 'unknown',
            shortTerm,
            mediumTerm,
            longTerm: {
                entityMentions: [],
                relationships: [],
                userPatterns: [],
            },
            metadata,
        };
    }
    async persistShortTerm(sessionId, shortTerm) {
        await this.redis.set(`chatops:memory:${sessionId}`, JSON.stringify(shortTerm), 'EX', 86400);
    }
    async promoteToMediumTerm(memory) {
        // Take oldest turns that exceed the short-term limit
        const toPromote = memory.shortTerm.turns.splice(0, memory.shortTerm.turns.length - SHORT_TERM_MAX_TURNS);
        // Compress into summary
        const summary = await this.compressTurns(toPromote);
        memory.mediumTerm.summaries.push(summary);
        memory.mediumTerm.totalTokens += summary.tokenCount;
        // Update token counts
        const promotedTokens = toPromote.reduce((sum, t) => sum + t.tokenCount, 0);
        memory.shortTerm.totalTokens -= promotedTokens;
        // Persist to PostgreSQL
        await this.pg.query(`INSERT INTO chatops_medium_term_memory (session_id, data, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (session_id)
       DO UPDATE SET data = $2, updated_at = NOW()`, [memory.sessionId, JSON.stringify(memory.mediumTerm)]);
    }
    async compressTurns(turns) {
        // TODO: Use LLM to generate compressed summary
        // For now, create a simple concatenation summary
        const turnIds = turns.map((t) => t.turnId);
        const entities = turns.flatMap((t) => t.metadata?.entities?.map((e) => e.value) ?? []);
        const intent = turns[turns.length - 1]?.metadata?.intent ?? 'unknown';
        const summary = turns.length === 1
            ? turns[0].content
            : `[${turns.length} turns] ${turns.map((t) => t.content.slice(0, 100)).join(' | ')}`;
        return {
            turnIds,
            summary: summary.slice(0, 500),
            entities: [...new Set(entities)],
            intent,
            outcome: 'success',
            tokenCount: Math.ceil(summary.length / 4), // Rough token estimate
            timestamp: new Date(),
        };
    }
    async promoteToLongTerm(memory) {
        // Extract facts and relationships from medium-term
        const facts = await this.extractFacts(memory.mediumTerm);
        // Store in Neo4j
        const session = this.neo4j.session();
        try {
            for (const fact of facts) {
                await session.run(`MERGE (f:ConversationFact {factId: $factId})
           SET f.content = $content,
               f.category = $category,
               f.confidence = $confidence,
               f.sessionId = $sessionId,
               f.tenantId = $tenantId
           RETURN f`, {
                    factId: fact.factId,
                    content: fact.content,
                    category: fact.category,
                    confidence: fact.confidence,
                    sessionId: memory.sessionId,
                    tenantId: memory.tenantId,
                });
            }
        }
        finally {
            await session.close();
        }
    }
    async extractFacts(mediumTerm) {
        // TODO: Use LLM to extract structured facts
        // For now, convert key facts directly
        return mediumTerm.keyFacts;
    }
    async selectFromShortTerm(shortTerm, query, maxTokens) {
        const chunks = [];
        let tokenCount = 0;
        // Short-term: Include all recent turns up to budget (most recent first)
        const turns = [...shortTerm.turns].reverse();
        for (const turn of turns) {
            if (tokenCount + turn.tokenCount > maxTokens)
                break;
            chunks.push({
                turnId: turn.turnId,
                content: turn.content,
                relevanceScore: 1.0, // Short-term always high relevance
                tokenCount: turn.tokenCount,
                tier: 'short',
                timestamp: turn.timestamp,
            });
            tokenCount += turn.tokenCount;
        }
        return chunks;
    }
    async selectFromMediumTerm(mediumTerm, query, maxTokens) {
        const chunks = [];
        let tokenCount = 0;
        // TODO: Implement semantic similarity search
        // For now, include most recent summaries
        const summaries = [...mediumTerm.summaries].reverse();
        for (const summary of summaries) {
            if (tokenCount + summary.tokenCount > maxTokens)
                break;
            chunks.push({
                turnId: summary.turnIds[0],
                content: summary.summary,
                relevanceScore: 0.7, // Medium-term moderate relevance
                tokenCount: summary.tokenCount,
                tier: 'medium',
                timestamp: summary.timestamp,
            });
            tokenCount += summary.tokenCount;
        }
        return chunks;
    }
    async selectFromLongTerm(sessionId, userId, tenantId, query, maxTokens) {
        const chunks = [];
        // TODO: Query Neo4j for relevant facts using semantic search
        // For now, query most recent facts
        const session = this.neo4j.session();
        try {
            const result = await session.run(`MATCH (f:ConversationFact {tenantId: $tenantId})
         WHERE f.sessionId = $sessionId OR f.userId = $userId
         RETURN f.factId AS factId, f.content AS content, f.confidence AS confidence
         ORDER BY f.confidence DESC
         LIMIT 10`, { tenantId, sessionId, userId });
            let tokenCount = 0;
            for (const record of result.records) {
                const content = record.get('content');
                const factTokens = Math.ceil(content.length / 4);
                if (tokenCount + factTokens > maxTokens)
                    break;
                chunks.push({
                    turnId: record.get('factId'),
                    content,
                    relevanceScore: record.get('confidence') * 0.5, // Long-term lower base relevance
                    tokenCount: factTokens,
                    tier: 'long',
                    timestamp: new Date(),
                });
                tokenCount += factTokens;
            }
        }
        finally {
            await session.close();
        }
        return chunks;
    }
    // ===========================================================================
    // CLEANUP
    // ===========================================================================
    async close() {
        await this.redis.quit();
        await this.pg.end();
        await this.neo4j.close();
    }
}
exports.HierarchicalMemoryManager = HierarchicalMemoryManager;
// =============================================================================
// FACTORY
// =============================================================================
function createMemoryManager(config) {
    return new HierarchicalMemoryManager(config);
}
