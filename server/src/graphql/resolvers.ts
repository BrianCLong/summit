import { neo } from '../db/neo4j';
import { pg } from '../db/pg';
import { getUser } from '../auth/context';
import { opa } from '../policy/opa';
import { policyEnforcer, Purpose, Action } from '../policy/enforcer';
import { redactionService } from '../redaction/redact';
import { gqlDuration, subscriptionFanoutLatency } from '../metrics';
import { makePubSub } from '../subscriptions/pubsub';
import Redis from 'ioredis';
import neo4j from 'neo4j-driver';

import { runNaturalLanguageProcessor } from '../services/nlq/pythonBridge.js';

const COHERENCE_EVENTS = 'COHERENCE_EVENTS';

const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export const resolvers = {
  DateTime: new (require('graphql-iso-date').GraphQLDateTime)(),
  Query: {
    async tenantCoherence(_: any, { tenantId }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'tenantCoherence' });
      try {
        const user = getUser(ctx);
        
        // Enhanced ABAC enforcement with purpose checking
        const policyDecision = await policyEnforcer.requirePurpose('investigation', {
          tenantId,
          userId: user?.id,
          action: 'read' as Action,
          resource: 'coherence_score',
          purpose: ctx.purpose as Purpose,
          clientIP: ctx.req?.ip,
          userAgent: ctx.req?.get('user-agent')
        });

        if (!policyDecision.allow) {
          throw new Error(`Access denied: ${policyDecision.reason}`);
        }

        if (redisClient) {
          const cacheKey = `tenantCoherence:${tenantId}`;
          const cachedResult = await redisClient.get(cacheKey);
          if (cachedResult) {
            console.log(`Cache hit for ${cacheKey}`);
            const parsed = JSON.parse(cachedResult);
            
            // Apply redaction to cached result
            if (policyDecision.redactionRules && policyDecision.redactionRules.length > 0) {
              const redactionPolicy = redactionService.createRedactionPolicy(
                policyDecision.redactionRules as any
              );
              return await redactionService.redactObject(parsed, redactionPolicy, tenantId);
            }
            
            return parsed;
          }
        }

        // Enhanced database query with tenant scoping
        const row = await pg.oneOrNone(
          'SELECT score, status, updated_at FROM coherence_scores WHERE tenant_id=$1', 
          [tenantId], 
          { region: user?.residency }
        );
        
        let result = { 
          tenantId, 
          score: row?.score ?? 0, 
          status: row?.status ?? 'UNKNOWN', 
          updatedAt: row?.updated_at ?? new Date().toISOString() 
        };

        // Apply redaction based on policy decision
        if (policyDecision.redactionRules && policyDecision.redactionRules.length > 0) {
          const redactionPolicy = redactionService.createRedactionPolicy(
            policyDecision.redactionRules as any
          );
          result = await redactionService.redactObject(result, redactionPolicy, tenantId);
        }

        if (redisClient) {
          const cacheKey = `tenantCoherence:${tenantId}`;
          const ttl = 60; 
          await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
          console.log(`Cache set for ${cacheKey} with TTL ${ttl}s`);
        }

        return result;
      } finally {
        end();
      }
    },
    async naturalLanguageGraphSearch(_: any, { input }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'naturalLanguageGraphSearch' });
      try {
        const user = getUser(ctx);
        const tenantId = String(input?.tenantId ?? '').trim();
        if (!tenantId) {
          throw new Error('tenantId is required for natural language graph search');
        }

        const policyDecision = await policyEnforcer.requirePurpose('investigation', {
          tenantId,
          userId: user?.id,
          action: 'read' as Action,
          resource: 'graph_search',
          purpose: ctx.purpose as Purpose,
          clientIP: ctx.req?.ip,
          userAgent: ctx.req?.get('user-agent')
        });

        if (!policyDecision.allow) {
          throw new Error(`Access denied: ${policyDecision.reason}`);
        }

        const processorResult = await runNaturalLanguageProcessor({
          prompt: String(input?.prompt ?? ''),
          tenantId,
          limit: typeof input?.limit === 'number' ? input.limit : undefined
        });

        const finalParams: Record<string, unknown> = {
          ...processorResult.params,
          tenantId
        };

        if (typeof finalParams.limit !== 'number') {
          finalParams.limit = typeof input?.limit === 'number' ? input.limit : 25;
        }

        if (typeof finalParams.limit === 'number') {
          const limitNumber = Number(finalParams.limit);
          finalParams.limit = Math.max(1, Math.min(limitNumber, 100));
        }

        const neoResult = await neo.run(processorResult.cypher, finalParams, { tenantId });
        const rows = Array.isArray(neoResult?.records)
          ? neoResult.records.map((record: any) => serializeRecord(record))
          : [];

        return {
          cypher: processorResult.cypher,
          graphql: processorResult.graphql,
          params: serializeValue(finalParams),
          warnings: processorResult.warnings ?? [],
          rows
        };
      } finally {
        end();
      }
    }
  },
  Mutation: { 
    async publishCoherenceSignal(_: any, { input }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'publishCoherenceSignal' });
      try {
        const user = getUser(ctx);
        // S4.1 Fine-grained Scopes: Use coherence:write:self if user is publishing for their own tenantId
        const scope = user.tenant === input.tenantId ? 'coherence:write:self' : 'coherence:write';
        // S3.2 Residency Guard: Pass residency to OPA
        opa.enforce(scope, { tenantId: input.tenantId, user, residency: user.residency });

        const { tenantId, type, value, weight, source, ts } = input;
        const signalId = `${source}:${Date.now()}`;
        await neo.run(`MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId, s.provenance_id=$provenanceId MERGE (t)-[:EMITS]->(s)`, { tenantId, signalId, type, value, weight, source, ts: ts || new Date().toISOString(), provenanceId: 'placeholder' }, { region: user.residency }); // S3.1: Pass region hint

      if (redisClient) {
        const cacheKey = `tenantCoherence:${tenantId}`;
        await redisClient.del(cacheKey);
        console.log(`Cache invalidated for ${cacheKey}`);
      }

        const newSignal = { id: signalId, type, value, weight, source, ts: ts || new Date().toISOString() };
        ctx.pubsub.publish(COHERENCE_EVENTS, { coherenceEvents: newSignal });

        return true;
      } finally {
        end();
      }
    }
  },
  Subscription: {
    coherenceEvents: {
      subscribe: (_: any, __: any, ctx: any) => {
        const iterator = ctx.pubsub.asyncIterator([COHERENCE_EVENTS]);
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

function serializeRecord(record: any) {
  const obj = record.toObject();
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, serializeValue(value)])
  );
}

function serializeValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (neo4j.isInt(value)) {
    return (value as neo4j.Integer).toNumber();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }

  if (value && typeof value === 'object') {
    if ('identity' in value && 'labels' in value && 'properties' in value) {
      const node = value as neo4j.Node;
      return {
        id: node.identity.toString(),
        labels: node.labels,
        properties: serializeValue(node.properties)
      };
    }

    if ('identity' in value && 'type' in value && 'start' in value && 'end' in value) {
      const relationship = value as neo4j.Relationship;
      return {
        id: relationship.identity.toString(),
        type: relationship.type,
        start: relationship.start.toString(),
        end: relationship.end.toString(),
        properties: serializeValue(relationship.properties)
      };
    }

    if (value instanceof Map) {
      return Object.fromEntries(
        Array.from(value.entries(), ([k, v]) => [k, serializeValue(v)])
      );
    }

    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeValue(v)])
    );
  }

  return value;
}
