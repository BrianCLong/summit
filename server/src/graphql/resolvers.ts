import { neo } from '../db/neo4j';
import neo4j, { Integer } from 'neo4j-driver';
import { pg } from '../db/pg';
import { getUser } from '../auth/context';
import { opa } from '../policy/opa';
import { policyEnforcer, Purpose, Action } from '../policy/enforcer';
import { redactionService } from '../redaction/redact';
import { gqlDuration, subscriptionFanoutLatency } from '../metrics';
import { makePubSub } from '../subscriptions/pubsub';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { vectorSearchBridge } from '../services/vectorSearchBridge';

const COHERENCE_EVENTS = 'COHERENCE_EVENTS';

const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export const resolvers = {
  DateTime: new (require('graphql-iso-date').GraphQLDateTime)(),
  Query: {
    async vectorSimilaritySearch(_: any, { input }: any) {
      const { tenantId, vector, topK, filter } = input;

      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error('vector must be a non-empty array');
      }

      if (!vectorSearchBridge.isEnabled()) {
        throw new Error('Vector database is not configured');
      }

      const numericVector = vector.map((value: any, index: number) => {
        const numeric = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numeric)) {
          throw new Error(`vector[${index}] must be numeric`);
        }
        return numeric;
      });

      const results = await vectorSearchBridge.searchSimilar(
        numericVector,
        tenantId,
        topK ?? 10,
        filter,
      );

      if (results.length === 0) {
        return [];
      }

      const nodeIds = Array.from(
        new Set(results.map((result) => result.nodeId).filter((id): id is string => Boolean(id))),
      );

      const entityMap = new Map<string, any>();

      if (nodeIds.length > 0) {
        try {
          const neoResult = await neo.run(
            `MATCH (n:Entity {tenantId: $tenantId})
             WHERE n.id IN $ids
             RETURN n.id as id, n`,
            { tenantId, ids: nodeIds },
            { tenantId },
          );

          for (const record of neoResult.records) {
            const id = record.get('id');
            const node = record.get('n');
            entityMap.set(id, mapNeoNodeToEntity(node));
          }
        } catch (error) {
          logger.error('Failed to hydrate Neo4j nodes for vector search', { error, tenantId });
        }
      }

      return results.map((result) => ({
        nodeId: result.nodeId ?? null,
        tenantId: result.tenantId ?? tenantId,
        score: result.score,
        embeddingModel: result.embeddingModel ?? null,
        metadata: result.metadata ?? null,
        entity: result.nodeId ? entityMap.get(result.nodeId) ?? null : null,
      }));
    },
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

function mapNeoNodeToEntity(node: any) {
  if (!node) {
    return null;
  }

  const labels: string[] = node.labels || [];
  const properties = toPlainObject(node.properties || {});

  const {
    id,
    tenant_id,
    tenantId,
    kind,
    labels: storedLabels,
    props,
    created_at,
    createdAt,
    updated_at,
    updatedAt,
    created_by,
    createdBy,
    ...rest
  } = properties;

  const entityProps = typeof props === 'object' && props !== null ? props : rest;

  return {
    id,
    tenantId: tenant_id || tenantId,
    kind: kind || labels[0] || 'Entity',
    labels: storedLabels || labels,
    props: entityProps,
    createdAt: created_at || createdAt || new Date().toISOString(),
    updatedAt: updated_at || updatedAt || created_at || new Date().toISOString(),
    createdBy: created_by || createdBy || 'system',
  };
}

function toPlainObject(value: any): any {
  if (neo4j.isInt(value)) {
    return (value as Integer).toNumber();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainObject(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, val]) => [key, toPlainObject(val)]);
    return Object.fromEntries(entries);
  }

  return value;
}