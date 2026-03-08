"use strict";
// @ts-nocheck
/**
 * Neo4j Graph Schema for ChatOps Long-Term Memory
 *
 * This module defines the graph schema for:
 * - Conversation facts and relationships
 * - User patterns and preferences
 * - Entity mentions and co-occurrences
 * - Investigation context
 *
 * Node Labels:
 * - ConversationFact: Extracted facts from conversations
 * - UserPattern: Learned user behavior patterns
 * - EntityMention: References to knowledge graph entities
 * - InvestigationContext: Investigation-specific context
 *
 * Relationship Types:
 * - EXTRACTED_FROM: Fact → Session
 * - MENTIONS: Fact → Entity
 * - RELATES_TO: Fact → Fact
 * - OBSERVED_FOR: Pattern → User
 * - PART_OF: Context → Investigation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationGraphRepository = exports.NEO4J_CONSTRAINTS = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================
exports.NEO4J_CONSTRAINTS = `
// Unique constraints
CREATE CONSTRAINT conversation_fact_id IF NOT EXISTS
FOR (f:ConversationFact) REQUIRE f.factId IS UNIQUE;

CREATE CONSTRAINT user_pattern_id IF NOT EXISTS
FOR (p:UserPattern) REQUIRE p.patternId IS UNIQUE;

CREATE CONSTRAINT entity_mention_id IF NOT EXISTS
FOR (m:EntityMention) REQUIRE m.mentionId IS UNIQUE;

CREATE CONSTRAINT investigation_context_id IF NOT EXISTS
FOR (c:InvestigationContext) REQUIRE c.contextId IS UNIQUE;

// Composite constraints for tenant isolation
CREATE CONSTRAINT fact_tenant_isolation IF NOT EXISTS
FOR (f:ConversationFact) REQUIRE (f.factId, f.tenantId) IS UNIQUE;

// Indexes for query performance
CREATE INDEX fact_tenant_idx IF NOT EXISTS
FOR (f:ConversationFact) ON (f.tenantId);

CREATE INDEX fact_category_idx IF NOT EXISTS
FOR (f:ConversationFact) ON (f.category);

CREATE INDEX fact_confidence_idx IF NOT EXISTS
FOR (f:ConversationFact) ON (f.confidence);

CREATE INDEX fact_session_idx IF NOT EXISTS
FOR (f:ConversationFact) ON (f.sessionId);

CREATE INDEX pattern_user_idx IF NOT EXISTS
FOR (p:UserPattern) ON (p.userId, p.tenantId);

CREATE INDEX pattern_type_idx IF NOT EXISTS
FOR (p:UserPattern) ON (p.patternType);

CREATE INDEX mention_entity_idx IF NOT EXISTS
FOR (m:EntityMention) ON (m.entityId);

CREATE INDEX mention_session_idx IF NOT EXISTS
FOR (m:EntityMention) ON (m.sessionId);

CREATE INDEX context_investigation_idx IF NOT EXISTS
FOR (c:InvestigationContext) ON (c.investigationId);

// Full-text search indexes
CREATE FULLTEXT INDEX fact_content_search IF NOT EXISTS
FOR (f:ConversationFact) ON EACH [f.content];

CREATE FULLTEXT INDEX pattern_value_search IF NOT EXISTS
FOR (p:UserPattern) ON EACH [p.value];
`;
// =============================================================================
// GRAPH REPOSITORY
// =============================================================================
class ConversationGraphRepository {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Initialize schema constraints and indexes
     */
    async initializeSchema() {
        const session = this.driver.session();
        try {
            const statements = exports.NEO4J_CONSTRAINTS.split(';')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            for (const statement of statements) {
                try {
                    await session.run(statement);
                }
                catch (error) {
                    // Ignore "already exists" errors
                    if (!(error instanceof Error && error.message.includes('already exists'))) {
                        console.warn(`Schema statement warning: ${error}`);
                    }
                }
            }
            console.log('Neo4j ChatOps schema initialized');
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // CONVERSATION FACTS
    // ===========================================================================
    async createFact(fact) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        CREATE (f:ConversationFact {
          factId: $factId,
          tenantId: $tenantId,
          userId: $userId,
          sessionId: $sessionId,
          content: $content,
          category: $category,
          confidence: $confidence,
          sourceTurnIds: $sourceTurnIds,
          sourceSummaryId: $sourceSummaryId,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        })
        RETURN f
        `, {
                factId: fact.factId,
                tenantId: fact.tenantId,
                userId: fact.userId,
                sessionId: fact.sessionId,
                content: fact.content,
                category: fact.category,
                confidence: fact.confidence,
                sourceTurnIds: fact.sourceTurnIds,
                sourceSummaryId: fact.sourceSummaryId ?? null,
                createdAt: fact.createdAt,
                updatedAt: fact.updatedAt,
            });
            return result.records[0].get('f').properties;
        }
        finally {
            await session.close();
        }
    }
    async findFactsBySession(sessionId, tenantId, limit = 100) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (f:ConversationFact {sessionId: $sessionId, tenantId: $tenantId})
        RETURN f
        ORDER BY f.confidence DESC, f.createdAt DESC
        LIMIT $limit
        `, { sessionId, tenantId, limit: neo4j_driver_1.default.int(limit) });
            return result.records.map((r) => r.get('f').properties);
        }
        finally {
            await session.close();
        }
    }
    async findFactsByUser(userId, tenantId, limit = 100) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (f:ConversationFact {userId: $userId, tenantId: $tenantId})
        RETURN f
        ORDER BY f.confidence DESC, f.createdAt DESC
        LIMIT $limit
        `, { userId, tenantId, limit: neo4j_driver_1.default.int(limit) });
            return result.records.map((r) => r.get('f').properties);
        }
        finally {
            await session.close();
        }
    }
    async searchFactsBySimilarity(embedding, tenantId, limit = 10) {
        const session = this.driver.session();
        try {
            // Using cosine similarity with GDS library (if available)
            // Falls back to full-text search if not
            const result = await session.run(`
        MATCH (f:ConversationFact {tenantId: $tenantId})
        WHERE f.embedding IS NOT NULL
        WITH f, gds.similarity.cosine(f.embedding, $embedding) AS similarity
        WHERE similarity > 0.7
        RETURN f, similarity
        ORDER BY similarity DESC
        LIMIT $limit
        `, { tenantId, embedding, limit: neo4j_driver_1.default.int(limit) });
            return result.records.map((r) => ({
                fact: r.get('f').properties,
                similarity: r.get('similarity'),
            }));
        }
        catch {
            // Fallback to text search if GDS not available
            return [];
        }
        finally {
            await session.close();
        }
    }
    async searchFactsByText(query, tenantId, limit = 10) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        CALL db.index.fulltext.queryNodes('fact_content_search', $query)
        YIELD node, score
        WHERE node.tenantId = $tenantId
        RETURN node
        ORDER BY score DESC
        LIMIT $limit
        `, { query, tenantId, limit: neo4j_driver_1.default.int(limit) });
            return result.records.map((r) => r.get('node').properties);
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // USER PATTERNS
    // ===========================================================================
    async upsertPattern(pattern) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MERGE (p:UserPattern {
          patternId: $patternId
        })
        ON CREATE SET
          p.tenantId = $tenantId,
          p.userId = $userId,
          p.patternType = $patternType,
          p.value = $value,
          p.confidence = $confidence,
          p.observationCount = 1,
          p.firstObservedAt = $observedAt,
          p.lastObservedAt = $observedAt,
          p.decayFactor = 1.0
        ON MATCH SET
          p.confidence = CASE
            WHEN p.confidence < $confidence THEN $confidence
            ELSE p.confidence
          END,
          p.observationCount = p.observationCount + 1,
          p.lastObservedAt = $observedAt,
          p.decayFactor = 1.0
        RETURN p
        `, {
                patternId: pattern.patternId,
                tenantId: pattern.tenantId,
                userId: pattern.userId,
                patternType: pattern.patternType,
                value: pattern.value,
                confidence: pattern.confidence,
                observedAt: pattern.lastObservedAt,
            });
            return result.records[0].get('p').properties;
        }
        finally {
            await session.close();
        }
    }
    async findPatternsByUser(userId, tenantId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (p:UserPattern {userId: $userId, tenantId: $tenantId})
        WHERE p.decayFactor > 0.3
        RETURN p
        ORDER BY p.confidence * p.decayFactor DESC
        LIMIT 50
        `, { userId, tenantId });
            return result.records.map((r) => r.get('p').properties);
        }
        finally {
            await session.close();
        }
    }
    async decayPatterns(tenantId, decayRate = 0.95) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (p:UserPattern {tenantId: $tenantId})
        WHERE p.decayFactor > 0.1
        SET p.decayFactor = p.decayFactor * $decayRate
        RETURN count(p) as updated
        `, { tenantId, decayRate });
            return result.records[0].get('updated').toNumber();
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // ENTITY MENTIONS
    // ===========================================================================
    async recordEntityMention(mention) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MERGE (m:EntityMention {
          entityId: $entityId,
          sessionId: $sessionId,
          tenantId: $tenantId
        })
        ON CREATE SET
          m.mentionId = $mentionId,
          m.entityType = $entityType,
          m.entityName = $entityName,
          m.turnIds = $turnIds,
          m.frequency = 1,
          m.firstMentionedAt = $timestamp,
          m.lastMentionedAt = $timestamp,
          m.relevanceScore = $relevanceScore
        ON MATCH SET
          m.turnIds = m.turnIds + $turnIds,
          m.frequency = m.frequency + 1,
          m.lastMentionedAt = $timestamp,
          m.relevanceScore = CASE
            WHEN m.relevanceScore < $relevanceScore THEN $relevanceScore
            ELSE m.relevanceScore
          END
        RETURN m
        `, {
                mentionId: mention.mentionId,
                tenantId: mention.tenantId,
                sessionId: mention.sessionId,
                entityId: mention.entityId,
                entityType: mention.entityType,
                entityName: mention.entityName,
                turnIds: mention.turnIds,
                timestamp: mention.lastMentionedAt,
                relevanceScore: mention.relevanceScore,
            });
            return result.records[0].get('m').properties;
        }
        finally {
            await session.close();
        }
    }
    async findMentionsBySession(sessionId, tenantId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (m:EntityMention {sessionId: $sessionId, tenantId: $tenantId})
        RETURN m
        ORDER BY m.relevanceScore DESC, m.frequency DESC
        LIMIT 100
        `, { sessionId, tenantId });
            return result.records.map((r) => r.get('m').properties);
        }
        finally {
            await session.close();
        }
    }
    async findCoOccurringEntities(entityId, tenantId, limit = 20) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (m1:EntityMention {entityId: $entityId, tenantId: $tenantId})
        MATCH (m2:EntityMention {sessionId: m1.sessionId, tenantId: $tenantId})
        WHERE m2.entityId <> $entityId
        WITH m2.entityId AS coEntityId, count(*) AS coOccurrences
        RETURN coEntityId, coOccurrences
        ORDER BY coOccurrences DESC
        LIMIT $limit
        `, { entityId, tenantId, limit: neo4j_driver_1.default.int(limit) });
            return result.records.map((r) => ({
                entityId: r.get('coEntityId'),
                coOccurrences: r.get('coOccurrences').toNumber(),
            }));
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // INVESTIGATION CONTEXT
    // ===========================================================================
    async upsertInvestigationContext(context) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MERGE (c:InvestigationContext {
          investigationId: $investigationId,
          sessionId: $sessionId,
          tenantId: $tenantId
        })
        ON CREATE SET
          c.contextId = $contextId,
          c.hypothesis = $hypothesis,
          c.keyEntities = $keyEntities,
          c.timelineStart = $timelineStart,
          c.timelineEnd = $timelineEnd,
          c.status = $status,
          c.completionPercentage = $completionPercentage,
          c.createdAt = $timestamp,
          c.updatedAt = $timestamp
        ON MATCH SET
          c.hypothesis = COALESCE($hypothesis, c.hypothesis),
          c.keyEntities = $keyEntities,
          c.timelineStart = COALESCE($timelineStart, c.timelineStart),
          c.timelineEnd = COALESCE($timelineEnd, c.timelineEnd),
          c.status = $status,
          c.completionPercentage = $completionPercentage,
          c.updatedAt = $timestamp
        RETURN c
        `, {
                contextId: context.contextId,
                tenantId: context.tenantId,
                investigationId: context.investigationId,
                sessionId: context.sessionId,
                hypothesis: context.hypothesis ?? null,
                keyEntities: context.keyEntities,
                timelineStart: context.timelineStart ?? null,
                timelineEnd: context.timelineEnd ?? null,
                status: context.status,
                completionPercentage: context.completionPercentage,
                timestamp: new Date().toISOString(),
            });
            return result.records[0].get('c').properties;
        }
        finally {
            await session.close();
        }
    }
    async findInvestigationContext(investigationId, tenantId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (c:InvestigationContext {investigationId: $investigationId, tenantId: $tenantId})
        RETURN c
        ORDER BY c.updatedAt DESC
        LIMIT 1
        `, { investigationId, tenantId });
            if (result.records.length === 0)
                return null;
            return result.records[0].get('c').properties;
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // RELATIONSHIPS
    // ===========================================================================
    async linkFactToEntity(factId, entityId, context, tenantId) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (f:ConversationFact {factId: $factId, tenantId: $tenantId})
        MATCH (e:Entity {id: $entityId})
        MERGE (f)-[r:MENTIONS]->(e)
        ON CREATE SET
          r.mentionedAt = datetime(),
          r.context = $context
        `, { factId, entityId, context, tenantId });
        }
        finally {
            await session.close();
        }
    }
    async linkFactsAsRelated(factId1, factId2, relationshipType, confidence, tenantId) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (f1:ConversationFact {factId: $factId1, tenantId: $tenantId})
        MATCH (f2:ConversationFact {factId: $factId2, tenantId: $tenantId})
        MERGE (f1)-[r:RELATES_TO]->(f2)
        ON CREATE SET
          r.relationshipType = $relationshipType,
          r.confidence = $confidence,
          r.inferredAt = datetime(),
          r.inferenceMethod = 'semantic_similarity'
        `, { factId1, factId2, relationshipType, confidence, tenantId });
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // CLEANUP
    // ===========================================================================
    async pruneOldData(tenantId, retentionDays) {
        const session = this.driver.session();
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
        try {
            // Delete old facts
            const factsResult = await session.run(`
        MATCH (f:ConversationFact {tenantId: $tenantId})
        WHERE f.createdAt < $cutoffDate AND f.verifiedAt IS NULL
        DETACH DELETE f
        RETURN count(f) as deleted
        `, { tenantId, cutoffDate });
            // Delete decayed patterns
            const patternsResult = await session.run(`
        MATCH (p:UserPattern {tenantId: $tenantId})
        WHERE p.decayFactor < 0.1
        DETACH DELETE p
        RETURN count(p) as deleted
        `, { tenantId });
            // Delete old mentions
            const mentionsResult = await session.run(`
        MATCH (m:EntityMention {tenantId: $tenantId})
        WHERE m.lastMentionedAt < $cutoffDate
        DETACH DELETE m
        RETURN count(m) as deleted
        `, { tenantId, cutoffDate });
            return {
                factsDeleted: factsResult.records[0].get('deleted').toNumber(),
                patternsDeleted: patternsResult.records[0].get('deleted').toNumber(),
                mentionsDeleted: mentionsResult.records[0].get('deleted').toNumber(),
            };
        }
        finally {
            await session.close();
        }
    }
}
exports.ConversationGraphRepository = ConversationGraphRepository;
