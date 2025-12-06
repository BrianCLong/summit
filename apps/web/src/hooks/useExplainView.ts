import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { useMemo, useCallback } from 'react'
import type { Entity, Relationship } from '@/types'

// GraphQL queries for Explain View data
const GET_PROVENANCE_DATA = gql`
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
`

const GET_XAI_EXPLANATION = gql`
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
`

const GET_CONTRIBUTION_SCORES = gql`
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
`

const RECORD_EXPLAIN_VIEW_INTERACTION = gql`
  mutation RecordExplainViewInteraction($input: ExplainInteractionInput!) {
    recordExplainInteraction(input: $input) {
      success
      timestamp
    }
  }
`

interface ProvenanceData {
  entityId: string
  sourceId: string
  sourceName: string
  transforms: Array<{
    id: string
    operation: string
    timestamp: string
    confidence: number
  }>
  license: string
  lastSeen: string
  confidence: number
}

interface XAIReason {
  type: string
  description: string
  score: number
  evidence?: string[]
}

interface XAIExplanation {
  entityId: string
  reasons: XAIReason[]
  centrality: {
    degree: number
    betweenness: number
    closeness: number
  }
  importance: number
}

interface ContributionScore {
  entityId?: string
  relationshipId?: string
  score: number
  reasons: string[]
}

interface UseExplainViewOptions {
  entities: Entity[]
  relationships: Relationship[]
  activeFilters?: Record<string, any>
  enableRealtime?: boolean
}

/**
 * Hook for accessing Explain View data from backend services
 *
 * This hook provides:
 * - Provenance data from prov-ledger service
 * - XAI explanations from ML models
 * - Contribution scores for entities and relationships
 * - Analytics tracking for user interactions
 */
