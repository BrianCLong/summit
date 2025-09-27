import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../graphql/context.js';
import { enforceAuthorization } from './authorization.js';
import { normalizeConnectionArgs, decodeCursor, encodeCursor } from './pagination.js';
import { withResolverSpan } from './telemetry.js';
import { toResolverError } from './errors.js';

interface RelationshipRecord {
  relationship: any;
  sourceNode: any;
  targetNode: any;
}

function resolveTenantId(
  tenantId: string | undefined,
  context: GraphQLContext,
): string {
  if (tenantId) {
    return tenantId;
  }
  if (context.tenant?.id) {
    return context.tenant.id;
  }
  if (context.user?.tenantId) {
    return context.user.tenantId;
  }
  throw new GraphQLError('Tenant scope missing', { extensions: { code: 'VALIDATION_FAILED' } });
}

function mapRelationship(record: RelationshipRecord, fallbackTenantId: string) {
  const relationship = record.relationship?.properties || record.relationship || {};
  const source = record.sourceNode?.properties || record.sourceNode || {};
  const target = record.targetNode?.properties || record.targetNode || {};

  const createdAt = relationship.createdAt || relationship.created_at || new Date().toISOString();
  const updatedAt = relationship.updatedAt || relationship.updated_at || createdAt;

  return {
    __typename: 'Relationship' as const,
    id: relationship.id,
    tenantId: relationship.tenantId || fallbackTenantId,
    kind: relationship.kind || relationship.type || 'CUSTOM',
    sourceId: relationship.sourceId || source.id,
    targetId: relationship.targetId || target.id,
    confidence: relationship.confidence ?? null,
    properties: relationship.properties || {},
    createdAt,
    updatedAt,
  };
}

function toGraphQLError(
  message: string,
  code: string,
  details: Record<string, unknown>,
  cause?: unknown,
): GraphQLError {
  const extensions: Record<string, unknown> = { code, details };
  if (cause instanceof Error) {
    extensions.reason = cause.message;
  }
  return new GraphQLError(message, { extensions });
}

