import { trace, Span } from '@opentelemetry/api';
import type { GraphQLResolveInfo } from 'graphql';
import { getPostgresPool } from '../../db/postgres.js';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { EntityRepo, type Entity } from '../../repos/EntityRepo.js';
import { RelationshipRepo, type Relationship } from '../../repos/RelationshipRepo.js';
import { InvestigationRepo, type Investigation } from '../../repos/InvestigationRepo.js';
import {
  withAuthAndPolicy,
  entityResource,
  investigationResource,
} from '../../middleware/withAuthAndPolicy.js';

const tracer = trace.getTracer('public-graphql-contracts');

const pg = getPostgresPool();
const neo4j = getNeo4jDriver();
const entityRepo = new EntityRepo(pg, neo4j);
const relationshipRepo = new RelationshipRepo(pg, neo4j);
const investigationRepo = new InvestigationRepo(pg);

const READ_SLO = 350;
const WRITE_SLO = 700;
const SUBSCRIPTION_SLO = 250;

interface ContractsUser {
  id: string;
  tenantId?: string;
  orgId?: string;
  teamId?: string;
  roles?: string[];
}

interface PolicyEvaluator {
  evaluate?: (policy: string, input: any) => Promise<any>;
}

export interface ContractsContext {
  user?: ContractsUser;
  req?: { headers?: Record<string, string>; ip?: string };
  opa?: PolicyEvaluator;
  neo4j?: ReturnType<typeof getNeo4jDriver>;
  postgres?: ReturnType<typeof getPostgresPool>;
}

type ResolverDiagnostics = {
  fromCache: boolean;
  lastEvaluatedAt: string;
  durationMs: number;
  attempts: number;
  estimatedCostMs: number;
  sloTargetMs: number;
};

type PolicyDecision = {
  allow: boolean;
  reason?: string;
  obligations: string[];
};

type PublicError = {
  code: string;
  message: string;
  field?: string;
  retryable: boolean;
  context?: Record<string, unknown>;
};

type PublicEntityResult = {
  entity: ReturnType<typeof toPublicEntity> | null;
  policy: PolicyDecision;
  diagnostics: ResolverDiagnostics;
  errors: PublicError[];
};

type PublicMutationResult = {
  ok: boolean;
  policy: PolicyDecision;
  diagnostics: ResolverDiagnostics;
  errors: PublicError[];
};

function diagnostics(start: number, estimatedMs: number, slo: number): ResolverDiagnostics {
  return {
    fromCache: false,
    lastEvaluatedAt: new Date().toISOString(),
    durationMs: Math.max(1, Date.now() - start),
    attempts: 1,
    estimatedCostMs: estimatedMs,
    sloTargetMs: slo,
  };
}

async function evaluatePolicy(
  context: ContractsContext,
  span: Span,
  action: string,
  resource: Record<string, unknown>,
): Promise<PolicyDecision> {
  const decision: PolicyDecision = {
    allow: true,
    obligations: [],
  };

  if (!context.user) {
    decision.allow = false;
    decision.reason = 'unauthenticated';
    return decision;
  }

  try {
    const input = {
      action,
      resource,
      user: context.user,
    };

    if (context.opa?.evaluate) {
      const opaResult = await context.opa.evaluate('contracts/allow', input);
      if (typeof opaResult === 'boolean') {
        decision.allow = opaResult;
      } else if (opaResult) {
        decision.allow = Boolean(opaResult.allow ?? opaResult.result?.allow ?? true);
        decision.reason = opaResult.reason || opaResult.result?.reason;
        decision.obligations = opaResult.obligations || opaResult.result?.obligations || [];
      }
    }
  } catch (error) {
    decision.allow = false;
    decision.reason = (error as Error).message;
    decision.obligations = [];
    span.recordException(error as Error);
  }

  span.setAttributes({
    'opa.allow': decision.allow,
    'opa.reason': decision.reason ?? 'n/a',
    'opa.obligations.count': decision.obligations.length,
  });

  return decision;
}

