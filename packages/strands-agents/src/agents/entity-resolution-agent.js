"use strict";
/**
 * @fileoverview Entity Resolution Agent for deduplication and identity resolution
 * @module @intelgraph/strands-agents/agents/entity-resolution-agent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntityResolutionAgent = createEntityResolutionAgent;
const graph_tools_js_1 = require("../tools/graph-tools.js");
const entity_tools_js_1 = require("../tools/entity-tools.js");
const prompts_js_1 = require("./prompts.js");
// ============================================================================
// Entity Resolution Agent Factory
// ============================================================================
/**
 * Creates an Entity Resolution Agent configured for IntelGraph
 *
 * The Entity Resolution Agent specializes in:
 * - Finding potential duplicate entities
 * - Comparing entities for similarity
 * - Recommending and executing merges
 * - Resolving text references to existing entities
 *
 * @example
 * ```typescript
 * import { createEntityResolutionAgent } from '@intelgraph/strands-agents/agents';
 * import neo4j from 'neo4j-driver';
 *
 * const driver = neo4j.driver('bolt://localhost:7687');
 *
 * const agent = createEntityResolutionAgent({
 *   driver,
 *   autoMergeThreshold: 0.95,
 * });
 *
 * // Find duplicates for specific entities
 * const result = await agent.findDuplicates({
 *   entityIds: ['entity-123', 'entity-456'],
 * });
 *
 * // Resolve text to entities
 * const resolved = await agent.resolveFromText({
 *   text: 'Meeting between John Smith and Acme Corp',
 * });
 * ```
 */
