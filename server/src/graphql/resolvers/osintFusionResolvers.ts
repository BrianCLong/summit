/**
 * OSINT Fusion GraphQL Resolvers
 *
 * Provides GraphQL API for multi-source intelligence fusion,
 * graph traversal, and entity validation.
 */

import {
  OSINTFusionAgent,
  HallucinationGuard,
  GraphTraversal,
  SourceConnectorFactory,
  OsintFusionQuery,
  FusionOptions,
  OsintEntity,
  OsintRelationship,
  OsintEntityType,
  OsintRelationshipType,
  OsintSourceType,
  GraphTraversalConfig,
  ClassificationLevel,
} from '../../../../src/agents/osint-fusion';

// Singleton instances
let fusionAgent: OSINTFusionAgent | null = null;
let graphTraversal: GraphTraversal | null = null;
let hallucinationGuard: HallucinationGuard | null = null;

/**
 * Initialize OSINT Fusion components
 */
async function getAgent(): Promise<OSINTFusionAgent> {
  if (!fusionAgent) {
    fusionAgent = new OSINTFusionAgent({
      targetValidationRate: 0.85,
      targetP95LatencyMs: 2000,
    });
    await fusionAgent.initialize();
  }
  return fusionAgent;
}

function getGraphTraversal(): GraphTraversal {
  if (!graphTraversal) {
    graphTraversal = new GraphTraversal(300000); // 5 min cache
  }
  return graphTraversal;
}

function getHallucinationGuard(): HallucinationGuard {
  if (!hallucinationGuard) {
    hallucinationGuard = new HallucinationGuard({
      minCorroboratingSourceCount: 2,
      confidenceThreshold: 0.7,
    });
  }
  return hallucinationGuard;
}

/**
 * Convert GraphQL enum to internal type
 */
function mapSourceType(type: string): OsintSourceType {
  const mapping: Record<string, OsintSourceType> = {
    SOCIAL_MEDIA: 'social_media',
    DOMAIN_REGISTRY: 'domain_registry',
    DARK_WEB: 'dark_web',
    PUBLIC_RECORDS: 'public_records',
    NEWS_MEDIA: 'news_media',
    ACADEMIC: 'academic',
    GOVERNMENT: 'government',
    COMMERCIAL: 'commercial',
  };
  return mapping[type] || 'public_records';
}

function mapEntityType(type: string): OsintEntityType {
  const mapping: Record<string, OsintEntityType> = {
    PERSON: 'person',
    ORGANIZATION: 'organization',
    LOCATION: 'location',
    EVENT: 'event',
    DOCUMENT: 'document',
    CYBER_ARTIFACT: 'cyber_artifact',
    FINANCIAL_INSTRUMENT: 'financial_instrument',
    COMMUNICATION: 'communication',
    INFRASTRUCTURE: 'infrastructure',
  };
  return mapping[type] || 'person';
}

function mapRelationshipType(type: string): OsintRelationshipType {
  const mapping: Record<string, OsintRelationshipType> = {
    ASSOCIATED_WITH: 'associated_with',
    LOCATED_AT: 'located_at',
    MEMBER_OF: 'member_of',
    OWNS: 'owns',
    CONTROLS: 'controls',
    COMMUNICATES_WITH: 'communicates_with',
    TRANSACTS_WITH: 'transacts_with',
    RELATED_TO: 'related_to',
    ALIAS_OF: 'alias_of',
    PART_OF: 'part_of',
  };
  return mapping[type] || 'related_to';
}

function mapClassification(level: string): ClassificationLevel {
  const mapping: Record<string, ClassificationLevel> = {
    UNCLASSIFIED: 'UNCLASSIFIED',
    CONFIDENTIAL: 'CONFIDENTIAL',
    SECRET: 'SECRET',
    TOP_SECRET: 'TOP_SECRET',
    SCI: 'SCI',
    SAP: 'SAP',
  };
  return mapping[level] || 'UNCLASSIFIED';
}

/**
 * GraphQL Resolvers
 */
