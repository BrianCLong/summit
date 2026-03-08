"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExplainView = useExplainView;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = require("@apollo/client/react");
const client_1 = require("@apollo/client");
const react_2 = require("react");
// GraphQL queries for Explain View data
const GET_PROVENANCE_DATA = (0, client_1.gql) `
  query GetProvenanceData($entityIds: [ID!]!) {
    provenance(entityIds: $entityIds) {
      entityId
      sourceId
      sourceName
      transforms {
        id
        operation
        timestamp
        confidence
      }
      license
      lastSeen
      confidence
    }
  }
`;
const GET_XAI_EXPLANATION = (0, client_1.gql) `
  query GetXAIExplanation($entityId: ID!, $context: ExplainContext!) {
    explainEntity(entityId: $entityId, context: $context) {
      entityId
      reasons {
        type
        description
        score
        evidence
      }
      centrality {
        degree
        betweenness
        closeness
      }
      importance
    }
  }
`;
const GET_CONTRIBUTION_SCORES = (0, client_1.gql) `
  query GetContributionScores($entityIds: [ID!]!, $relationshipIds: [ID!]!) {
    contributionScores(
      entityIds: $entityIds
      relationshipIds: $relationshipIds
    ) {
      entityScores {
        entityId
        score
        reasons
      }
      relationshipScores {
        relationshipId
        score
        reasons
      }
    }
  }
`;
const RECORD_EXPLAIN_VIEW_INTERACTION = (0, client_1.gql) `
  mutation RecordExplainViewInteraction($input: ExplainInteractionInput!) {
    recordExplainInteraction(input: $input) {
      success
      timestamp
    }
  }
`;
/**
 * Hook for accessing Explain View data from backend services
 *
 * This hook provides:
 * - Provenance data from prov-ledger service
 * - XAI explanations from ML models
 * - Contribution scores for entities and relationships
 * - Analytics tracking for user interactions
 */
