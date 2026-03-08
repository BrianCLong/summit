"use strict";
/**
 * GraphQL Schema Extensions for AI Insights
 *
 * Adds AI-powered fields to existing types for entity resolution
 * and link scoring capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInsightsResolvers = exports.aiInsightsTypeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
const ai_insights_client_js_1 = require("../services/ai-insights-client.js");
const resolvers_tracing_js_1 = require("./resolvers-tracing.js");
// Type definitions
exports.aiInsightsTypeDefs = (0, apollo_server_express_1.gql) `
  """
  AI-powered insights and scoring
  """
  type AIInsights {
    """
    AI confidence score for entity quality/completeness
    """
    entityScore: Float!

    """
    Similar entities found through AI resolution
    """
    similarEntities: [EntityMatch!]!

    """
    Link scores to related entities
    """
    linkScores: [LinkScore!]!

    """
    AI model version used for scoring
    """
    modelVersion: String

    """
    Processing metadata
    """
    processingTime: Float
  }

  """
  Entity match result from AI resolution
  """
  type EntityMatch {
    """
    Matched entity
    """
    entity: Entity!

    """
    Confidence score (0.0 to 1.0)
    """
    confidence: Float!

    """
    Matching method used
    """
    method: String!

    """
    Detailed feature scores
    """
    features: MatchFeatures
  }

  """
  Link scoring result between entities
  """
  type LinkScore {
    """
    Target entity for the link
    """
    targetEntity: Entity!

    """
    Link strength score (0.0 to 1.0)
    """
    score: Float!

    """
    Confidence in the score
    """
    confidence: Float!

    """
    Link type/category
    """
    linkType: String

    """
    Detailed scoring features
    """
    features: LinkFeatures
  }

  """
  Detailed match feature scores
  """
  type MatchFeatures {
    nameSimilarity: Float
    typeMatch: Float
    neuralConfidence: Float
    attributeSimilarity: Float
  }

  """
  Detailed link scoring features
  """
  type LinkFeatures {
    neuralScore: Float
    nameSimilarity: Float
    typeCompatibility: Float
    contextRelevance: Float
    temporalProximity: Float
  }

  """
  Input for AI entity resolution
  """
  input EntityResolutionInput {
    """
    Minimum confidence threshold
    """
    threshold: Float = 0.8

    """
    Include detailed feature scores
    """
    includeFeatures: Boolean = false

    """
    Maximum number of matches to return
    """
    limit: Int = 10
  }

  """
  Input for AI link scoring
  """
  input LinkScoringInput {
    """
    Target entity types to consider
    """
    targetTypes: [String!]

    """
    Include confidence scores
    """
    includeConfidence: Boolean = true

    """
    Context for scoring (optional)
    """
    context: String

    """
    Maximum number of scores to return
    """
    limit: Int = 20
  }

  """
  Extended Entity type with AI insights
  """
  extend type Entity {
    """
    AI-powered insights for this entity
    """
    aiInsights(
      """
      Configuration for entity resolution
      """
      resolution: EntityResolutionInput

      """
      Configuration for link scoring
      """
      linkScoring: LinkScoringInput
    ): AIInsights

    """
    Quick AI score for entity quality (0.0 to 1.0)
    """
    aiScore: Float!
  }

  """
  Extended Edge type with AI scoring
  """
  extend type Edge {
    """
    AI-computed relevance score for this edge
    """
    aiScore: Float

    """
    AI confidence in this relationship
    """
    aiConfidence: Float

    """
    AI-suggested edge type based on entity analysis
    """
    aiSuggestedType: String
  }

  """
  AI batch operations
  """
  extend type Query {
    """
    Bulk entity resolution across multiple entities
    """
    resolveEntitiesBulk(
      entityIds: [ID!]!
      threshold: Float = 0.8
    ): [EntityMatch!]!

    """
    AI service health and status
    """
    aiServiceHealth: AIServiceHealth!
  }

  """
  AI service health information
  """
  type AIServiceHealth {
    status: String!
    modelsLoaded: Int!
    cacheStatus: String!
    featureFlags: AIFeatureFlags!
    uptime: Float!
    lastHealthCheck: String!
  }

  """
  AI feature flags status
  """
  type AIFeatureFlags {
    entityResolution: Boolean!
    linkScoring: Boolean!
    batchProcessing: Boolean!
  }
`;
// Resolvers
exports.aiInsightsResolvers = {
    Entity: {
        // AI score for individual entity
        aiScore: (0, resolvers_tracing_js_1.traceResolver)('Entity.aiScore', async (entity, args, context) => {
            const aiClient = (0, ai_insights_client_js_1.getAIInsightsClient)();
            if (!aiClient.isEnabled()) {
                return 0.5; // Default neutral score when AI is disabled
            }
            try {
                // Convert entity to AI service format
                const aiEntity = {
                    id: entity.id,
                    name: entity.name || entity.title || 'Unknown',
                    type: entity.type || 'unknown',
                    attributes: entity.attributes || {},
                    metadata: entity.metadata || {},
                };
                return await aiClient.calculateEntityScore(aiEntity);
            }
            catch (error) {
                console.error('❌ Failed to calculate AI score for entity:', error);
                return 0.5; // Fallback score
            }
        }),
        // Comprehensive AI insights
        aiInsights: (0, resolvers_tracing_js_1.traceResolver)('Entity.aiInsights', async (entity, args, context) => {
            const aiClient = (0, ai_insights_client_js_1.getAIInsightsClient)();
            if (!aiClient.isEnabled()) {
                return {
                    entityScore: 0.5,
                    similarEntities: [],
                    linkScores: [],
                    modelVersion: 'disabled',
                    processingTime: 0,
                };
            }
            const startTime = Date.now();
            try {
                // Convert entity to AI service format
                const aiEntity = {
                    id: entity.id,
                    name: entity.name || entity.title || 'Unknown',
                    type: entity.type || 'unknown',
                    attributes: entity.attributes || {},
                    metadata: entity.metadata || {},
                };
                // Get entity score
                const entityScore = await aiClient.calculateEntityScore(aiEntity);
                // Find similar entities if requested
                let similarEntities = [];
                if (args.resolution) {
                    // Get related entities from database
                    const relatedEntities = await context.dataSources.entities.getRelated(entity.id, {
                        limit: 50,
                        types: args.resolution.targetTypes,
                    });
                    if (relatedEntities.length > 0) {
                        const allEntities = [
                            aiEntity,
                            ...relatedEntities.map((e) => ({
                                id: e.id,
                                name: e.name || e.title || 'Unknown',
                                type: e.type || 'unknown',
                                attributes: e.attributes || {},
                                metadata: e.metadata || {},
                            })),
                        ];
                        const matches = await aiClient.resolveEntities(allEntities, {
                            threshold: args.resolution.threshold || 0.8,
                            includeFeatures: args.resolution.includeFeatures || false,
                        });
                        // Filter out self-matches and convert to GraphQL format
                        similarEntities = matches
                            .filter((match) => match.entity_a_id !== entity.id &&
                            match.entity_b_id !== entity.id)
                            .slice(0, args.resolution.limit || 10)
                            .map((match) => ({
                            entity: relatedEntities.find((e) => e.id === match.entity_a_id || e.id === match.entity_b_id),
                            confidence: match.confidence,
                            method: match.method,
                            features: match.features
                                ? {
                                    nameSimilarity: match.features.name_similarity,
                                    typeMatch: match.features.type_match,
                                    neuralConfidence: match.features.neural_confidence,
                                    attributeSimilarity: match.features.attribute_similarity || 0,
                                }
                                : null,
                        }))
                            .filter((item) => item.entity); // Remove any that couldn't be found
                    }
                }
                // Get link scores if requested
                let linkScores = [];
                if (args.linkScoring) {
                    // Get connected entities
                    const connectedEntities = await context.dataSources.entities.getConnected(entity.id, {
                        limit: args.linkScoring.limit || 20,
                        types: args.linkScoring.targetTypes,
                    });
                    if (connectedEntities.length > 0) {
                        const entityPairs = connectedEntities.map((target) => ({
                            entity_a: aiEntity,
                            entity_b: {
                                id: target.id,
                                name: target.name || target.title || 'Unknown',
                                type: target.type || 'unknown',
                                attributes: target.attributes || {},
                                metadata: target.metadata || {},
                            },
                            context: args.linkScoring.context,
                        }));
                        const scores = await aiClient.scoreLinks(entityPairs, {
                            includeConfidence: args.linkScoring.includeConfidence !== false,
                        });
                        linkScores = scores
                            .map((score) => ({
                            targetEntity: connectedEntities.find((e) => e.id === score.entity_b_id),
                            score: score.score,
                            confidence: score.confidence,
                            linkType: 'inferred', // Could be enhanced with AI classification
                            features: {
                                neuralScore: score.features.neural_score,
                                nameSimilarity: score.features.name_similarity,
                                typeCompatibility: score.features.type_compatibility,
                                contextRelevance: score.features.context_relevance,
                                temporalProximity: score.features.temporal_proximity || 0,
                            },
                        }))
                            .filter((item) => item.targetEntity);
                    }
                }
                const processingTime = Date.now() - startTime;
                return {
                    entityScore,
                    similarEntities,
                    linkScores,
                    modelVersion: 'mvp-0.1.0',
                    processingTime,
                };
            }
            catch (error) {
                console.error('❌ Failed to get AI insights:', error);
                return {
                    entityScore: 0.5,
                    similarEntities: [],
                    linkScores: [],
                    modelVersion: 'error',
                    processingTime: Date.now() - startTime,
                };
            }
        }),
    },
    Edge: {
        // AI score for relationship strength
        aiScore: (0, resolvers_tracing_js_1.traceResolver)('Edge.aiScore', async (edge, args, context) => {
            const aiClient = (0, ai_insights_client_js_1.getAIInsightsClient)();
            if (!aiClient.isEnabled()) {
                return null;
            }
            try {
                // Get source and target entities
                const sourceEntity = await context.dataSources.entities.getById(edge.sourceId);
                const targetEntity = await context.dataSources.entities.getById(edge.targetId);
                if (!sourceEntity || !targetEntity) {
                    return null;
                }
                const entityPairs = [
                    {
                        entity_a: {
                            id: sourceEntity.id,
                            name: sourceEntity.name || 'Unknown',
                            type: sourceEntity.type || 'unknown',
                            attributes: sourceEntity.attributes || {},
                        },
                        entity_b: {
                            id: targetEntity.id,
                            name: targetEntity.name || 'Unknown',
                            type: targetEntity.type || 'unknown',
                            attributes: targetEntity.attributes || {},
                        },
                    },
                ];
                const scores = await aiClient.scoreLinks(entityPairs);
                return scores.length > 0 ? scores[0].score : null;
            }
            catch (error) {
                console.error('❌ Failed to calculate AI score for edge:', error);
                return null;
            }
        }),
        // AI confidence in the relationship
        aiConfidence: (0, resolvers_tracing_js_1.traceResolver)('Edge.aiConfidence', async (edge, args, context) => {
            const aiClient = (0, ai_insights_client_js_1.getAIInsightsClient)();
            if (!aiClient.isEnabled()) {
                return null;
            }
            // Similar to aiScore but return confidence
            // Implementation would be similar to above
            return 0.8; // Placeholder
        }),
        // AI-suggested edge type
        aiSuggestedType: (0, resolvers_tracing_js_1.traceResolver)('Edge.aiSuggestedType', async (edge, args, context) => {
            // This would use AI to suggest the most appropriate edge type
            // For MVP, return current type or a default
            return edge.type || 'related';
        }),
    },
    Query: {
        // Bulk entity resolution
        resolveEntitiesBulk: (0, resolvers_tracing_js_1.traceResolver)('Query.resolveEntitiesBulk', async (parent, args, context) => {
            const aiClient = (0, ai_insights_client_js_1.getAIInsightsClient)();
            if (!aiClient.isEnabled()) {
                return [];
            }
            // Get entities by IDs
            const entities = await Promise.all(args.entityIds.map((id) => context.dataSources.entities.getById(id)));
            const validEntities = entities.filter(Boolean).map((entity) => ({
                id: entity.id,
                name: entity.name || 'Unknown',
                type: entity.type || 'unknown',
                attributes: entity.attributes || {},
            }));
            if (validEntities.length === 0) {
                return [];
            }
            const matches = await aiClient.batchResolveEntities(validEntities, 50, args.threshold);
            // Convert to GraphQL format
            return matches
                .map((match) => ({
                entity: entities.find((e) => e?.id === match.entity_a_id || e?.id === match.entity_b_id),
                confidence: match.confidence,
                method: match.method,
                features: match.features,
            }))
                .filter((item) => item.entity);
        }),
        // AI service health
        aiServiceHealth: (0, resolvers_tracing_js_1.traceResolver)('Query.aiServiceHealth', async (parent, args, context) => {
            const aiClient = (0, ai_insights_client_js_1.getAIInsightsClient)();
            try {
                const health = await aiClient.getHealth();
                if (!health) {
                    return {
                        status: 'unavailable',
                        modelsLoaded: 0,
                        cacheStatus: 'unknown',
                        featureFlags: {
                            entityResolution: false,
                            linkScoring: false,
                            batchProcessing: false,
                        },
                        uptime: 0,
                        lastHealthCheck: new Date().toISOString(),
                    };
                }
                return {
                    status: health.status,
                    modelsLoaded: health.models_loaded,
                    cacheStatus: health.cache_status,
                    featureFlags: {
                        entityResolution: health.feature_flags.ai_scoring,
                        linkScoring: health.feature_flags.ai_scoring,
                        batchProcessing: true,
                    },
                    uptime: health.uptime_seconds || 0,
                    lastHealthCheck: new Date().toISOString(),
                };
            }
            catch (error) {
                console.error('❌ Failed to get AI service health:', error);
                return {
                    status: 'error',
                    modelsLoaded: 0,
                    cacheStatus: 'error',
                    featureFlags: {
                        entityResolution: false,
                        linkScoring: false,
                        batchProcessing: false,
                    },
                    uptime: 0,
                    lastHealthCheck: new Date().toISOString(),
                };
            }
        }),
    },
};
exports.default = {
    typeDefs: exports.aiInsightsTypeDefs,
    resolvers: exports.aiInsightsResolvers,
};
