import crypto from 'node:crypto';
import { neo } from '../db/neo4j';
import { pg } from '../db/pg';
import { getUser } from '../auth/context';
import { opa } from '../policy/opa';
import { policyEnforcer, Purpose, Action } from '../policy/enforcer';
import { redactionService } from '../redaction/redact';
import { gqlDuration, subscriptionFanoutLatency } from '../metrics';
import { makePubSub } from '../subscriptions/pubsub';
import { cached } from '../cache/responseCache.js';
import { emitInvalidation } from '../cache/invalidation.js';
import { DEFAULT_GRAPH_CACHE_TTL, hashQuery } from '../cache/redis.js';

const COHERENCE_EVENTS = 'COHERENCE_EVENTS';
const CACHE_NAMESPACE = 'tenantCoherence';
const FALLBACK_PUBSUB = makePubSub();

function pubsubFromContext(ctx: any) {
  return ctx?.pubsub ?? FALLBACK_PUBSUB;
}

function requestSignature(ctx: any): string {
  try {
    const body = ctx?.request?.body ?? ctx?.req?.body ?? {};
    const query = ctx?.request?.query ?? body.query ?? '';
    const variables = ctx?.request?.variables ?? body.variables ?? {};
    if (query) {
      return hashQuery(query, variables);
    }
    const opName = ctx?.request?.operationName ?? body.operationName ?? 'anonymous';
    return crypto.createHash('sha1').update(opName).digest('hex');
  } catch {
    return 'anonymous';
  }
}

export const resolvers = {
  DateTime: new (require('graphql-iso-date').GraphQLDateTime)(),
  Query: {
    async tenantCoherence(_: any, { tenantId }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'tenantCoherence' });
      try {
        const user = getUser(ctx);

        const policyDecision = await policyEnforcer.requirePurpose('investigation', {
          tenantId,
          userId: user?.id,
          action: 'read' as Action,
          resource: 'coherence_score',
          purpose: ctx.purpose as Purpose,
          clientIP: ctx.req?.ip,
          userAgent: ctx.req?.get?.('user-agent'),
        });

        if (!policyDecision.allow) {
          throw new Error(`Access denied: ${policyDecision.reason}`);
        }

        const signature = requestSignature(ctx);
        const baseResult = await cached(
          [CACHE_NAMESPACE, tenantId, signature],
          DEFAULT_GRAPH_CACHE_TTL,
          async () => {
            const row = await pg.oneOrNone(
              'SELECT score, status, updated_at FROM coherence_scores WHERE tenant_id=$1',
              [tenantId],
              { region: user?.residency },
            );

            return {
              tenantId,
              score: row?.score ?? 0,
              status: row?.status ?? 'UNKNOWN',
              updatedAt: row?.updated_at ?? new Date().toISOString(),
            };
          },
          { op: 'tenantCoherence', ctx, tags: [`tenant:${tenantId}`, 'graph:coherence'] },
        );

        const resultCopy = JSON.parse(JSON.stringify(baseResult));

        if (policyDecision.redactionRules && policyDecision.redactionRules.length > 0) {
          const redactionPolicy = redactionService.createRedactionPolicy(
            policyDecision.redactionRules as any,
          );
          return await redactionService.redactObject(resultCopy, redactionPolicy, tenantId);
        }

        return resultCopy;
      } finally {
        end();
      }
    },
  },
  Mutation: {
    async publishCoherenceSignal(_: any, { input }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'publishCoherenceSignal' });
      try {
        const user = getUser(ctx);
        const scope = user.tenant === input.tenantId ? 'coherence:write:self' : 'coherence:write';
        opa.enforce(scope, { tenantId: input.tenantId, user, residency: user.residency });

        const { tenantId, type, value, weight, source, ts } = input;
        const signalId = `${source}:${Date.now()}`;
        await neo.run(
          `MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId, s.provenance_id=$provenanceId MERGE (t)-[:EMITS]->(s)`,
          {
            tenantId,
            signalId,
            type,
            value,
            weight,
            source,
            ts: ts || new Date().toISOString(),
            provenanceId: 'placeholder',
          },
          { region: user.residency },
        );

        await emitInvalidation([`${CACHE_NAMESPACE}:${tenantId}`], {
          tenant: tenantId,
          reason: 'coherence-signal',
        });

        const newSignal = {
          id: signalId,
          type,
          value,
          weight,
          source,
          ts: ts || new Date().toISOString(),
        };
        const pubsub = pubsubFromContext(ctx);
        pubsub.publish(COHERENCE_EVENTS, { coherenceEvents: newSignal });

        return true;
      } finally {
        end();
      }
    },
  },
  Subscription: {
    coherenceEvents: {
      subscribe: (_: any, __: any, ctx: any) => {
        const pubsub = pubsubFromContext(ctx);
        const iterator = pubsub.asyncIterator([COHERENCE_EVENTS]);
        const start = process.hrtime.bigint();
        const wrappedIterator = (async function* () {
          for await (const payload of iterator) {
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1_000_000;
            subscriptionFanoutLatency.observe(durationMs);
            yield payload;
          }
        })();
        return wrappedIterator;
      },
    },
  },
};