export function useExplainView({
  entities,
  relationships,
  activeFilters,
  enableRealtime = false,
}: UseExplainViewOptions) {
  const entityIds = useMemo(() => entities.map(e => e.id), [entities])
  const relationshipIds = useMemo(() => relationships.map(r => r.id), [relationships])

  // Fetch provenance data
  const {
    data: provenanceData,
    loading: provenanceLoading,
    error: provenanceError,
    refetch: refetchProvenance,
  } = useQuery<{ provenance: ProvenanceData[] }>(GET_PROVENANCE_DATA, {
    variables: { entityIds },
    skip: entityIds.length === 0,
    pollInterval: enableRealtime ? 30000 : undefined, // Poll every 30s if realtime
  })

  // Fetch contribution scores
  const {
    data: contributionData,
    loading: contributionLoading,
    error: contributionError,
  } = useQuery<{
    contributionScores: {
      entityScores: ContributionScore[]
      relationshipScores: ContributionScore[]
    }
  }>(GET_CONTRIBUTION_SCORES, {
    variables: { entityIds, relationshipIds },
    skip: entityIds.length === 0,
  })

  // Record interaction mutation
  const [recordInteraction] = useMutation(RECORD_EXPLAIN_VIEW_INTERACTION)

  // Calculate top contributing entities
  const topEntities = useMemo(() => {
    if (!contributionData?.contributionScores.entityScores) {
      // Fallback to local calculation
      return entities
        .map(entity => {
          const connections = relationships.filter(
            r => r.sourceId === entity.id || r.targetId === entity.id
          ).length

          const reasons: string[] = []
          if (connections > 5) reasons.push(`${connections} connections`)
          if (entity.confidence > 0.9) reasons.push('High confidence')
          if (entity.type === 'PERSON' || entity.type === 'ORGANIZATION') {
            reasons.push('Key entity type')
          }

          const score = connections * 0.6 + entity.confidence * 0.4

          return {
            entity,
            score,
            reasons,
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    }

    // Use backend scores
    return contributionData.contributionScores.entityScores
      .map(scoreData => {
        const entity = entities.find(e => e.id === scoreData.entityId)
        return entity
          ? {
              entity,
              score: scoreData.score,
              reasons: scoreData.reasons,
            }
          : null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 5)
  }, [contributionData, entities, relationships])

  // Calculate top contributing relationships
  const topRelationships = useMemo(() => {
    if (!contributionData?.contributionScores.relationshipScores) {
      // Fallback to local calculation
      return relationships
        .map(relationship => {
          const sourceEntity = entities.find(e => e.id === relationship.sourceId)
          const targetEntity = entities.find(e => e.id === relationship.targetId)

          if (!sourceEntity || !targetEntity) return null

          const reasons: string[] = []
          if (relationship.confidence > 0.85) reasons.push('High confidence')
          if (
            sourceEntity.type === 'PERSON' &&
            targetEntity.type === 'ORGANIZATION'
          ) {
            reasons.push('Person-Organization link')
          }

          const score = relationship.confidence * 0.7 + 0.3

          return {
            relationship,
            sourceEntity,
            targetEntity,
            score,
            reasons,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    }

    // Use backend scores
    return contributionData.contributionScores.relationshipScores
      .map(scoreData => {
        const relationship = relationships.find(
          r => r.id === scoreData.relationshipId
        )
        if (!relationship) return null

        const sourceEntity = entities.find(e => e.id === relationship.sourceId)
        const targetEntity = entities.find(e => e.id === relationship.targetId)

        if (!sourceEntity || !targetEntity) return null

        return {
          relationship,
          sourceEntity,
          targetEntity,
          score: scoreData.score,
          reasons: scoreData.reasons,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 5)
  }, [contributionData, relationships, entities])

  // Calculate confidence statistics
  const confidenceStats = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 }
    entities.forEach(entity => {
      if (entity.confidence >= 0.8) buckets.high++
      else if (entity.confidence >= 0.5) buckets.medium++
      else buckets.low++
    })

    const total = entities.length || 1
    return {
      high: { count: buckets.high, percent: (buckets.high / total) * 100 },
      medium: {
        count: buckets.medium,
        percent: (buckets.medium / total) * 100,
      },
      low: { count: buckets.low, percent: (buckets.low / total) * 100 },
    }
  }, [entities])

  // Calculate provenance summary
  const provenanceSummary = useMemo(() => {
    if (provenanceData?.provenance) {
      const sources = new Set(
        provenanceData.provenance.map(p => p.sourceName)
      )
      const licenses = new Set(provenanceData.provenance.map(p => p.license))
      const avgConfidence =
        provenanceData.provenance.reduce((sum, p) => sum + p.confidence, 0) /
        (provenanceData.provenance.length || 1)

      return {
        sourceCount: sources.size,
        licenseTypes: Array.from(licenses),
        avgConfidence: Math.round(avgConfidence * 100),
      }
    }

    // Fallback to local calculation
    const sources = new Set<string>()
    const licenses = new Set<string>()
    let avgConfidence = 0

    entities.forEach(entity => {
      if (entity.properties?.source) sources.add(entity.properties.source)
      if (entity.properties?.license) licenses.add(entity.properties.license)
      avgConfidence += entity.confidence
    })

    avgConfidence = entities.length > 0 ? avgConfidence / entities.length : 0

    return {
      sourceCount: sources.size,
      licenseTypes: Array.from(licenses),
      avgConfidence: Math.round(avgConfidence * 100),
    }
  }, [provenanceData, entities])

  // Function to get XAI explanation for a specific entity
  const getEntityExplanation = useCallback(
    async (entityId: string) => {
      const context = {
        filters: activeFilters,
        totalEntities: entities.length,
        totalRelationships: relationships.length,
      }

      try {
        // This would call the backend XAI service
        // For now, we generate a local explanation
        const entity = entities.find(e => e.id === entityId)
        if (!entity) return null

        const connections = relationships.filter(
          r => r.sourceId === entityId || r.targetId === entityId
        )

        const reasons: XAIReason[] = [
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
        ]

        if (entity.type === 'PERSON' || entity.type === 'ORGANIZATION') {
          reasons.push({
            type: 'type',
            description: 'High-priority entity type',
            score: 0.8,
          })
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
        }
      } catch (error) {
        console.error('Failed to get entity explanation:', error)
        return null
      }
    },
    [entities, relationships, activeFilters]
  )

  // Track when user interacts with explain view
  const trackInteraction = useCallback(
    async (action: string, metadata?: Record<string, any>) => {
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
        })
      } catch (error) {
        console.error('Failed to record interaction:', error)
      }
    },
    [recordInteraction, activeFilters]
  )

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
  }
}

// Export for use in tests
export type { ProvenanceData, XAIExplanation, XAIReason, ContributionScore }
