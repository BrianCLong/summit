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
import {
  IOSponsorAttributionService,
  AttributionCategory,
  AttributionIndicator,
  AttributionSignal,
  SponsorAttributionRequest,
  AttributionWeights,
} from '../services/attribution/IOSponsorAttributionService.js';
import type { GraphQLContext } from './apollo-v5-server.js';
import { createRequire } from 'node:module';

const COHERENCE_EVENTS = 'COHERENCE_EVENTS';

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

const require = createRequire(import.meta.url);
const sponsorAttributionService = new IOSponsorAttributionService();

const categoryMap: Record<string, AttributionCategory> = {
  INFRASTRUCTURE: 'infrastructure',
  TIMING: 'timing',
  CONTENT_FINGERPRINT: 'contentFingerprint',
  LANGUAGE_MARKER: 'languageMarker',
};

type AttributionIndicatorInput = {
  id: string;
  category: keyof typeof categoryMap;
  description: string;
  confidence: number;
  observedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SponsorCandidateInput = {
  id: string;
  name: string;
  description?: string | null;
};

type AttributionSignalInput = {
  indicatorId: string;
  sponsorId: string;
  signalStrength: number;
  rationale?: string | null;
};

type SponsorAttributionRequestInput = {
  indicators: AttributionIndicatorInput[];
  candidates: SponsorCandidateInput[];
  signals: AttributionSignalInput[];
  weights?: AttributionWeights | null;
};

function mapIndicators(indicators: AttributionIndicatorInput[]): AttributionIndicator[] {
  return indicators.map((indicator) => {
    const category = categoryMap[indicator.category];
    if (!category) {
      throw new Error(`Unsupported indicator category: ${indicator.category}`);
    }
    return {
      id: indicator.id,
      category,
      description: indicator.description,
      confidence: indicator.confidence,
      observedAt: indicator.observedAt ?? null,
      metadata: indicator.metadata ?? null,
    };
  });
}

function mapSignals(signals: AttributionSignalInput[]): AttributionSignal[] {
  return signals.map((signal) => ({
    indicatorId: signal.indicatorId,
    sponsorId: signal.sponsorId,
    signalStrength: signal.signalStrength,
    rationale: signal.rationale ?? null,
  }));
}

function buildRequest(
  request: SponsorAttributionRequestInput,
): SponsorAttributionRequest {
  return {
    indicators: mapIndicators(request.indicators),
    candidates: request.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      description: candidate.description ?? null,
    })),
    signals: mapSignals(request.signals),
    weights: request.weights ?? undefined,
  };
}

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
    sponsorAttribution(
      _: unknown,
      { request }: { request: SponsorAttributionRequestInput },
    ) {
      return sponsorAttributionService.computeRanking(buildRequest(request));
    },
    sponsorAttributionSandbox(
      _: unknown,
      {
        request,
        scenarioWeights,
      }: { request: SponsorAttributionRequestInput; scenarioWeights: AttributionWeights },
    ) {
      return sponsorAttributionService.computeScenario(
        buildRequest(request),
        scenarioWeights,
      );
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
