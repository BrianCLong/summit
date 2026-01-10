// @ts-nocheck
import { neo } from '../db/neo4j';
import { pg } from '../db/pg';
import { getUser } from '../auth/context';
import { opa } from '../policy/opa';
import { policyEnforcer, Purpose, Action } from '../policy/enforcer';
import { redactionService } from '../redaction/redact';
import { gqlDuration, subscriptionFanoutLatency } from '../metrics';
import { makePubSub } from '../subscriptions/pubsub';
import Redis from 'ioredis';
import { CausalGraphService } from '../services/CausalGraphService';
import type { GraphQLContext } from './apollo-v5-server.js';
import { getPostgresPool, getNeo4jDriver, getRedisClient } from '../config/database.js';
import { RAGOrchestrator, PgVectorStore, Neo4jGraphStore } from '@intelgraph/agentic-rag';
import { cacheHits } from '@intelgraph/agentic-rag';

const COHERENCE_EVENTS = 'COHERENCE_EVENTS';

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

const normalizeQuery = (query: string) =>
  query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const stableStringify = (value: unknown): string => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => [key, val]);
  return JSON.stringify(Object.fromEntries(entries));
};

const resolveCorpusVersion = async (pool: any, workspaceId?: string) => {
  const result = await pool.query(
    `SELECT corpus_version
     FROM rag_documents
     WHERE ($1::text IS NULL OR workspace_id = $1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [workspaceId ?? null]
  );
  if (result.rows?.[0]?.corpus_version) {
    return result.rows[0].corpus_version as string;
  }
  const fallback = await pool.query(
    `SELECT corpus_version
     FROM rag_chunks
     WHERE ($1::text IS NULL OR workspace_id = $1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [workspaceId ?? null]
  );
  return fallback.rows?.[0]?.corpus_version ?? 'unknown';
};

export const resolvers = {
  DateTime: new (require('graphql-iso-date').GraphQLDateTime)(),
  Query: {
    async tenantCoherence(_: unknown, { tenantId }: { tenantId: string }, ctx: GraphQLContext) {
      const end = gqlDuration.startTimer({ operation: 'tenantCoherence' });
      try {
        const user = getUser(ctx);

        // Enhanced ABAC enforcement with purpose checking
        const policyDecision = await policyEnforcer.requirePurpose(
          'investigation',
          {
            tenantId,
            userId: user?.id,
            action: 'read' as Action,
            resource: 'coherence_score',
            purpose: ctx.purpose as Purpose,
            clientIP: ctx.req?.ip,
            userAgent: ctx.req?.get('user-agent'),
          },
        );

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
            if (
              policyDecision.redactionRules &&
              policyDecision.redactionRules.length > 0
            ) {
              const redactionPolicy = redactionService.createRedactionPolicy(
                policyDecision.redactionRules as any,
              );
              return await redactionService.redactObject(
                parsed,
                redactionPolicy,
                tenantId,
              );
            }

            return parsed;
          }
        }

        // Enhanced database query with tenant scoping
        const row = await pg.oneOrNone(
          'SELECT score, status, updated_at FROM coherence_scores WHERE tenant_id=$1',
          [tenantId],
          { region: user?.residency },
        );

        let result = {
          tenantId,
          score: row?.score ?? 0,
          status: row?.status ?? 'UNKNOWN',
          updatedAt: row?.updated_at ?? new Date().toISOString(),
        };

        // Apply redaction based on policy decision
        if (
          policyDecision.redactionRules &&
          policyDecision.redactionRules.length > 0
        ) {
          const redactionPolicy = redactionService.createRedactionPolicy(
            policyDecision.redactionRules as any,
          );
          result = await redactionService.redactObject(
            result,
            redactionPolicy,
            tenantId,
          );
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
    async causalGraph(_: any, { investigationId }: any, _ctx: any) {
      const causalService = new CausalGraphService();
      return await causalService.generateCausalGraph(investigationId);
    },
  },
  Mutation: {
    async publishCoherenceSignal(_: any, { input }: any, ctx: any) {
      const end = gqlDuration.startTimer({ operation: 'publishCoherenceSignal' });
      try {
        const user = getUser(ctx);
        // S4.1 Fine-grained Scopes: Use coherence:write:self if user is publishing for their own tenantId
        const scope =
          user.tenant === input.tenantId
            ? 'coherence:write:self'
            : 'coherence:write';
        // S3.2 Residency Guard: Pass residency to OPA
        opa.enforce(scope, {
          tenantId: input.tenantId,
          user,
          residency: user.residency,
        });

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
          { region: user.residency } as any,
        ); // S3.1: Pass region hint

        if (redisClient) {
          const cacheKey = `tenantCoherence:${tenantId}`;
          await redisClient.del(cacheKey);
          console.log(`Cache invalidated for ${cacheKey}`);
        }

        const newSignal = {
          id: signalId,
          type,
          value,
          weight,
          source,
          ts: ts || new Date().toISOString(),
        };
        ctx.pubsub.publish(COHERENCE_EVENTS, { coherenceEvents: newSignal });

        return true;
      } finally {
        end();
      }
    },
    async ragAnswer(_: any, { input }: any) {
      if (process.env.AGENTIC_RAG_ENABLED !== 'true') {
        return { answer: 'Agentic RAG disabled', citations: [], debug: { enabled: false } };
      }

      const rawQuery = input?.query ?? '';
      const normalizedQuery = normalizeQuery(rawQuery);
      const normalized = {
        query: rawQuery,
        workspaceId: input?.workspaceId,
        filters: input?.filters,
        topK: input?.topK ?? Number(process.env.AGENTIC_RAG_TOPK || 8),
        useHyde: input?.useHyDE ?? process.env.AGENTIC_RAG_USE_HYDE === 'true',
        useTools: input?.useTools ?? process.env.AGENTIC_RAG_USE_TOOLS !== 'false',
      };

      const redis = getRedisClient() ?? redisClient;
      const poolWrapper = getPostgresPool();
      const pool = (poolWrapper as any).pool ?? poolWrapper;
      const corpusVersion = await resolveCorpusVersion(pool, normalized.workspaceId);
      const cacheKey = `rag:cache:${normalizedQuery}:${normalized.workspaceId ?? 'global'}:${corpusVersion}:${normalized.topK}:${stableStringify(
        normalized.filters ?? {}
      )}`;

      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          cacheHits.labels('hit').inc();
          return JSON.parse(cached);
        }
        cacheHits.labels('miss').inc();
      }

      let graphStore: Neo4jGraphStore | undefined;
      try {
        graphStore = new Neo4jGraphStore({ driver: getNeo4jDriver() as any });
      } catch (error) {
        graphStore = undefined;
      }

      const orchestrator = new RAGOrchestrator({
        vectorStore: new PgVectorStore({ pool }),
        graphStore,
      }, {
        enableHttpFetch: process.env.AGENTIC_RAG_ENABLE_HTTP_FETCH === 'true',
        weights: {
          vector: Number(process.env.HYBRID_VECTOR_WEIGHT || 0.7),
          graph: Number(process.env.HYBRID_GRAPH_WEIGHT || 0.3),
        },
      });

      const result = await orchestrator.answer({
        query: normalized.query,
        workspaceId: normalized.workspaceId,
        filters: normalized.filters,
        corpusVersion,
        topK: normalized.topK,
        useHyde: normalized.useHyde,
        useTools: normalized.useTools,
      });

      if (redis) {
        await redis.set(
          cacheKey,
          JSON.stringify(result),
          'EX',
          Number(process.env.AGENTIC_RAG_REDIS_TTL_SECONDS || 900)
        );
      }

      return result;
    },
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
