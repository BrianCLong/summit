"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
// @ts-nocheck
const neo4j_js_1 = require("../db/neo4j.js");
const pg_js_1 = require("../db/pg.js");
const context_js_1 = require("../auth/context.js");
const opa_js_1 = require("../policy/opa.js");
const enforcer_js_1 = require("../policy/enforcer.js");
const redact_js_1 = require("../redaction/redact.js");
const metrics_js_1 = require("../metrics.js");
const ioredis_1 = __importDefault(require("ioredis"));
const CausalGraphService_js_1 = require("../services/CausalGraphService.js");
const node_module_1 = require("node:module");
const COHERENCE_EVENTS = 'COHERENCE_EVENTS';
const redisClient = process.env.REDIS_URL
    ? new ioredis_1.default(process.env.REDIS_URL)
    : null;
const require = (0, node_module_1.createRequire)(import.meta.url);
exports.resolvers = {
    DateTime: new (require('graphql-iso-date').GraphQLDateTime)(),
    Query: {
        async tenantCoherence(_, { tenantId }, ctx) {
            const end = metrics_js_1.gqlDuration.startTimer({ operation: 'tenantCoherence' });
            try {
                const user = (0, context_js_1.getUser)(ctx);
                // Enhanced ABAC enforcement with purpose checking
                const policyDecision = await enforcer_js_1.policyEnforcer.requirePurpose('investigation', {
                    tenantId,
                    userId: user?.id,
                    action: 'read',
                    resource: 'coherence_score',
                    purpose: ctx.purpose,
                    clientIP: ctx.req?.ip,
                    userAgent: ctx.req?.get('user-agent'),
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
                        if (policyDecision.redactionRules &&
                            policyDecision.redactionRules.length > 0) {
                            const redactionPolicy = redact_js_1.redactionService.createRedactionPolicy(policyDecision.redactionRules);
                            return await redact_js_1.redactionService.redactObject(parsed, redactionPolicy, tenantId);
                        }
                        return parsed;
                    }
                }
                // Enhanced database query with tenant scoping
                const row = await pg_js_1.pg.oneOrNone('SELECT score, status, updated_at FROM coherence_scores WHERE tenant_id=$1', [tenantId], { region: user?.residency });
                let result = {
                    tenantId,
                    score: row?.score ?? 0,
                    status: row?.status ?? 'UNKNOWN',
                    updatedAt: row?.updated_at ?? new Date().toISOString(),
                };
                // Apply redaction based on policy decision
                if (policyDecision.redactionRules &&
                    policyDecision.redactionRules.length > 0) {
                    const redactionPolicy = redact_js_1.redactionService.createRedactionPolicy(policyDecision.redactionRules);
                    result = await redact_js_1.redactionService.redactObject(result, redactionPolicy, tenantId);
                }
                if (redisClient) {
                    const cacheKey = `tenantCoherence:${tenantId}`;
                    const ttl = 60;
                    await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
                    console.log(`Cache set for ${cacheKey} with TTL ${ttl}s`);
                }
                return result;
            }
            finally {
                end();
            }
        },
        async causalGraph(_, { investigationId }, _ctx) {
            const causalService = new CausalGraphService_js_1.CausalGraphService();
            return await causalService.generateCausalGraph(investigationId);
        },
    },
    Mutation: {
        async publishCoherenceSignal(_, { input }, ctx) {
            const end = metrics_js_1.gqlDuration.startTimer({ operation: 'publishCoherenceSignal' });
            try {
                const user = (0, context_js_1.getUser)(ctx);
                // S4.1 Fine-grained Scopes: Use coherence:write:self if user is publishing for their own tenantId
                const scope = user.tenant === input.tenantId
                    ? 'coherence:write:self'
                    : 'coherence:write';
                // S3.2 Residency Guard: Pass residency to OPA
                opa_js_1.opa.enforce(scope, {
                    tenantId: input.tenantId,
                    user,
                    residency: user.residency,
                });
                const { tenantId, type, value, weight, source, ts } = input;
                const signalId = `${source}:${Date.now()}`;
                await neo4j_js_1.neo.run(`MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId, s.provenance_id=$provenanceId MERGE (t)-[:EMITS]->(s)`, {
                    tenantId,
                    signalId,
                    type,
                    value,
                    weight,
                    source,
                    ts: ts || new Date().toISOString(),
                    provenanceId: 'placeholder',
                }, { region: user.residency }); // S3.1: Pass region hint
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
            }
            finally {
                end();
            }
        },
    },
    Subscription: {
        coherenceEvents: {
            subscribe: (_, __, ctx) => {
                const iterator = ctx.pubsub.asyncIterator([COHERENCE_EVENTS]);
                const start = process.hrtime.bigint();
                const wrappedIterator = (async function* () {
                    for await (const payload of iterator) {
                        const end = process.hrtime.bigint();
                        const durationMs = Number(end - start) / 1_000_000;
                        metrics_js_1.subscriptionFanoutLatency.observe(durationMs);
                        yield payload;
                    }
                })();
                return wrappedIterator;
            },
        },
    },
};