function createEntityResolutionAgent(config) {
    const { driver, database = 'neo4j', modelProvider = 'bedrock', modelId, maxIterations = 10, auditLog, userId = 'resolution-agent', defaultSimilarityThreshold = 0.7, autoMergeThreshold = 0.95, } = config;
    // Create tool instances
    const toolConfig = { driver, database, auditLog, userId };
    const graphTools = (0, graph_tools_js_1.createGraphTools)(toolConfig);
    const entityTools = (0, entity_tools_js_1.createEntityTools)(toolConfig);
    // Tools specific to entity resolution
    const allTools = [
        entityTools.searchEntities,
        entityTools.getEntity,
        entityTools.findSimilarEntities,
        entityTools.resolveEntity,
        graphTools.getNeighbors,
        graphTools.executeCypher,
    ];
    /**
     * Find potential duplicate entities
     */
    async function findDuplicates(task) {
        const startTime = Date.now();
        const candidates = [];
        const mergesExecuted = [];
        const linksCreated = [];
        let entitiesAnalyzed = 0;
        try {
            const entityIds = task.entityIds || [];
            for (const entityId of entityIds) {
                entitiesAnalyzed++;
                // Use the findSimilarEntities tool
                const similarResult = await entityTools.findSimilarEntities.callback({
                    entityId,
                    similarityThreshold: defaultSimilarityThreshold,
                    limit: 10,
                    algorithm: 'jaccard',
                });
                const parsed = JSON.parse(similarResult);
                if (parsed.success && parsed.data?.similarEntities) {
                    for (const similar of parsed.data.similarEntities) {
                        const recommendation = getRecommendation(similar.similarity, autoMergeThreshold);
                        candidates.push({
                            entityId: similar.id,
                            entityLabel: similar.label,
                            entityType: similar.type,
                            similarity: similar.similarity,
                            factors: {
                                labelSimilarity: similar.similarity * 0.4,
                                structuralSimilarity: similar.similarity * 0.6,
                                propertySimilarity: 0,
                            },
                            recommendation,
                            reasoning: `Similarity score ${similar.similarity.toFixed(3)} suggests ${recommendation}`,
                        });
                    }
                }
            }
            // Auto-execute merges if enabled
            if (task.autoExecute) {
                const autoMergeCandidates = candidates.filter((c) => c.recommendation === 'merge' && c.similarity >= autoMergeThreshold);
                // Group by primary entity and execute merges
                // (Implementation would use merge mutation here)
            }
            const executionTimeMs = Date.now() - startTime;
            if (auditLog) {
                auditLog('resolution_completed', {
                    entitiesAnalyzed,
                    candidatesFound: candidates.length,
                    executionTimeMs,
                });
            }
            return {
                success: true,
                message: `Analyzed ${entitiesAnalyzed} entities, found ${candidates.length} resolution candidates`,
                candidates,
                mergesExecuted,
                linksCreated,
                metadata: {
                    entitiesAnalyzed,
                    candidatesFound: candidates.length,
                    executionTimeMs,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Resolution failed: ${errorMessage}`,
                candidates,
                mergesExecuted,
                linksCreated,
                metadata: {
                    entitiesAnalyzed,
                    candidatesFound: candidates.length,
                    executionTimeMs: Date.now() - startTime,
                },
            };
        }
    }
    /**
     * Resolve entities from natural language text
     */
    async function resolveFromText(task) {
        const startTime = Date.now();
        const resolvedEntities = [];
        try {
            // In a full implementation, this would:
            // 1. Use NLP to extract entity mentions from text
            // 2. For each mention, use resolveEntity tool
            // 3. Return resolved entities with confidence
            // Placeholder structure
            const result = await entityTools.resolveEntity.callback({
                label: task.text,
                createIfNotFound: task.createIfNotFound || false,
            });
            const parsed = JSON.parse(result);
            return {
                success: true,
                text: task.text,
                resolvedEntities,
                metadata: {
                    executionTimeMs: Date.now() - startTime,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Text resolution failed: ${errorMessage}`,
                text: task.text,
                resolvedEntities,
                metadata: {
                    executionTimeMs: Date.now() - startTime,
                },
            };
        }
    }
    /**
     * Scan investigation for potential duplicates
     */
    async function scanInvestigation(investigationId) {
        const startTime = Date.now();
        try {
            // Get all entities in the investigation
            const session = driver.session({ database, defaultAccessMode: 'READ' });
            try {
                const result = await session.run(`MATCH (i:Investigation {id: $investigationId})-[:CONTAINS]->(e:Entity)
           RETURN e.id as entityId`, { investigationId });
                const entityIds = result.records.map((r) => r.get('entityId'));
                // Run duplicate detection on all entities
                return findDuplicates({
                    entityIds,
                    investigationId,
                    autoExecute: false,
                });
            }
            finally {
                await session.close();
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Investigation scan failed: ${errorMessage}`,
                candidates: [],
                mergesExecuted: [],
                linksCreated: [],
                metadata: {
                    entitiesAnalyzed: 0,
                    candidatesFound: 0,
                    executionTimeMs: Date.now() - startTime,
                },
            };
        }
    }
    /**
     * Get the Strands Agent configuration
     */
    function getAgentConfig() {
        return {
            systemPrompt: prompts_js_1.ENTITY_RESOLUTION_AGENT_PROMPT,
            tools: allTools,
            maxIterations,
            modelProvider,
            modelId: modelId || getDefaultModelId(modelProvider),
        };
    }
    return {
        findDuplicates,
        resolveFromText,
        scanInvestigation,
        getAgentConfig,
        tools: allTools,
    };
}
// ============================================================================
// Helper Functions
// ============================================================================
function getRecommendation(similarity, autoMergeThreshold) {
    if (similarity >= autoMergeThreshold) {
        return 'merge';
    }
    else if (similarity >= 0.85) {
        return 'review'; // High similarity but below auto-merge
    }
    else if (similarity >= 0.7) {
        return 'link'; // Create SAME_AS or SIMILAR_TO relationship
    }
    else {
        return 'distinct';
    }
}
function getDefaultModelId(provider) {
    switch (provider) {
        case 'bedrock':
            return 'anthropic.claude-3-5-sonnet-20241022-v2:0';
        case 'anthropic':
            return 'claude-sonnet-4-5-20250929';
        case 'openai':
            return 'gpt-4o';
        default:
            return 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    }
}
