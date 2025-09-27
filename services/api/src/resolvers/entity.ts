import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../graphql/context.js';
import { enforceAuthorization } from './authorization.js';
import { normalizeConnectionArgs, decodeCursor, encodeCursor } from './pagination.js';
import { withResolverSpan } from './telemetry.js';
import { toResolverError, type ResolverErrorShape } from './errors.js';

const ENTITY_COLUMNS = `
  id,
  tenant_id,
  kind,
  display_name,
  summary,
  risk_score,
  properties,
  created_at,
  updated_at
`;

interface EntityRow {
  id: string;
  tenant_id: string;
  kind: string;
  display_name: string;
  summary: string | null;
  risk_score: number | null;
  properties: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapEntity(row: EntityRow) {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
  const updatedAt = row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at;

  return {
    __typename: 'Entity' as const,
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind,
    displayName: row.display_name,
    summary: row.summary,
    riskScore: row.risk_score,
    properties: row.properties,
    createdAt,
    updatedAt,
  };
}

function buildEntityFilter(
  tenantId: string,
  filter: Record<string, any> | undefined,
): { whereClause: string; parameters: any[] } {
  const predicates: string[] = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let index = 2;

  if (filter?.kinds?.length) {
    predicates.push(`kind = ANY($${index})`);
    params.push(filter.kinds);
    index += 1;
  }

  if (filter?.search) {
    predicates.push(`(display_name ILIKE $${index} OR summary ILIKE $${index})`);
    params.push(`%${filter.search}%`);
    index += 1;
  }

  if (typeof filter?.riskGte === 'number') {
    predicates.push(`risk_score >= $${index}`);
    params.push(filter.riskGte);
    index += 1;
  }

  if (typeof filter?.riskLte === 'number') {
    predicates.push(`risk_score <= $${index}`);
    params.push(filter.riskLte);
    index += 1;
  }

  if (filter?.updatedAfter) {
    predicates.push(`updated_at > $${index}`);
    params.push(filter.updatedAfter);
    index += 1;
  }

  return {
    whereClause: predicates.join(' AND '),
    parameters: params,
  };
}

function ensureTenantId(args: { tenantId?: string }, context: GraphQLContext): string {
  if (args.tenantId) {
    return args.tenantId;
  }
  if (context.tenant?.id) {
    return context.tenant.id;
  }
  if (context.user?.tenantId) {
    return context.user.tenantId;
  }
  throw new Error('Tenant scope is required');
}

function toGraphQLError(
  message: string,
  code: string,
  details: Record<string, unknown>,
  cause?: unknown,
): GraphQLError {
  const extensions: Record<string, unknown> = {
    code,
    details,
  };

  if (cause instanceof Error) {
    extensions.reason = cause.message;
  }

  return new GraphQLError(message, { extensions });
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
    try {
      return (value as any).toNumber();
    } catch {
      return null;
    }
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export const entityResolvers = {
  Query: {
    entity: async (
      _: unknown,
      args: { id: string; tenantId?: string },
      context: GraphQLContext,
    ): Promise<ReturnType<typeof mapEntity> | ResolverErrorShape> => {
      const tenantId = ensureTenantId(args, context);

      return withResolverSpan(
        'Query.entity',
        context,
        { operation: 'entity', entityId: args.id, tenantId },
        async () => {
          try {
            await enforceAuthorization(context, {
              action: 'entity:read',
              resource: { type: 'entity', id: args.id, tenantId },
            });
          } catch (error) {
            return toResolverError(error, 'AUTHZ_DENIED', { id: args.id });
          }

          try {
            const result = await context.dataSources.postgres.query<EntityRow>(
              `SELECT ${ENTITY_COLUMNS} FROM entities WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
              [args.id, tenantId],
            );

            if (!result.rows.length) {
              return {
                __typename: 'ResolverError' as const,
                message: 'Entity not found',
                code: 'ENTITY_NOT_FOUND',
                retriable: false,
                details: { id: args.id },
              };
            }

            return mapEntity(result.rows[0]);
          } catch (error) {
            return toResolverError(error, 'INTERNAL_SERVER_ERROR', { id: args.id });
          }
        },
      );
    },

    entities: async (
      _: unknown,
      args: { filter?: Record<string, any>; pagination?: { first?: number; after?: string } },
      context: GraphQLContext,
    ) => {
      const tenantId = ensureTenantId(args.filter ?? {}, context);
      const { limit, after } = normalizeConnectionArgs(args.pagination);

      return withResolverSpan(
        'Query.entities',
        context,
        { operation: 'entities', tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'entity:read',
            resource: { type: 'entity_collection', tenantId },
          });

          const { whereClause, parameters } = buildEntityFilter(tenantId, args.filter);
          let cursorPredicate = '';
          const queryParams = [...parameters];
          let index = parameters.length + 1;

          if (after) {
            const cursorValue = decodeCursor(after);
            if (cursorValue) {
              const [updatedAtCursor, idCursor] = cursorValue.split('::');
              cursorPredicate = ` AND (updated_at < $${index} OR (updated_at = $${index} AND id < $${index + 1}))`;
              queryParams.push(updatedAtCursor, idCursor);
              index += 2;
            }
          }

          const listQuery = `
            SELECT ${ENTITY_COLUMNS}
            FROM entities
            WHERE ${whereClause}${cursorPredicate}
            ORDER BY updated_at DESC, id DESC
            LIMIT $${index}
          `;

          const countQuery = `SELECT COUNT(*)::int AS count FROM entities WHERE ${whereClause}`;

          let entitiesResult;
          let countResult;

          try {
            [entitiesResult, countResult] = await Promise.all([
              context.dataSources.postgres.query<EntityRow>(listQuery, [...queryParams, limit + 1]),
              context.dataSources.postgres.query<{ count: number }>(countQuery, parameters),
            ]);
          } catch (error) {
            throw toGraphQLError('Failed to list entities', 'INTERNAL_SERVER_ERROR', {
              tenantId,
            }, error);
          }

          const rows = entitiesResult.rows;
          const hasNextPage = rows.length > limit;
          const slice = hasNextPage ? rows.slice(0, limit) : rows;
          const edges = slice.map((row) => {
            const cursor = encodeCursor(`${
              row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
            }::${row.id}`);
            return {
              cursor,
              node: mapEntity(row),
            };
          });

          return {
            edges,
            nodes: slice.map(mapEntity),
            pageInfo: {
              hasNextPage,
              hasPreviousPage: Boolean(after),
              startCursor: edges.at(0)?.cursor ?? null,
              endCursor: edges.at(-1)?.cursor ?? null,
              totalCount: countResult.rows[0]?.count ?? slice.length,
            },
          };
        },
      );
    },

    entityMetrics: async (
      _: unknown,
      args: { id: string; tenantId?: string },
      context: GraphQLContext,
    ): Promise<
      | {
          __typename: 'EntityMetrics';
          entityId: string;
          degree: number | null;
          betweenness: number | null;
          closeness: number | null;
          alertsOpen: number | null;
          lastInvestigationId: string | null;
        }
      | ResolverErrorShape
    > => {
      const tenantId = ensureTenantId({ tenantId: args.tenantId }, context);

      return withResolverSpan(
        'Query.entityMetrics',
        context,
        { operation: 'entityMetrics', entityId: args.id, tenantId },
        async () => {
          try {
            await enforceAuthorization(context, {
              action: 'entity:read',
              resource: { type: 'entity', id: args.id, tenantId },
            });
          } catch (error) {
            return toResolverError(error, 'AUTHZ_DENIED', { id: args.id });
          }

          const metricsQuery = `
            MATCH (entity:Entity {id: $entityId, tenantId: $tenantId})
            OPTIONAL MATCH (entity)-[rel:RELATES_TO]-()
            RETURN count(rel) AS degree,
                   coalesce(entity.betweenness, 0.0) AS betweenness,
                   coalesce(entity.closeness, 0.0) AS closeness
          `;

          let metricsResult: any[];

          try {
            metricsResult = await context.dataSources.neo4j.executeQuery(metricsQuery, {
              entityId: args.id,
              tenantId,
            });
          } catch (error) {
            return toResolverError(error, 'INTERNAL_SERVER_ERROR', { id: args.id });
          }

          const degreeValue = metricsResult[0]?.degree ?? 0;
          const betweenness = metricsResult[0]?.betweenness ?? 0;
          const closeness = metricsResult[0]?.closeness ?? 0;

          let alertsResult;
          let investigationResult;

          try {
            [alertsResult, investigationResult] = await Promise.all([
              context.dataSources.postgres.query<{ open_alerts: number }>(
                `SELECT COUNT(*)::int AS open_alerts FROM alerts WHERE entity_id = $1 AND tenant_id = $2 AND status = 'OPEN'`,
                [args.id, tenantId],
              ),
              context.dataSources.postgres.query<{ investigation_id: string }>(
                `SELECT investigation_id FROM investigation_entities WHERE entity_id = $1 AND tenant_id = $2 ORDER BY updated_at DESC LIMIT 1`,
                [args.id, tenantId],
              ),
            ]);
          } catch (error) {
            return toResolverError(error, 'INTERNAL_SERVER_ERROR', { id: args.id });
          }

          const alertsOpenRaw = alertsResult.rows[0]?.open_alerts ?? 0;
          const lastInvestigationId = investigationResult.rows[0]?.investigation_id ?? null;

          return {
            __typename: 'EntityMetrics' as const,
            entityId: args.id,
            degree: asNumber(degreeValue),
            betweenness: asNumber(betweenness),
            closeness: asNumber(closeness),
            alertsOpen: asNumber(alertsOpenRaw),
            lastInvestigationId,
          };
        },
      );
    },
  },

  Entity: {
    relationships: async (
      parent: { id: string; tenantId: string },
      args: { pagination?: { first?: number; after?: string } },
      context: GraphQLContext,
    ) => {
      const { limit, after } = normalizeConnectionArgs(args.pagination);
      const cursorValue = decodeCursor(after ?? undefined);
      let updatedAtCursor: string | null = null;
      let idCursor: string | null = null;

      if (cursorValue) {
        const [updated, id] = cursorValue.split('::');
        updatedAtCursor = updated || null;
        idCursor = id || null;
      }

      return withResolverSpan(
        'Entity.relationships',
        context,
        { operation: 'relationships', entityId: parent.id, tenantId: parent.tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'relationship:read',
            resource: { type: 'entity', id: parent.id, tenantId: parent.tenantId },
          });

          const query = `
            MATCH (source:Entity {id: $entityId, tenantId: $tenantId})-[rel:RELATES_TO]->(target:Entity {tenantId: $tenantId})
            WHERE ($afterUpdatedAt IS NULL OR rel.updatedAt < $afterUpdatedAt OR (rel.updatedAt = $afterUpdatedAt AND rel.id < $afterId))
            RETURN rel AS relationship, source AS sourceNode, target AS targetNode
            ORDER BY rel.updatedAt DESC, rel.id DESC
            LIMIT $limit
          `;

          let result: any[];

          try {
            result = await context.dataSources.neo4j.executeQuery<any>(query, {
              entityId: parent.id,
              tenantId: parent.tenantId,
              afterUpdatedAt: updatedAtCursor,
              afterId: idCursor,
              limit: limit + 1,
            });
          } catch (error) {
            throw toGraphQLError('Failed to load relationships', 'INTERNAL_SERVER_ERROR', {
              entityId: parent.id,
            }, error);
          }

          const hasNextPage = result.length > limit;
          const slice = hasNextPage ? result.slice(0, limit) : result;
          const edges = slice.map((record: any) => {
            const relationship = record.relationship?.properties || record.relationship || {};
            const sourceNode = record.sourceNode?.properties || record.sourceNode || {};
            const targetNode = record.targetNode?.properties || record.targetNode || {};

            const createdAt = relationship.createdAt || relationship.created_at || new Date().toISOString();
            const updatedAt = relationship.updatedAt || relationship.updated_at || createdAt;
            const cursor = encodeCursor(`${updatedAt}::${relationship.id}`);

            return {
              cursor,
              node: {
                __typename: 'Relationship' as const,
                id: relationship.id,
                tenantId: relationship.tenantId || parent.tenantId,
                kind: relationship.kind || relationship.type || 'CUSTOM',
                sourceId: relationship.sourceId || sourceNode.id || parent.id,
                targetId: relationship.targetId || targetNode.id,
                confidence: relationship.confidence ?? null,
                properties: relationship.properties || {},
                createdAt,
                updatedAt,
              },
            };
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
    createEntity: async (
      _: unknown,
      args: { input: { tenantId: string; kind: string; displayName: string; summary?: string | null; properties?: Record<string, unknown> | null; riskScore?: number | null } },
      context: GraphQLContext,
    ) => {
      const tenantId = ensureTenantId({ tenantId: args.input.tenantId }, context);

      return withResolverSpan(
        'Mutation.createEntity',
        context,
        { operation: 'createEntity', tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'entity:write',
            resource: { type: 'entity', tenantId },
          });

          try {
            const insertResult = await context.dataSources.postgres.query<EntityRow>(
              `INSERT INTO entities (id, tenant_id, kind, display_name, summary, risk_score, properties)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
               RETURNING ${ENTITY_COLUMNS}`,
              [
                tenantId,
                args.input.kind,
                args.input.displayName,
                args.input.summary ?? null,
                args.input.riskScore ?? null,
                args.input.properties ?? {},
              ],
            );

            return {
              success: true,
              entity: mapEntity(insertResult.rows[0]),
              errors: [],
            };
          } catch (error) {
            return {
              success: false,
              entity: null,
              errors: [toResolverError(error, 'INTERNAL_SERVER_ERROR', { tenantId })],
            };
          }
        },
      );
    },

    updateEntity: async (
      _: unknown,
      args: { id: string; tenantId: string; input: { displayName?: string | null; summary?: string | null; properties?: Record<string, unknown> | null; riskScore?: number | null } },
      context: GraphQLContext,
    ) => {
      const tenantId = ensureTenantId({ tenantId: args.tenantId }, context);

      return withResolverSpan(
        'Mutation.updateEntity',
        context,
        { operation: 'updateEntity', entityId: args.id, tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'entity:write',
            resource: { type: 'entity', id: args.id, tenantId },
          });

          try {
            const updateResult = await context.dataSources.postgres.query<EntityRow>(
              `UPDATE entities
                 SET display_name = COALESCE($1, display_name),
                     summary = COALESCE($2, summary),
                     risk_score = COALESCE($3, risk_score),
                     properties = COALESCE($4, properties),
                     updated_at = NOW()
               WHERE id = $5 AND tenant_id = $6
               RETURNING ${ENTITY_COLUMNS}`,
              [
                args.input.displayName ?? null,
                args.input.summary ?? null,
                args.input.riskScore ?? null,
                args.input.properties ?? null,
                args.id,
                tenantId,
              ],
            );

            if (!updateResult.rows.length) {
              return {
                success: false,
                entity: null,
                errors: [
                  {
                    __typename: 'ResolverError' as const,
                    message: 'Entity not found',
                    code: 'ENTITY_NOT_FOUND',
                    retriable: false,
                    details: { id: args.id },
                  },
                ],
              };
            }

            return {
              success: true,
              entity: mapEntity(updateResult.rows[0]),
              errors: [],
            };
          } catch (error) {
            return {
              success: false,
              entity: null,
              errors: [toResolverError(error, 'INTERNAL_SERVER_ERROR', { tenantId, id: args.id })],
            };
          }
        },
      );
    },
  },
};