async function loadInvestigationSummary(
  investigationId: string | undefined,
  tenantId: string | undefined,
): Promise<ReturnType<typeof toPublicInvestigationSummary> | null> {
  if (!investigationId || !tenantId) {
    return null;
  }
  const investigation = await investigationRepo.findById(investigationId, tenantId);
  return investigation ? toPublicInvestigationSummary(investigation) : null;
}

function toPublicInvestigationSummary(investigation: Investigation) {
  return {
    id: investigation.id,
    name: investigation.name,
    status: investigation.status.toUpperCase(),
    priority: (investigation.props as any)?.priority ?? null,
    ownerId: investigation.createdBy,
  };
}

function toPublicInvestigation(investigation: Investigation) {
  const props = (investigation.props ?? {}) as Record<string, any>;
  return {
    id: investigation.id,
    tenantId: investigation.tenantId,
    name: investigation.name,
    description: investigation.description ?? null,
    status: investigation.status.toUpperCase(),
    priority: props.priority ?? null,
    ownerId: investigation.createdBy,
    tags: props.tags ?? [],
    props,
    createdAt: investigation.createdAt.toISOString(),
    updatedAt: investigation.updatedAt.toISOString(),
    entityCount: props.entityCount ?? 0,
    relationshipCount: props.relationshipCount ?? 0,
  };
}

function toPublicEntity(entity: Entity) {
  const props = (entity.props ?? {}) as Record<string, any>;
  return {
    id: entity.id,
    tenantId: entity.tenantId,
    kind: entity.kind,
    labels: entity.labels,
    properties: entity.props,
    confidence: typeof props.confidence === 'number' ? props.confidence : null,
    degree: typeof props.degree === 'number' ? props.degree : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    lastIngestedAt: props.lastIngestedAt ?? null,
    retentionClass: props.retentionClass ?? props.retentionTier ?? null,
    geographicScope: props.geographicScope ?? props.region ?? null,
    piiTags: Array.isArray(props.piiTags) ? props.piiTags : [],
    sourceSystems: Array.isArray(props.sourceSystems) ? props.sourceSystems : [],
    investigation: props.investigationId
      ? {
          id: props.investigationId,
          name: props.investigationName ?? 'Investigation',
          status: (props.investigationStatus ?? 'ACTIVE').toString().toUpperCase(),
          priority: props.priority ?? null,
          ownerId: props.ownerId ?? null,
        }
      : null,
  };
}

async function toPublicRelationship(
  relationship: Relationship,
  tenantId: string | undefined,
): Promise<{
  id: string;
  tenantId: string;
  type: string;
  properties: Record<string, any>;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
  source: ReturnType<typeof toPublicEntity> | null;
  target: ReturnType<typeof toPublicEntity> | null;
}> {
  const props = (relationship.props ?? {}) as Record<string, any>;
  const source = await entityRepo.findById(relationship.srcId, tenantId || relationship.tenantId);
  const target = await entityRepo.findById(relationship.dstId, tenantId || relationship.tenantId);

  return {
    id: relationship.id,
    tenantId: relationship.tenantId,
    type: relationship.type,
    properties: relationship.props,
    confidence: typeof props.confidence === 'number' ? props.confidence : null,
    createdAt: relationship.createdAt.toISOString(),
    updatedAt: relationship.updatedAt.toISOString(),
    source: source ? toPublicEntity(source) : null,
    target: target ? toPublicEntity(target) : null,
  };
}

function mapPolicyDenied(decision: PolicyDecision, slo: number): PublicError {
  return {
    code: 'POLICY_DENIED',
    message: decision.reason ?? 'Operation denied by policy',
    retryable: false,
    context: { slo },
  };
}

function mapNotFound(type: string, id: string): PublicError {
  return {
    code: `${type.toUpperCase()}_NOT_FOUND`,
    message: `${type} ${id} not found`,
    field: 'id',
    retryable: false,
  };
}

function mapNotImplemented(operation: string, slo: number): PublicError {
  return {
    code: 'NOT_IMPLEMENTED',
    message: `${operation} is not yet implemented`,
    retryable: false,
    context: { slo },
  };
}

