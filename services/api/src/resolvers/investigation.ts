import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../graphql/context.js';
import { enforceAuthorization } from './authorization.js';
import { normalizeConnectionArgs, decodeCursor, encodeCursor } from './pagination.js';
import { withResolverSpan } from './telemetry.js';
import { toResolverError, type ResolverErrorShape } from './errors.js';

const INVESTIGATION_COLUMNS = `
  id,
  tenant_id,
  name,
  description,
  status,
  priority,
  owner_id,
  due_date,
  created_at,
  updated_at
`;

interface InvestigationRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  owner_id: string;
  due_date: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TimelineRow {
  id: string;
  investigation_id: string;
  tenant_id: string;
  actor_id: string;
  category: string;
  message: string;
  occurred_at: Date | string;
  created_at: Date | string;
}

function mapInvestigation(row: InvestigationRow) {
  return {
    __typename: 'Investigation' as const,
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    status: row.status,
    priority: row.priority,
    ownerId: row.owner_id,
    dueDate: row.due_date instanceof Date ? row.due_date.toISOString() : row.due_date,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

function mapTimelineEvent(row: TimelineRow) {
  return {
    __typename: 'TimelineEvent' as const,
    id: row.id,
    investigationId: row.investigation_id,
    tenantId: row.tenant_id,
    actorId: row.actor_id,
    category: row.category,
    message: row.message,
    occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
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

export const investigationResolvers = {
  Query: {
    investigation: async (
      _: unknown,
      args: { id: string; tenantId?: string },
      context: GraphQLContext,
    ): Promise<ReturnType<typeof mapInvestigation> | ResolverErrorShape> => {
      const tenantId = resolveTenantId(args.tenantId, context);

      return withResolverSpan(
        'Query.investigation',
        context,
        { operation: 'investigation', investigationId: args.id, tenantId },
        async () => {
          try {
            await enforceAuthorization(context, {
              action: 'investigation:read',
              resource: { type: 'investigation', id: args.id, tenantId },
            });
          } catch (error) {
            return toResolverError(error, 'AUTHZ_DENIED', { id: args.id });
          }

          try {
            const result = await context.dataSources.postgres.query<InvestigationRow>(
              `SELECT ${INVESTIGATION_COLUMNS} FROM investigations WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
              [args.id, tenantId],
            );

            if (!result.rows.length) {
              return {
                __typename: 'ResolverError' as const,
                message: 'Investigation not found',
                code: 'INVESTIGATION_NOT_FOUND',
                retriable: false,
                details: { id: args.id },
              };
            }

            return mapInvestigation(result.rows[0]);
          } catch (error) {
            return toResolverError(error, 'INTERNAL_SERVER_ERROR', { id: args.id });
          }
        },
      );
    },

    investigations: async (
      _: unknown,
      args: { filter?: Record<string, any>; pagination?: { first?: number; after?: string } },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.filter?.tenantId, context);
      const { limit, after } = normalizeConnectionArgs(args.pagination);

      return withResolverSpan(
        'Query.investigations',
        context,
        { operation: 'investigations', tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'investigation:read',
            resource: { type: 'investigation_collection', tenantId },
          });

          const predicates: string[] = ['tenant_id = $1'];
          const params: any[] = [tenantId];
          let index = 2;

          if (args.filter?.status?.length) {
            predicates.push(`status = ANY($${index})`);
            params.push(args.filter.status);
            index += 1;
          }

          if (args.filter?.ownerIds?.length) {
            predicates.push(`owner_id = ANY($${index})`);
            params.push(args.filter.ownerIds);
            index += 1;
          }

          if (args.filter?.search) {
            predicates.push(`(name ILIKE $${index} OR description ILIKE $${index})`);
            params.push(`%${args.filter.search}%`);
            index += 1;
          }

          if (args.filter?.updatedAfter) {
            predicates.push(`updated_at > $${index}`);
            params.push(args.filter.updatedAfter);
            index += 1;
          }

          let cursorPredicate = '';
          const queryParams = [...params];

          if (after) {
            const decoded = decodeCursor(after);
            if (decoded) {
              const [updatedCursor, idCursor] = decoded.split('::');
              cursorPredicate = ` AND (updated_at < $${index} OR (updated_at = $${index} AND id < $${index + 1}))`;
              queryParams.push(updatedCursor, idCursor);
              index += 2;
            }
          }

          const listQuery = `
            SELECT ${INVESTIGATION_COLUMNS}
            FROM investigations
            WHERE ${predicates.join(' AND ')}${cursorPredicate}
            ORDER BY updated_at DESC, id DESC
            LIMIT $${index}
          `;

          const countQuery = `SELECT COUNT(*)::int AS count FROM investigations WHERE ${predicates.join(' AND ')}`;

          let listResult;
          let countResult;

          try {
            [listResult, countResult] = await Promise.all([
              context.dataSources.postgres.query<InvestigationRow>(listQuery, [...queryParams, limit + 1]),
              context.dataSources.postgres.query<{ count: number }>(countQuery, params),
            ]);
          } catch (error) {
            throw toGraphQLError('Failed to list investigations', 'INTERNAL_SERVER_ERROR', { tenantId }, error);
          }

          const rows = listResult.rows;
          const hasNextPage = rows.length > limit;
          const slice = hasNextPage ? rows.slice(0, limit) : rows;
          const edges = slice.map((row) => {
            const cursor = encodeCursor(`${
              row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
            }::${row.id}`);
            return { cursor, node: mapInvestigation(row) };
          });

          return {
            edges,
            nodes: slice.map(mapInvestigation),
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

    timelineEvents: async (
      _: unknown,
      args: { investigationId: string; tenantId?: string; pagination?: { first?: number; after?: string } },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.tenantId, context);
      const { limit, after } = normalizeConnectionArgs(args.pagination, 50);
      const decoded = decodeCursor(after);
      let occurredCursor: string | null = null;
      let idCursor: string | null = null;

      if (decoded) {
        const [occurred, id] = decoded.split('::');
        occurredCursor = occurred || null;
        idCursor = id || null;
      }

      return withResolverSpan(
        'Query.timelineEvents',
        context,
        { operation: 'timeline', investigationId: args.investigationId, tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'investigation:read',
            resource: { type: 'investigation', id: args.investigationId, tenantId },
          });

          const query = `
            SELECT id, investigation_id, tenant_id, actor_id, category, message, occurred_at, created_at
            FROM investigation_events
            WHERE investigation_id = $1 AND tenant_id = $2
              AND ($3::timestamptz IS NULL OR occurred_at < $3 OR (occurred_at = $3 AND id < $4))
            ORDER BY occurred_at DESC, id DESC
            LIMIT $5
          `;

          let timelineResult;
          try {
            timelineResult = await context.dataSources.postgres.query<TimelineRow>(query, [
              args.investigationId,
              tenantId,
              occurredCursor,
              idCursor,
              limit + 1,
            ]);
          } catch (error) {
            throw toGraphQLError('Failed to load timeline events', 'INTERNAL_SERVER_ERROR', {
              investigationId: args.investigationId,
            }, error);
          }

          const rows = timelineResult.rows;
          const hasNextPage = rows.length > limit;
          const slice = hasNextPage ? rows.slice(0, limit) : rows;
          const edges = slice.map((row) => {
            const cursor = encodeCursor(`${
              row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at
            }::${row.id}`);
            return { cursor, node: mapTimelineEvent(row) };
          });

          return {
            edges,
            nodes: slice.map(mapTimelineEvent),
            pageInfo: {
              hasNextPage,
              hasPreviousPage: Boolean(after),
              startCursor: edges.at(0)?.cursor ?? null,
              endCursor: edges.at(-1)?.cursor ?? null,
              totalCount: slice.length,
            },
          };
        },
      );
    },
  },

  Mutation: {
    upsertInvestigation: async (
      _: unknown,
      args: { id?: string | null; input: Record<string, any> },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.input?.tenantId, context);

      return withResolverSpan(
        'Mutation.upsertInvestigation',
        context,
        { operation: 'upsertInvestigation', investigationId: args.id ?? 'new', tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'investigation:write',
            resource: { type: 'investigation', id: args.id ?? undefined, tenantId },
          });

          const payload = {
            name: args.input.name,
            description: args.input.description,
            status: args.input.status,
            priority: args.input.priority,
            owner_id: args.input.ownerId,
            due_date: args.input.dueDate,
            tenant_id: tenantId,
          };

          try {
            if (args.id) {
              const updateResult = await context.dataSources.postgres.query<InvestigationRow>(
                `UPDATE investigations
                 SET name = $1, description = $2, status = $3, priority = $4, owner_id = $5, due_date = $6, updated_at = NOW()
                 WHERE id = $7 AND tenant_id = $8
                 RETURNING ${INVESTIGATION_COLUMNS}`,
                [
                  payload.name,
                  payload.description,
                  payload.status,
                  payload.priority,
                  payload.owner_id,
                  payload.due_date,
                  args.id,
                  tenantId,
                ],
              );

              if (!updateResult.rows.length) {
                return {
                  success: false,
                  investigation: null,
                  errors: [
                    {
                      __typename: 'ResolverError' as const,
                      message: 'Investigation not found',
                      code: 'INVESTIGATION_NOT_FOUND',
                      retriable: false,
                      details: { id: args.id },
                    },
                  ],
                };
              }

              return {
                success: true,
                investigation: mapInvestigation(updateResult.rows[0]),
                errors: [],
              };
            }

            const insertResult = await context.dataSources.postgres.query<InvestigationRow>(
              `INSERT INTO investigations (id, tenant_id, name, description, status, priority, owner_id, due_date)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
               RETURNING ${INVESTIGATION_COLUMNS}`,
              [
                tenantId,
                payload.name,
                payload.description,
                payload.status,
                payload.priority,
                payload.owner_id,
                payload.due_date,
              ],
            );

            return {
              success: true,
              investigation: mapInvestigation(insertResult.rows[0]),
              errors: [],
            };
          } catch (error) {
            return {
              success: false,
              investigation: null,
              errors: [toResolverError(error, 'INTERNAL_SERVER_ERROR', { tenantId })],
            };
          }
        },
      );
    },

    linkEntityToInvestigation: async (
      _: unknown,
      args: { investigationId: string; entityId: string; tenantId?: string },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.tenantId, context);

      return withResolverSpan(
        'Mutation.linkEntityToInvestigation',
        context,
        { operation: 'linkEntityToInvestigation', investigationId: args.investigationId, entityId: args.entityId, tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'investigation:write',
            resource: { type: 'investigation', id: args.investigationId, tenantId },
          });

          const insertQuery = `
            INSERT INTO investigation_entities (investigation_id, entity_id, tenant_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (investigation_id, entity_id, tenant_id) DO UPDATE SET updated_at = NOW()
          `;

          try {
            await context.dataSources.postgres.query(insertQuery, [
              args.investigationId,
              args.entityId,
              tenantId,
            ]);
          } catch (error) {
            return {
              success: false,
              investigation: null,
              errors: [toResolverError(error, 'INTERNAL_SERVER_ERROR', { tenantId, entityId: args.entityId })],
            };
          }

          const fetchInvestigation = await context.dataSources.postgres.query<InvestigationRow>(
            `SELECT ${INVESTIGATION_COLUMNS} FROM investigations WHERE id = $1 AND tenant_id = $2`,
            [args.investigationId, tenantId],
          );

          return {
            success: Boolean(fetchInvestigation.rows.length),
            investigation: fetchInvestigation.rows.length ? mapInvestigation(fetchInvestigation.rows[0]) : null,
            errors: fetchInvestigation.rows.length
              ? []
              : [
                  {
                    __typename: 'ResolverError' as const,
                    message: 'Investigation not found',
                    code: 'INVESTIGATION_NOT_FOUND',
                    retriable: false,
                    details: { id: args.investigationId },
                  },
                ],
          };
        },
      );
    },

    recordInvestigationEvent: async (
      _: unknown,
      args: { input: Record<string, any> },
      context: GraphQLContext,
    ) => {
      const tenantId = resolveTenantId(args.input?.tenantId, context);

      return withResolverSpan(
        'Mutation.recordInvestigationEvent',
        context,
        { operation: 'recordInvestigationEvent', investigationId: args.input.investigationId, tenantId },
        async () => {
          await enforceAuthorization(context, {
            action: 'investigation:write',
            resource: { type: 'investigation', id: args.input.investigationId, tenantId },
          });

          try {
            const insertResult = await context.dataSources.postgres.query<TimelineRow>(
              `INSERT INTO investigation_events (id, investigation_id, tenant_id, actor_id, category, message, occurred_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
               RETURNING id, investigation_id, tenant_id, actor_id, category, message, occurred_at, created_at`,
              [
                args.input.investigationId,
                tenantId,
                args.input.actorId,
                args.input.category,
                args.input.message,
                args.input.occurredAt,
              ],
            );

            return {
              success: true,
              event: mapTimelineEvent(insertResult.rows[0]),
              errors: [],
            };
          } catch (error) {
            return {
              success: false,
              event: null,
              errors: [toResolverError(error, 'INTERNAL_SERVER_ERROR', { tenantId })],
            };
          }
        },
      );
    },
  },

  Investigation: {
    timeline: async (
      parent: { id: string; tenantId: string },
      args: { pagination?: { first?: number; after?: string } },
      context: GraphQLContext,
    ) => {
      return investigationResolvers.Query.timelineEvents(
        {},
        { investigationId: parent.id, tenantId: parent.tenantId, pagination: args.pagination },
        context,
      );
    },
  },
};