function useExplainView({ entities, relationships, activeFilters, enableRealtime = false, }) {
    const entityIds = (0, react_2.useMemo)(() => entities.map(e => e.id), [entities]);
    const relationshipIds = (0, react_2.useMemo)(() => relationships.map(r => r.id), [relationships]);
    // Fetch provenance data
    const { data: provenanceData, loading: provenanceLoading, error: provenanceError, refetch: refetchProvenance, } = (0, react_1.useQuery)(GET_PROVENANCE_DATA, {
        variables: { entityIds },
        skip: entityIds.length === 0,
        pollInterval: enableRealtime ? 30000 : undefined, // Poll every 30s if realtime
    });
    // Fetch contribution scores
    const { data: contributionData, loading: contributionLoading, error: contributionError, } = (0, react_1.useQuery)(GET_CONTRIBUTION_SCORES, {
        variables: { entityIds, relationshipIds },
        skip: entityIds.length === 0,
    });
    // Record interaction mutation
    const [recordInteraction] = (0, react_1.useMutation)(RECORD_EXPLAIN_VIEW_INTERACTION);
    // Calculate top contributing entities
    const topEntities = (0, react_2.useMemo)(() => {
        if (!contributionData?.contributionScores.entityScores) {
            // Bolt Optimization: Pre-calculate connection counts to avoid O(N*M) nested loop
            // Reduced complexity to O(N + M)
            const connectionCounts = new Map();
            relationships.forEach(r => {
                connectionCounts.set(r.sourceId, (connectionCounts.get(r.sourceId) || 0) + 1);
                if (r.targetId !== r.sourceId) {
                    connectionCounts.set(r.targetId, (connectionCounts.get(r.targetId) || 0) + 1);
                }
            });
            // Fallback to local calculation
            return entities
                .map(entity => {
                const connections = connectionCounts.get(entity.id) || 0;
                const reasons = [];
                if (connections > 5) {
                    reasons.push(`${connections} connections`);
                }
                if (entity.confidence > 0.9) {
                    reasons.push('High confidence');
                }
                if (entity.type === 'PERSON' || entity.type === 'ORGANIZATION') {
                    reasons.push('Key entity type');
                }
                const score = connections * 0.6 + entity.confidence * 0.4;
                return {
                    entity,
                    score,
                    reasons,
                };
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
        }
        // Use backend scores
        return contributionData.contributionScores.entityScores
            .map(scoreData => {
            const entity = entities.find(e => e.id === scoreData.entityId);
            return entity
                ? {
                    entity,
                    score: scoreData.score,
                    reasons: scoreData.reasons,
                }
                : null;
        })
            .filter((item) => item !== null)
            .slice(0, 5);
    }, [contributionData, entities, relationships]);
    // Calculate top contributing relationships
    const topRelationships = (0, react_2.useMemo)(() => {
        if (!contributionData?.contributionScores.relationshipScores) {
            // Bolt Optimization: Pre-calculate entity map to avoid O(M*N) nested finds
            // Reduced complexity to O(N + M)
            const entityMap = new Map(entities.map(e => [e.id, e]));
            // Fallback to local calculation
            return relationships
                .map(relationship => {
                const sourceEntity = entityMap.get(relationship.sourceId);
                const targetEntity = entityMap.get(relationship.targetId);
                if (!sourceEntity || !targetEntity) {
                    return null;
                }
                const reasons = [];
                if (relationship.confidence > 0.85) {
                    reasons.push('High confidence');
                }
                if (sourceEntity.type === 'PERSON' &&
                    targetEntity.type === 'ORGANIZATION') {
                    reasons.push('Person-Organization link');
                }
                const score = relationship.confidence * 0.7 + 0.3;
                return {
                    relationship,
                    sourceEntity,
                    targetEntity,
                    score,
                    reasons,
                };
            })
                .filter((item) => item !== null)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
        }
        // Use backend scores
        return contributionData.contributionScores.relationshipScores
            .map(scoreData => {
            const relationship = relationships.find(r => r.id === scoreData.relationshipId);
            if (!relationship) {
                return null;
            }
            const sourceEntity = entities.find(e => e.id === relationship.sourceId);
            const targetEntity = entities.find(e => e.id === relationship.targetId);
            if (!sourceEntity || !targetEntity) {
                return null;
            }
            return {
                relationship,
                sourceEntity,
                targetEntity,
                score: scoreData.score,
                reasons: scoreData.reasons,
            };
        })
            .filter((item) => item !== null)
            .slice(0, 5);
    }, [contributionData, relationships, entities]);
    // Calculate confidence statistics
    const confidenceStats = (0, react_2.useMemo)(() => {
        const buckets = { high: 0, medium: 0, low: 0 };
        entities.forEach(entity => {
            if (entity.confidence >= 0.8) {
                buckets.high++;
            }
            else if (entity.confidence >= 0.5) {
                buckets.medium++;
            }
            else {
                buckets.low++;
            }
        });
        const total = entities.length || 1;
        return {
            high: { count: buckets.high, percent: (buckets.high / total) * 100 },
            medium: {
                count: buckets.medium,
                percent: (buckets.medium / total) * 100,
            },
            low: { count: buckets.low, percent: (buckets.low / total) * 100 },
        };
    }, [entities]);
    // Calculate provenance summary
    const provenanceSummary = (0, react_2.useMemo)(() => {
        if (provenanceData?.provenance) {
            const sources = new Set(provenanceData.provenance.map(p => p.sourceName));
            const licenses = new Set(provenanceData.provenance.map(p => p.license));
            const avgConfidence = provenanceData.provenance.reduce((sum, p) => sum + p.confidence, 0) /
                (provenanceData.provenance.length || 1);
            return {
                sourceCount: sources.size,
                licenseTypes: Array.from(licenses),
                avgConfidence: Math.round(avgConfidence * 100),
            };
        }
        // Fallback to local calculation
        const sources = new Set();
        const licenses = new Set();
        let avgConfidence = 0;
        entities.forEach(entity => {
            if (entity.properties?.source) {
                sources.add(entity.properties.source);
            }
            if (entity.properties?.license) {
                licenses.add(entity.properties.license);
            }
            avgConfidence += entity.confidence;
        });
        avgConfidence = entities.length > 0 ? avgConfidence / entities.length : 0;
        return {
            sourceCount: sources.size,
            licenseTypes: Array.from(licenses),
            avgConfidence: Math.round(avgConfidence * 100),
        };
    }, [provenanceData, entities]);
    // Function to get XAI explanation for a specific entity
    const getEntityExplanation = (0, react_2.useCallback)(async (entityId) => {
        const context = {
            filters: activeFilters,
            totalEntities: entities.length,
            totalRelationships: relationships.length,
        };
        try {
            // This would call the backend XAI service
            // For now, we generate a local explanation
            const entity = entities.find(e => e.id === entityId);
            if (!entity) {
                return null;
            }
            const connections = relationships.filter(r => r.sourceId === entityId || r.targetId === entityId);
            const reasons = [
                {
                    type: 'centrality',
                    description: `Has ${connections.length} connections in the network`,
                    score: Math.min(connections.length / 10, 1),
                },
                {
                    type: 'confidence',
                    description: `Confidence score of ${Math.round(entity.confidence * 100)}%`,
                    score: entity.confidence,
                },
            ];
            if (entity.type === 'PERSON' || entity.type === 'ORGANIZATION') {
                reasons.push({
                    type: 'type',
                    description: 'High-priority entity type',
                    score: 0.8,
                });
            }
            return {
                entityId,
                reasons,
                centrality: {
                    degree: connections.length,
                    betweenness: 0, // Would be calculated by backend
                    closeness: 0, // Would be calculated by backend
                },
                importance: reasons.reduce((sum, r) => sum + r.score, 0) / reasons.length,
            };
        }
        catch (error) {
            console.error('Failed to get entity explanation:', error);
            return null;
        }
    }, [entities, relationships, activeFilters]);
    // Track when user interacts with explain view
    const trackInteraction = (0, react_2.useCallback)(async (action, metadata) => {
        try {
            await recordInteraction({
                variables: {
                    input: {
                        action,
                        timestamp: new Date().toISOString(),
                        filters: activeFilters,
                        metadata,
                    },
                },
            });
        }
        catch (error) {
            console.error('Failed to record interaction:', error);
        }
    }, [recordInteraction, activeFilters]);
    return {
        // Data
        topEntities,
        topRelationships,
        confidenceStats,
        provenanceSummary,
        provenanceData: provenanceData?.provenance || [],
        // Loading states
        isLoading: provenanceLoading || contributionLoading,
        provenanceLoading,
        contributionLoading,
        // Errors
        error: provenanceError || contributionError,
        provenanceError,
        contributionError,
        // Functions
        getEntityExplanation,
        trackInteraction,
        refetchProvenance,
    };
}