function withSpan<TResult>(
  name: string,
  resolver: (span: Span) => Promise<TResult>,
): Promise<TResult> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes({ 'graphql.resolver': name });
    try {
      const result = await resolver(span);
      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

export const contractsResolvers = {
  Query: {
    publicEntity: withAuthAndPolicy('read:entity', (args: { id: string }, context: ContractsContext) =>
      entityResource(args.id, undefined, context.user?.orgId, context.user?.teamId),
    )(async (_parent, args: { id: string; backpressure?: any }, context: ContractsContext, info: GraphQLResolveInfo) => {
      const start = Date.now();
      return withSpan('contracts.publicEntity', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'entity.id': args.id,
          'tenant.id': context.user?.tenantId ?? 'unknown',
        });

        const policy = await evaluatePolicy(context, span, 'read:entity', {
          type: 'entity',
          id: args.id,
          tenantId: context.user?.tenantId,
        });

        if (!policy.allow) {
          return {
            entity: null,
            policy,
            diagnostics: diagnostics(start, 120, READ_SLO),
            errors: [mapPolicyDenied(policy, READ_SLO)],
          } satisfies PublicEntityResult;
        }

        const entity = await entityRepo.findById(args.id, context.user?.tenantId);
        if (!entity) {
          return {
            entity: null,
            policy,
            diagnostics: diagnostics(start, 120, READ_SLO),
            errors: [mapNotFound('entity', args.id)],
          } satisfies PublicEntityResult;
        }

        const enriched = toPublicEntity(entity);
        if (entity.props?.investigationId) {
          enriched.investigation =
            (await loadInvestigationSummary(entity.props.investigationId, entity.tenantId)) ??
            enriched.investigation;
        }

        return {
          entity: enriched,
          policy,
          diagnostics: diagnostics(start, 120, READ_SLO),
          errors: [],
        } satisfies PublicEntityResult;
      });
    }),

    publicEntities: withAuthAndPolicy(
      'read:entities',
      (args: { filter: { tenantId: string; investigationId?: string } }, context: ContractsContext) =>
        entityResource('collection', args.filter?.investigationId, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: {
        filter: {
          tenantId: string;
          ids?: string[];
          kinds?: string[];
          investigationId?: string;
          sourceSystems?: string[];
        };
        pagination?: { first?: number; after?: string };
        sort?: { field: string; direction?: string };
        backpressure?: { maxWindowMs?: number };
      },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicEntities', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'tenant.id': args.filter.tenantId,
          'filter.kinds': (args.filter.kinds ?? []).join(','),
        });

        const policy = await evaluatePolicy(context, span, 'read:entities', {
          type: 'entity_collection',
          tenantId: args.filter.tenantId,
          investigationId: args.filter.investigationId,
        });

        if (!policy.allow) {
          return {
            nodes: [],
            edges: [],
            totalCount: 0,
            pageInfo: { hasNextPage: false, endCursor: null, throttleUntil: null },
            backpressure: null,
            policy,
            diagnostics: diagnostics(start, 220, READ_SLO),
            errors: [mapPolicyDenied(policy, READ_SLO)],
          };
        }

        const tenantId = args.filter.tenantId;
        const limit = Math.min(Math.max(args.pagination?.first ?? 25, 1), 200);
        const offset = args.pagination?.after ? Number(args.pagination.after) || 0 : 0;

        let entities: Entity[] = [];
        if (args.filter.ids && args.filter.ids.length > 0) {
          const batch = await entityRepo.batchByIds(args.filter.ids, tenantId);
          entities = batch.filter((item): item is Entity => Boolean(item));
        } else {
          const props: Record<string, unknown> = {};
          if (args.filter.investigationId) {
            props.investigationId = args.filter.investigationId;
          }
          if (args.filter.sourceSystems?.length) {
            props.sourceSystems = args.filter.sourceSystems;
          }
          entities = await entityRepo.search({
            tenantId,
            kind: args.filter.kinds?.[0],
            props,
            limit,
            offset,
          });
        }

        const nodes = await Promise.all(
          entities.map(async (entity) => {
            const mapped = toPublicEntity(entity);
            if (entity.props?.investigationId) {
              mapped.investigation =
                (await loadInvestigationSummary(entity.props.investigationId, entity.tenantId)) ??
                mapped.investigation;
            }
            return mapped;
          }),
        );

        const edges = nodes.map((node) => ({
          cursor: node.id,
          node,
          policy,
        }));

        return {
          nodes,
          edges,
          totalCount: nodes.length,
          pageInfo: {
            hasNextPage: nodes.length === limit,
            endCursor: nodes.length ? nodes[nodes.length - 1].id : null,
            throttleUntil: null,
          },
          backpressure: args.backpressure
            ? {
                throttleSeconds: Math.max(0, Math.floor((args.backpressure.clientLagMs ?? 0) / 1000)),
                recommendedPageSize: Math.min(limit, 100),
                reason: 'client-signaled',
              }
            : null,
          policy,
          diagnostics: diagnostics(start, 220, READ_SLO),
          errors: [],
        };
      });
    }),

    publicRelationships: withAuthAndPolicy(
      'read:relationships',
      (args: { filter: { tenantId: string; entityId?: string } }, context: ContractsContext) =>
        entityResource(args.filter.entityId ?? 'collection', undefined, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: {
        filter: { tenantId: string; entityId?: string; types?: string[]; direction?: string };
        pagination?: { first?: number; after?: string };
        backpressure?: { maxWindowMs?: number };
      },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicRelationships', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'tenant.id': args.filter.tenantId,
          'entity.id': args.filter.entityId ?? 'n/a',
        });

        const policy = await evaluatePolicy(context, span, 'read:relationships', {
          type: 'relationship_collection',
          tenantId: args.filter.tenantId,
          entityId: args.filter.entityId,
        });

        if (!policy.allow) {
          return {
            nodes: [],
            edges: [],
            totalCount: 0,
            pageInfo: { hasNextPage: false, endCursor: null, throttleUntil: null },
            backpressure: null,
            policy,
            diagnostics: diagnostics(start, 210, READ_SLO),
            errors: [mapPolicyDenied(policy, READ_SLO)],
          };
        }

        const limit = Math.min(Math.max(args.pagination?.first ?? 25, 1), 200);
        const offset = args.pagination?.after ? Number(args.pagination.after) || 0 : 0;

        let relationships: Relationship[] = [];
        if (args.filter.entityId) {
          const directionMap: Record<string, 'incoming' | 'outgoing' | 'both'> = {
            INBOUND: 'incoming',
            OUTBOUND: 'outgoing',
            BIDIRECTIONAL: 'both',
          };
          relationships = await relationshipRepo.findByEntityId(
            args.filter.entityId,
            args.filter.tenantId,
            directionMap[args.filter.direction ?? 'BIDIRECTIONAL'] ?? 'both',
          );
        } else {
          relationships = await relationshipRepo.search({
            tenantId: args.filter.tenantId,
            type: args.filter.types?.[0],
            limit,
            offset,
          });
        }

        const nodes = await Promise.all(
          relationships.slice(0, limit).map((relationship) =>
            toPublicRelationship(relationship, args.filter.tenantId),
          ),
        );

        const edges = nodes.map((node) => ({ cursor: node?.id ?? '', node, policy }));

        return {
          nodes,
          edges,
          totalCount: nodes.length,
          pageInfo: {
            hasNextPage: relationships.length > limit,
            endCursor: nodes.length ? nodes[nodes.length - 1]?.id ?? null : null,
            throttleUntil: null,
          },
          backpressure: args.backpressure
            ? {
                throttleSeconds: Math.max(0, Math.floor((args.backpressure.maxWindowMs ?? 0) / 1000)),
                recommendedPageSize: Math.min(limit, 100),
                reason: 'window-saturated',
              }
            : null,
          policy,
          diagnostics: diagnostics(start, 210, READ_SLO),
          errors: [],
        };
      });
    }),

    publicInvestigations: withAuthAndPolicy(
      'read:investigations',
      (args: { filter: { tenantId: string } }, context: ContractsContext) =>
        investigationResource('collection', context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { filter: { tenantId: string; status?: string[] }; pagination?: { first?: number; after?: string } },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicInvestigations', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'tenant.id': args.filter.tenantId,
        });

        const policy = await evaluatePolicy(context, span, 'read:investigations', {
          type: 'investigation_collection',
          tenantId: args.filter.tenantId,
        });

        if (!policy.allow) {
          return {
            nodes: [],
            edges: [],
            totalCount: 0,
            pageInfo: { hasNextPage: false, endCursor: null, throttleUntil: null },
            backpressure: null,
            policy,
            diagnostics: diagnostics(start, 180, READ_SLO),
            errors: [mapPolicyDenied(policy, READ_SLO)],
          };
        }

        const limit = Math.min(Math.max(args.pagination?.first ?? 25, 1), 100);
        const offset = args.pagination?.after ? Number(args.pagination.after) || 0 : 0;
        const [firstStatus] = args.filter.status ?? [];

        const investigations = await investigationRepo.list({
          tenantId: args.filter.tenantId,
          status: firstStatus?.toLowerCase(),
          limit,
          offset,
        });

        const nodes = investigations.map(toPublicInvestigation);
        const edges = nodes.map((node) => ({ cursor: node.id, node, policy }));

        return {
          nodes,
          edges,
          totalCount: nodes.length,
          pageInfo: {
            hasNextPage: investigations.length === limit,
            endCursor: nodes.length ? nodes[nodes.length - 1].id : null,
            throttleUntil: null,
          },
          backpressure: null,
          policy,
          diagnostics: diagnostics(start, 180, READ_SLO),
          errors: [],
        };
      });
    }),

    publicInvestigationTimeline: withAuthAndPolicy(
      'read:investigation_timeline',
      (args: { filter: { investigationId: string } }, context: ContractsContext) =>
        investigationResource(args.filter.investigationId, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { filter: { investigationId: string; tenantId: string } },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicInvestigationTimeline', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'investigation.id': args.filter.investigationId,
        });

        const policy = await evaluatePolicy(context, span, 'read:investigation_timeline', {
          type: 'investigation',
          id: args.filter.investigationId,
          tenantId: args.filter.tenantId,
        });

        if (!policy.allow) {
          return {
            nodes: [],
            edges: [],
            totalCount: 0,
            pageInfo: { hasNextPage: false, endCursor: null, throttleUntil: null },
            backpressure: null,
            policy,
            diagnostics: diagnostics(start, 160, READ_SLO),
            errors: [mapPolicyDenied(policy, READ_SLO)],
          };
        }

        return {
          nodes: [],
          edges: [],
          totalCount: 0,
          pageInfo: { hasNextPage: false, endCursor: null, throttleUntil: null },
          backpressure: null,
          policy,
          diagnostics: diagnostics(start, 160, READ_SLO),
          errors: [mapNotImplemented('publicInvestigationTimeline', READ_SLO)],
        };
      });
    }),

    publicEntityNeighborhood: withAuthAndPolicy(
      'read:entity_neighborhood',
      (args: { input: { entityId: string } }, context: ContractsContext) =>
        entityResource(args.input.entityId, undefined, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { input: { entityId: string; tenantId: string; relationshipTypes?: string[]; maxDepth?: number } },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicEntityNeighborhood', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'entity.id': args.input.entityId,
          'tenant.id': args.input.tenantId,
        });

        const policy = await evaluatePolicy(context, span, 'read:entity_neighborhood', {
          type: 'entity',
          id: args.input.entityId,
          tenantId: args.input.tenantId,
        });

        if (!policy.allow) {
          return {
            center: null,
            entities: [],
            relationships: [],
            policy,
            diagnostics: diagnostics(start, 320, READ_SLO),
            backpressure: null,
            errors: [mapPolicyDenied(policy, READ_SLO)],
          };
        }

        const center = await entityRepo.findById(args.input.entityId, args.input.tenantId);
        if (!center) {
          return {
            center: null,
            entities: [],
            relationships: [],
            policy,
            diagnostics: diagnostics(start, 320, READ_SLO),
            backpressure: null,
            errors: [mapNotFound('entity', args.input.entityId)],
          };
        }

        const relationships = await relationshipRepo.findByEntityId(
          args.input.entityId,
          args.input.tenantId,
          'both',
        );

        const relationshipNodes = await Promise.all(
          relationships.map((relationship) => toPublicRelationship(relationship, args.input.tenantId)),
        );

        const neighborIds = new Set<string>();
        for (const rel of relationships) {
          neighborIds.add(rel.srcId);
          neighborIds.add(rel.dstId);
        }
        neighborIds.delete(center.id);

        const neighbors = await entityRepo.batchByIds([...neighborIds], args.input.tenantId);
        const neighborNodes = neighbors
          .filter((item): item is Entity => Boolean(item))
          .map(toPublicEntity);

        return {
          center: toPublicEntity(center),
          entities: neighborNodes,
          relationships: relationshipNodes,
          policy,
          diagnostics: diagnostics(start, 320, READ_SLO),
          backpressure: {
            throttleSeconds: Math.max(0, Math.floor((args.input.maxDepth ?? 2) / 2)),
            recommendedPageSize: Math.min(neighborNodes.length || 25, 100),
            reason: 'degree-throttled',
          },
          errors: [],
        };
      });
    }),
  },

  Mutation: {
    publicUpsertEntity: withAuthAndPolicy(
      'write:entity',
      (args: { input: { id?: string; tenantId: string } }, context: ContractsContext) =>
        entityResource(args.input.id ?? 'new', undefined, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { input: { id?: string; tenantId: string; kind: string; labels?: string[]; properties?: Record<string, any> } },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicUpsertEntity', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'tenant.id': args.input.tenantId,
          'entity.id': args.input.id ?? 'new',
        });

        const policy = await evaluatePolicy(context, span, 'write:entity', {
          type: 'entity',
          id: args.input.id ?? 'new',
          tenantId: args.input.tenantId,
        });

        if (!policy.allow) {
          return {
            ok: false,
            policy,
            diagnostics: diagnostics(start, 420, WRITE_SLO),
            errors: [mapPolicyDenied(policy, WRITE_SLO)],
          } satisfies PublicMutationResult;
        }

        span.addEvent('resolver.stub', { detail: 'write operations are stubbed' });

        return {
          ok: false,
          policy,
          diagnostics: diagnostics(start, 420, WRITE_SLO),
          errors: [mapNotImplemented('publicUpsertEntity', WRITE_SLO)],
        } satisfies PublicMutationResult;
      });
    }),

    publicLinkEntities: withAuthAndPolicy(
      'write:relationship',
      (args: { input: { sourceId: string } }, context: ContractsContext) =>
        entityResource(args.input.sourceId, undefined, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { input: { tenantId: string; sourceId: string; targetId: string } },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicLinkEntities', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'tenant.id': args.input.tenantId,
        });

        const policy = await evaluatePolicy(context, span, 'write:relationship', {
          type: 'relationship',
          tenantId: args.input.tenantId,
          sourceId: args.input.sourceId,
          targetId: args.input.targetId,
        });

        if (!policy.allow) {
          return {
            ok: false,
            policy,
            diagnostics: diagnostics(start, 480, WRITE_SLO),
            errors: [mapPolicyDenied(policy, WRITE_SLO)],
          } satisfies PublicMutationResult;
        }

        span.addEvent('resolver.stub', { detail: 'relationship creation deferred' });

        return {
          ok: false,
          policy,
          diagnostics: diagnostics(start, 480, WRITE_SLO),
          errors: [mapNotImplemented('publicLinkEntities', WRITE_SLO)],
        } satisfies PublicMutationResult;
      });
    }),

    publicAddInvestigationNote: withAuthAndPolicy(
      'write:investigation_note',
      (args: { input: { investigationId: string } }, context: ContractsContext) =>
        investigationResource(args.input.investigationId, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { input: { tenantId: string; investigationId: string } },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicAddInvestigationNote', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'investigation.id': args.input.investigationId,
        });

        const policy = await evaluatePolicy(context, span, 'write:investigation_note', {
          type: 'investigation',
          id: args.input.investigationId,
          tenantId: args.input.tenantId,
        });

        if (!policy.allow) {
          return {
            ok: false,
            policy,
            diagnostics: diagnostics(start, 260, WRITE_SLO),
            errors: [mapPolicyDenied(policy, WRITE_SLO)],
          } satisfies PublicMutationResult;
        }

        return {
          ok: false,
          policy,
          diagnostics: diagnostics(start, 260, WRITE_SLO),
          errors: [mapNotImplemented('publicAddInvestigationNote', WRITE_SLO)],
        } satisfies PublicMutationResult;
      });
    }),

    publicAcknowledgeInvestigation: withAuthAndPolicy(
      'write:investigation_state',
      (args: { input: { investigationId: string } }, context: ContractsContext) =>
        investigationResource(args.input.investigationId, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { input: { tenantId: string; investigationId: string } },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicAcknowledgeInvestigation', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'investigation.id': args.input.investigationId,
        });

        const policy = await evaluatePolicy(context, span, 'write:investigation_state', {
          type: 'investigation',
          id: args.input.investigationId,
          tenantId: args.input.tenantId,
        });

        if (!policy.allow) {
          return {
            ok: false,
            policy,
            diagnostics: diagnostics(start, 280, WRITE_SLO),
            errors: [mapPolicyDenied(policy, WRITE_SLO)],
          } satisfies PublicMutationResult;
        }

        return {
          ok: false,
          policy,
          diagnostics: diagnostics(start, 280, WRITE_SLO),
          errors: [mapNotImplemented('publicAcknowledgeInvestigation', WRITE_SLO)],
        } satisfies PublicMutationResult;
      });
    }),

    publicBatchIngestEntities: withAuthAndPolicy(
      'write:batch_entities',
      (args: { input: Array<{ tenantId: string }> }, context: ContractsContext) =>
        entityResource('batch', undefined, context.user?.orgId, context.user?.teamId),
    )(async (
      _parent,
      args: { input: Array<{ tenantId: string }> },
      context: ContractsContext,
      info: GraphQLResolveInfo,
    ) => {
      const start = Date.now();
      return withSpan('contracts.publicBatchIngestEntities', async (span) => {
        span.setAttributes({
          'graphql.field': info.fieldName,
          'batch.size': args.input.length,
        });

        const tenantIds = Array.from(new Set(args.input.map((item) => item.tenantId)));
        const policy = await evaluatePolicy(context, span, 'write:batch_entities', {
          type: 'entity_batch',
          tenantIds,
        });

        if (!policy.allow) {
          return {
            ok: false,
            accepted: 0,
            failed: args.input.length,
            failures: [],
            policy,
            diagnostics: diagnostics(start, 640, WRITE_SLO),
            errors: [mapPolicyDenied(policy, WRITE_SLO)],
          };
        }

        return {
          ok: false,
          accepted: 0,
          failed: args.input.length,
          failures: args.input.map((input) => ({
            input,
            errors: [mapNotImplemented('publicBatchIngestEntities', WRITE_SLO)],
          })),
          policy,
          diagnostics: diagnostics(start, 640, WRITE_SLO),
          errors: [mapNotImplemented('publicBatchIngestEntities', WRITE_SLO)],
        };
      });
    }),
  },

  Subscription: {
    publicInvestigationEvents: {
      subscribe: withAuthAndPolicy(
        'read:investigation_events',
        (args: { investigationId: string }, context: ContractsContext) =>
          investigationResource(args.investigationId, context.user?.orgId, context.user?.teamId),
      )(async (
        _parent,
        args: { investigationId: string; tenantId: string },
        context: ContractsContext,
      ) => {
        return withSpan('contracts.publicInvestigationEvents.subscribe', async (span) => {
          const policy = await evaluatePolicy(context, span, 'read:investigation_events', {
            type: 'investigation',
            id: args.investigationId,
            tenantId: args.tenantId,
          });

          if (!policy.allow) {
            throw new Error(policy.reason ?? 'Subscription denied by policy');
          }

          span.setAttributes({
            'subscription.investigationId': args.investigationId,
            'subscription.tenantId': args.tenantId,
            'subscription.slo': SUBSCRIPTION_SLO,
          });

          // Placeholder async iterator
          async function* iterator() {
            yield {
              id: 'bootstrap-event',
              investigationId: args.investigationId,
              entityId: null,
              relationshipId: null,
              kind: 'STATUS_CHANGED',
              occurredAt: new Date().toISOString(),
              actorId: context.user?.id ?? 'system',
              payload: {
                status: 'INITIALIZED',
                message: 'subscription bootstrap event',
              },
            };
          }

          return iterator();
        });
      }),
    },
  },
};

export default contractsResolvers;