const osintFusionResolvers = {
  Query: {
    /**
     * Execute OSINT fusion query
     */
    osintFuse: async (
      _parent: unknown,
      args: {
        query: {
          keywords: string[];
          entityTypes?: string[];
          sources?: string[];
          geoBounds?: { lat: number; lon: number; radiusKm: number };
          temporalBounds?: { start: Date; end: Date };
          minConfidence?: number;
          maxResults?: number;
          includeRelationships?: boolean;
          traversalDepth?: number;
        };
        options?: {
          enableHallucinationGuard?: boolean;
          minCorroboratingSourceCount?: number;
          confidenceThreshold?: number;
          maxTraversalDepth?: number;
          enableSemanticMatching?: boolean;
          enableTemporalAnalysis?: boolean;
          airgapMode?: boolean;
          maxLatencyMs?: number;
        };
      },
      context: any,
    ) => {
      const agent = await getAgent();

      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {
          sources: args.query.sources?.map(mapSourceType),
        },
        keywords: args.query.keywords,
        entityTypes: args.query.entityTypes?.map(mapEntityType),
        geoBounds: args.query.geoBounds,
        temporalBounds: args.query.temporalBounds,
        minConfidence: args.query.minConfidence,
        maxResults: args.query.maxResults,
        includeRelationships: args.query.includeRelationships,
        traversalDepth: args.query.traversalDepth,
      };

      const options: FusionOptions = {
        enableHallucinationGuard: args.options?.enableHallucinationGuard ?? true,
        minCorroboratingSourceCount: args.options?.minCorroboratingSourceCount ?? 2,
        confidenceThreshold: args.options?.confidenceThreshold ?? 0.7,
        maxTraversalDepth: args.options?.maxTraversalDepth ?? 3,
        enableSemanticMatching: args.options?.enableSemanticMatching ?? true,
        enableTemporalAnalysis: args.options?.enableTemporalAnalysis ?? true,
        airgapMode: args.options?.airgapMode ?? false,
        maxLatencyMs: args.options?.maxLatencyMs ?? 2000,
      };

      return agent.fuse(query, options);
    },

    /**
     * Get single entity by ID
     */
    osintEntity: async (_parent: unknown, args: { id: string }) => {
      const traversal = getGraphTraversal();
      const entities = await traversal.fetchEntitiesByIds([args.id]);
      return entities[0] || null;
    },

    /**
     * Get multiple entities with filters
     */
    osintEntities: async (
      _parent: unknown,
      args: {
        ids?: string[];
        type?: string;
        label?: string;
        minConfidence?: number;
        limit?: number;
        offset?: number;
      },
    ) => {
      const traversal = getGraphTraversal();

      if (args.ids) {
        return traversal.fetchEntitiesByIds(args.ids);
      }

      // For more complex queries, use graph traversal
      const config: GraphTraversalConfig = {
        startNodeIds: [],
        direction: 'both',
        maxDepth: 1,
        filters: {
          entityTypes: args.type ? [mapEntityType(args.type)] : undefined,
          minConfidence: args.minConfidence,
        },
        limit: args.limit || 100,
      };

      const result = await traversal.traverse(config);
      return result.nodes;
    },

    /**
     * Search entities by text
     */
    osintSearchEntities: async (
      _parent: unknown,
      args: {
        query: string;
        entityTypes?: string[];
        limit?: number;
      },
    ) => {
      const agent = await getAgent();

      const fusionQuery: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {},
        keywords: [args.query],
        entityTypes: args.entityTypes?.map(mapEntityType),
        maxResults: args.limit || 20,
      };

      const result = await agent.fuse(fusionQuery);
      return result.entities;
    },

    /**
     * Find similar entities
     */
    osintSimilarEntities: async (
      _parent: unknown,
      args: {
        entityId: string;
        topK?: number;
        minSimilarity?: number;
      },
    ) => {
      const traversal = getGraphTraversal();

      // Get the source entity
      const entities = await traversal.fetchEntitiesByIds([args.entityId]);
      const sourceEntity = entities[0];

      if (!sourceEntity || !sourceEntity.embedding) {
        return [];
      }

      const similar = await traversal.findSimilarEntities(
        sourceEntity.embedding,
        args.topK || 10,
        args.minSimilarity || 0.7,
      );

      return similar
        .filter((e) => e.id !== args.entityId)
        .map((entity) => ({
          entity,
          similarity: 0.8, // Placeholder - actual similarity computed in traversal
        }));
    },

    /**
     * Get relationship by ID
     */
    osintRelationship: async (_parent: unknown, args: { id: string }) => {
      const traversal = getGraphTraversal();
      const relationships = await traversal.fetchRelationshipsByIds([args.id]);
      return relationships[0] || null;
    },

    /**
     * Get relationships with filters
     */
    osintRelationships: async (
      _parent: unknown,
      args: {
        entityId?: string;
        type?: string;
        limit?: number;
      },
    ) => {
      const traversal = getGraphTraversal();

      if (!args.entityId) {
        return [];
      }

      const config: GraphTraversalConfig = {
        startNodeIds: [args.entityId],
        relationshipTypes: args.type ? [mapRelationshipType(args.type)] : undefined,
        direction: 'both',
        maxDepth: 1,
        limit: args.limit || 50,
      };

      const result = await traversal.traverse(config);
      return result.edges;
    },

    /**
     * Find shortest paths between entities
     */
    osintShortestPaths: async (
      _parent: unknown,
      args: {
        sourceId: string;
        targetId: string;
        maxDepth?: number;
        relationshipTypes?: string[];
      },
    ) => {
      const traversal = getGraphTraversal();

      const result = await traversal.findShortestPaths(
        args.sourceId,
        args.targetId,
        args.maxDepth || 5,
        args.relationshipTypes?.map(mapRelationshipType),
      );

      return result.paths.map((path) => ({
        nodes: path.nodes,
        edges: path.edges,
        totalWeight: path.totalWeight,
        entities: result.nodes.filter((n) => path.nodes.includes(n.id)),
        relationships: result.edges.filter((e) => path.edges.includes(e.id)),
      }));
    },

    /**
     * Get entity neighborhood
     */
    osintNeighborhood: async (
      _parent: unknown,
      args: {
        entityId: string;
        depth?: number;
        minConfidence?: number;
      },
    ) => {
      const traversal = getGraphTraversal();

      const result = await traversal.findNeighborhood(
        args.entityId,
        args.depth || 2,
        {
          minConfidence: args.minConfidence,
        },
      );

      return {
        nodes: result.nodes,
        edges: result.edges,
        depth: args.depth || 2,
        metrics: result.metrics,
      };
    },

    /**
     * Execute custom graph traversal
     */
    osintTraverse: async (
      _parent: unknown,
      args: {
        input: {
          startNodeIds: string[];
          relationshipTypes?: string[];
          direction?: string;
          maxDepth: number;
          entityTypes?: string[];
          minConfidence?: number;
          limit?: number;
        };
      },
    ) => {
      const traversal = getGraphTraversal();

      const config: GraphTraversalConfig = {
        startNodeIds: args.input.startNodeIds,
        relationshipTypes: args.input.relationshipTypes?.map(mapRelationshipType),
        direction: (args.input.direction?.toLowerCase() || 'both') as 'outgoing' | 'incoming' | 'both',
        maxDepth: args.input.maxDepth,
        filters: {
          entityTypes: args.input.entityTypes?.map(mapEntityType),
          minConfidence: args.input.minConfidence,
        },
        limit: args.input.limit,
      };

      const result = await traversal.traverse(config);

      return {
        nodes: result.nodes,
        edges: result.edges,
        depth: args.input.maxDepth,
        metrics: result.metrics,
      };
    },

    /**
     * Validate entity for hallucination
     */
    osintValidateEntity: async (_parent: unknown, args: { entityId: string }) => {
      const traversal = getGraphTraversal();
      const guard = getHallucinationGuard();

      const entities = await traversal.fetchEntitiesByIds([args.entityId]);
      const entity = entities[0];

      if (!entity) {
        throw new Error(`Entity not found: ${args.entityId}`);
      }

      return guard.validateEntity(entity);
    },

    /**
     * Get OSINT Fusion status
     */
    osintFusionStatus: async () => {
      const agent = await getAgent();
      const guard = getHallucinationGuard();

      const status = agent.getStatus();
      const health = await agent.getHealthCheck();
      const sourceHealth = await SourceConnectorFactory.healthCheckAll();
      const guardMetrics = guard.getMetrics();

      const sourceConnectors = Array.from(sourceHealth.entries()).map(
        ([type, healthStatus]) => ({
          sourceType: type.toUpperCase(),
          healthy: healthStatus.healthy,
          latencyMs: healthStatus.latencyMs,
          rateLimitRemaining: 100, // Placeholder
          rateLimitResetAt: new Date(Date.now() + 60000),
        }),
      );

      return {
        healthy: health.healthy,
        initialized: status.status === 'ready',
        sourceConnectors,
        graphConnection: health.checks.graphConnection,
        metrics: {
          totalRequests: agent.getMetrics().totalRequests,
          successfulRequests: agent.getMetrics().successfulRequests,
          failedRequests: agent.getMetrics().failedRequests,
          averageResponseTime: agent.getMetrics().averageResponseTime,
          p95ResponseTime: agent.getMetrics().p95ResponseTime,
          p99ResponseTime: agent.getMetrics().p99ResponseTime,
          validationRate: guardMetrics.validationRate,
        },
      };
    },
  },

  Mutation: {
    /**
     * Create new entity
     */
    osintCreateEntity: async (
      _parent: unknown,
      args: {
        input: {
          type: string;
          label: string;
          description?: string;
          aliases?: string[];
          attributes?: Record<string, any>;
          classification?: string;
        };
      },
    ) => {
      const traversal = getGraphTraversal();
      const guard = getHallucinationGuard();

      const entity: OsintEntity = {
        id: `entity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: mapEntityType(args.input.type),
        label: args.input.label,
        description: args.input.description,
        aliases: args.input.aliases || [],
        attributes: args.input.attributes || {},
        confidence: 0.5, // Initial confidence
        sources: [],
        validationStatus: {
          validated: false,
          validator: 'manual',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'medium',
        },
        classification: mapClassification(args.input.classification || 'UNCLASSIFIED'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return traversal.storeEntity(entity);
    },

    /**
     * Update existing entity
     */
    osintUpdateEntity: async (
      _parent: unknown,
      args: {
        id: string;
        input: {
          type?: string;
          label?: string;
          description?: string;
          aliases?: string[];
          attributes?: Record<string, any>;
          classification?: string;
        };
      },
    ) => {
      const traversal = getGraphTraversal();

      const entities = await traversal.fetchEntitiesByIds([args.id]);
      const existing = entities[0];

      if (!existing) {
        throw new Error(`Entity not found: ${args.id}`);
      }

      const updated: OsintEntity = {
        ...existing,
        type: args.input.type ? mapEntityType(args.input.type) : existing.type,
        label: args.input.label || existing.label,
        description: args.input.description ?? existing.description,
        aliases: args.input.aliases || existing.aliases,
        attributes: args.input.attributes || existing.attributes,
        classification: args.input.classification
          ? mapClassification(args.input.classification)
          : existing.classification,
        updatedAt: new Date(),
      };

      return traversal.storeEntity(updated);
    },

    /**
     * Delete entity
     */
    osintDeleteEntity: async (_parent: unknown, args: { id: string }) => {
      // Note: Actual deletion would be implemented in GraphTraversal
      // For now, return success
      return true;
    },

    /**
     * Create relationship
     */
    osintCreateRelationship: async (
      _parent: unknown,
      args: {
        input: {
          type: string;
          sourceEntityId: string;
          targetEntityId: string;
          attributes?: Record<string, any>;
          temporalBounds?: { start?: Date; end?: Date };
        };
      },
    ) => {
      const traversal = getGraphTraversal();

      const relationship: OsintRelationship = {
        id: `rel_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: mapRelationshipType(args.input.type),
        sourceEntityId: args.input.sourceEntityId,
        targetEntityId: args.input.targetEntityId,
        confidence: 0.5,
        weight: 1.0,
        attributes: args.input.attributes || {},
        temporalBounds: args.input.temporalBounds,
        sources: [],
        validationStatus: {
          validated: false,
          validator: 'manual',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'medium',
        },
      };

      return traversal.storeRelationship(relationship);
    },

    /**
     * Delete relationship
     */
    osintDeleteRelationship: async (_parent: unknown, args: { id: string }) => {
      return true;
    },

    /**
     * Enrich entity with additional sources
     */
    osintEnrichEntity: async (
      _parent: unknown,
      args: {
        entityId: string;
        sources?: string[];
      },
    ) => {
      const agent = await getAgent();
      const traversal = getGraphTraversal();

      const entities = await traversal.fetchEntitiesByIds([args.entityId]);
      const entity = entities[0];

      if (!entity) {
        throw new Error(`Entity not found: ${args.entityId}`);
      }

      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {
          sources: args.sources?.map(mapSourceType),
        },
        keywords: [entity.label, ...entity.aliases],
        entityTypes: [entity.type],
        maxResults: 1,
      };

      const result = await agent.fuse(query);

      // Merge enrichment data
      if (result.entities.length > 0) {
        const enriched = result.entities[0];
        entity.sources = [...entity.sources, ...enriched.sources];
        entity.confidence = Math.max(entity.confidence, enriched.confidence);
        entity.updatedAt = new Date();

        return traversal.storeEntity(entity);
      }

      return entity;
    },

    /**
     * Re-validate entity
     */
    osintRevalidateEntity: async (_parent: unknown, args: { entityId: string }) => {
      const traversal = getGraphTraversal();
      const guard = getHallucinationGuard();

      const entities = await traversal.fetchEntitiesByIds([args.entityId]);
      const entity = entities[0];

      if (!entity) {
        throw new Error(`Entity not found: ${args.entityId}`);
      }

      // Clear cache and revalidate
      guard.clearCache();
      const result = await guard.validateEntity(entity);

      // Update entity with new validation status
      entity.validationStatus = guard.createValidationStatus(result);
      entity.updatedAt = new Date();

      await traversal.storeEntity(entity);

      return result;
    },

    /**
     * Batch fusion
     */
    osintBatchFuse: async (
      _parent: unknown,
      args: {
        queries: Array<{
          keywords: string[];
          entityTypes?: string[];
          sources?: string[];
        }>;
        options?: {
          enableHallucinationGuard?: boolean;
          minCorroboratingSourceCount?: number;
          confidenceThreshold?: number;
          maxTraversalDepth?: number;
          enableSemanticMatching?: boolean;
          enableTemporalAnalysis?: boolean;
          airgapMode?: boolean;
          maxLatencyMs?: number;
        };
      },
    ) => {
      const agent = await getAgent();

      const options: FusionOptions = {
        enableHallucinationGuard: args.options?.enableHallucinationGuard ?? true,
        minCorroboratingSourceCount: args.options?.minCorroboratingSourceCount ?? 2,
        confidenceThreshold: args.options?.confidenceThreshold ?? 0.7,
        maxTraversalDepth: args.options?.maxTraversalDepth ?? 3,
        enableSemanticMatching: args.options?.enableSemanticMatching ?? true,
        enableTemporalAnalysis: args.options?.enableTemporalAnalysis ?? true,
        airgapMode: args.options?.airgapMode ?? false,
        maxLatencyMs: args.options?.maxLatencyMs ?? 2000,
      };

      const results = await Promise.all(
        args.queries.map((q) => {
          const query: OsintFusionQuery = {
            type: 'osint_fusion',
            parameters: {
              sources: q.sources?.map(mapSourceType),
            },
            keywords: q.keywords,
            entityTypes: q.entityTypes?.map(mapEntityType),
          };
          return agent.fuse(query, options);
        }),
      );

      return results;
    },

    /**
     * Batch validate entities
     */
    osintBatchValidate: async (
      _parent: unknown,
      args: { entityIds: string[] },
    ) => {
      const traversal = getGraphTraversal();
      const guard = getHallucinationGuard();

      const entities = await traversal.fetchEntitiesByIds(args.entityIds);
      const results = await guard.batchValidate(entities);

      return Array.from(results.values());
    },
  },

  // Field resolvers for nested types
  OsintEntity: {
    relationships: async (
      parent: OsintEntity,
      args: {
        types?: string[];
        direction?: string;
        limit?: number;
      },
    ) => {
      const traversal = getGraphTraversal();

      const config: GraphTraversalConfig = {
        startNodeIds: [parent.id],
        relationshipTypes: args.types?.map(mapRelationshipType),
        direction: (args.direction?.toLowerCase() || 'both') as 'outgoing' | 'incoming' | 'both',
        maxDepth: 1,
        limit: args.limit || 50,
      };

      const result = await traversal.traverse(config);
      return result.edges;
    },

    neighborhood: async (
      parent: OsintEntity,
      args: {
        depth?: number;
        minConfidence?: number;
      },
    ) => {
      const traversal = getGraphTraversal();

      const result = await traversal.findNeighborhood(
        parent.id,
        args.depth || 2,
        { minConfidence: args.minConfidence },
      );

      return {
        nodes: result.nodes,
        edges: result.edges,
        depth: args.depth || 2,
        metrics: result.metrics,
      };
    },
  },

  OsintRelationship: {
    sourceEntity: async (parent: OsintRelationship) => {
      const traversal = getGraphTraversal();
      const entities = await traversal.fetchEntitiesByIds([parent.sourceEntityId]);
      return entities[0];
    },

    targetEntity: async (parent: OsintRelationship) => {
      const traversal = getGraphTraversal();
      const entities = await traversal.fetchEntitiesByIds([parent.targetEntityId]);
      return entities[0];
    },
  },
};

export default osintFusionResolvers;