export const relationshipResolvers = {
  Query: {
    relationships: async (
      _: unknown,
      args: { filter: { tenantId: string; sourceId?: string; targetId?: string; kinds?: string[] }; pagination?: { first?: number; after?: string } },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.filter?.tenantId, context);
      const { limit, after } = normalizeConnectionArgs(args.pagination);
      const decoded = decodeCursor(after);
      let updatedCursor: string | null = null;
      let idCursor: string | null = null;

      if (decoded) {
        const [updated, id] = decoded.split('::');
        updatedCursor = updated || null;
        idCursor = id || null;
      }

      return withResolverSpan(
        'Query.relationships',
        context,
        { operation: 'relationships', tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'relationship:read',
            resource: { type: 'relationship_collection', tenantId },
          });

          const query = `
            MATCH (source:Entity {tenantId: $tenantId})-[rel:RELATES_TO]->(target:Entity {tenantId: $tenantId})
            WHERE ($sourceId IS NULL OR source.id = $sourceId)
              AND ($targetId IS NULL OR target.id = $targetId)
              AND ($kinds IS NULL OR rel.kind IN $kinds)
              AND ($afterUpdatedAt IS NULL OR rel.updatedAt < $afterUpdatedAt OR (rel.updatedAt = $afterUpdatedAt AND rel.id < $afterId))
            RETURN rel AS relationship, source AS sourceNode, target AS targetNode
            ORDER BY rel.updatedAt DESC, rel.id DESC
            LIMIT $limit
          `;

          let result: RelationshipRecord[];
          try {
            result = await context.dataSources.neo4j.executeQuery<RelationshipRecord>(query, {
              tenantId,
              sourceId: args.filter?.sourceId ?? null,
              targetId: args.filter?.targetId ?? null,
              kinds: args.filter?.kinds?.length ? args.filter?.kinds : null,
              afterUpdatedAt: updatedCursor,
              afterId: idCursor,
              limit: limit + 1,
            });
          } catch (error) {
            throw toGraphQLError('Failed to list relationships', 'INTERNAL_SERVER_ERROR', { tenantId }, error);
          }

          const hasNextPage = result.length > limit;
          const slice = hasNextPage ? result.slice(0, limit) : result;
          const edges = slice.map((record) => {
            const mapped = mapRelationship(record, tenantId);
            const cursor = encodeCursor(`${mapped.updatedAt}::${mapped.id}`);
            return { cursor, node: mapped };
          });

          return {
            edges,
            nodes: edges.map((edge) => edge.node),
            pageInfo: {
              hasNextPage,
              hasPreviousPage: Boolean(after),
              startCursor: edges.at(0)?.cursor ?? null,
              endCursor: edges.at(-1)?.cursor ?? null,
              totalCount: edges.length,
            },
          };
        },
      );
    },
  },

  Mutation: {
    createRelationship: async (
      _: unknown,
      args: { input: { tenantId: string; sourceId: string; targetId: string; kind: string; properties?: Record<string, unknown>; confidence?: number | null } },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.input?.tenantId, context);

      return withResolverSpan(
        'Mutation.createRelationship',
        context,
        { operation: 'createRelationship', tenantId, entityId: args.input.sourceId },
        async () => {
          await enforceAuthorization(context, {
            action: 'relationship:write',
            resource: { type: 'entity', id: args.input.sourceId, tenantId },
          });

          const query = `
            MATCH (source:Entity {id: $sourceId, tenantId: $tenantId})
            MATCH (target:Entity {id: $targetId, tenantId: $tenantId})
            MERGE (source)-[rel:RELATES_TO {id: coalesce($relationshipId, randomUUID()), tenantId: $tenantId}]->(target)
            ON CREATE SET rel.createdAt = datetime()
            SET rel.kind = $kind,
                rel.sourceId = source.id,
                rel.targetId = target.id,
                rel.properties = $properties,
                rel.confidence = $confidence,
                rel.updatedAt = datetime()
            RETURN rel AS relationship, source AS sourceNode, target AS targetNode
          `;

          try {
            const result = await context.dataSources.neo4j.executeQuery<RelationshipRecord>(query, {
              tenantId,
              sourceId: args.input.sourceId,
              targetId: args.input.targetId,
              kind: args.input.kind,
              properties: args.input.properties ?? {},
              confidence: args.input.confidence ?? null,
              relationshipId: null,
            });

            const record = result.at(0);
            if (!record) {
              return {
                success: false,
                relationship: null,
                errors: [
                  {
                    __typename: 'ResolverError' as const,
                    message: 'Relationship could not be created',
                    code: 'INTERNAL_SERVER_ERROR',
                    retriable: true,
                    details: { tenantId },
                  },
                ],
              };
            }

            return {
              success: true,
              relationship: mapRelationship(record, tenantId),
              errors: [],
            };
          } catch (error) {
            return {
              success: false,
              relationship: null,
              errors: [toResolverError(error, 'INTERNAL_SERVER_ERROR', { tenantId })],
            };
          }
        },
      );
    },

    updateRelationship: async (
      _: unknown,
      args: { id: string; tenantId: string; input: { properties?: Record<string, unknown>; confidence?: number | null } },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.tenantId, context);

      return withResolverSpan(
        'Mutation.updateRelationship',
        context,
        { operation: 'updateRelationship', tenantId, entityId: args.id },
        async () => {
          await enforceAuthorization(context, {
            action: 'relationship:write',
            resource: { type: 'relationship', id: args.id, tenantId },
          });

          const query = `
            MATCH (source:Entity {tenantId: $tenantId})-[rel:RELATES_TO {id: $relationshipId, tenantId: $tenantId}]->(target:Entity {tenantId: $tenantId})
            SET rel.properties = coalesce($properties, rel.properties),
                rel.confidence = coalesce($confidence, rel.confidence),
                rel.updatedAt = datetime()
            RETURN rel AS relationship, source AS sourceNode, target AS targetNode
          `;

          try {
            const result = await context.dataSources.neo4j.executeQuery<RelationshipRecord>(query, {
              tenantId,
              relationshipId: args.id,
              properties: args.input.properties ?? null,
              confidence: args.input.confidence ?? null,
            });

            const record = result.at(0);
            if (!record) {
              return {
                success: false,
                relationship: null,
                errors: [
                  {
                    __typename: 'ResolverError' as const,
                    message: 'Relationship not found',
                    code: 'RELATIONSHIP_NOT_FOUND',
                    retriable: false,
                    details: { id: args.id },
                  },
                ],
              };
            }

            return {
              success: true,
              relationship: mapRelationship(record, tenantId),
              errors: [],
            };
          } catch (error) {
            return {
              success: false,
              relationship: null,
              errors: [toResolverError(error, 'INTERNAL_SERVER_ERROR', { tenantId, id: args.id })],
            };
          }
        },
      );
    },
  },
};
