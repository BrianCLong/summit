"use strict";
/**
 * Policy Verdict DataLoader - Batch loading for policy evaluation verdicts
 * Prevents N+1 query issues when fetching governance verdicts and decisions
 *
 * SOC 2 Controls: CC5.1 (Control Activities), CC5.2 (Logical Access)
 *
 * @module graphql/dataloaders/policyVerdictLoader
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPolicyVerdictLoader = createPolicyVerdictLoader;
exports.createVerdictByKeyLoader = createVerdictByKeyLoader;
exports.createVerdictsBySubjectLoader = createVerdictsBySubjectLoader;
exports.createDeniedVerdictsLoader = createDeniedVerdictsLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'verdict-dataloader-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'PolicyVerdictLoader',
    };
}
function keyToString(key) {
    return `${key.policyId}:${key.subjectId}:${key.resourceId}:${key.action}`;
}
// ============================================================================
// Batch Load Functions
// ============================================================================
/**
 * Batch function for loading policy verdicts by ID
 */
async function batchLoadVerdicts(ids, context) {
    const { redis, tenantId, pgPool } = context;
    const verdictMap = new Map();
    const missingIds = [];
    // 1. Try to load from Redis cache first
    if (redis) {
        try {
            const keys = ids.map((id) => `verdict:${tenantId}:${id}`);
            const cachedValues = await redis.mget(keys);
            cachedValues.forEach((val, index) => {
                if (val) {
                    try {
                        const verdict = JSON.parse(val);
                        verdictMap.set(ids[index], {
                            ...verdict,
                            cached: true,
                            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded from cache'),
                        });
                    }
                    catch {
                        missingIds.push(ids[index]);
                    }
                }
                else {
                    missingIds.push(ids[index]);
                }
            });
        }
        catch (error) {
            logger_js_1.default.warn({ error }, 'Redis cache error in policyVerdictLoader');
            missingIds.push(...ids.filter(id => !verdictMap.has(id)));
        }
    }
    else {
        missingIds.push(...ids);
    }
    // 2. Load missing verdicts from PostgreSQL
    if (missingIds.length > 0) {
        const client = context.pgClient || await pgPool.connect();
        const shouldRelease = !context.pgClient;
        try {
            const startTime = Date.now();
            const result = await client.query(`
        SELECT
          pv.id,
          pv.tenant_id,
          pv.policy_id,
          pv.policy_version,
          pv.subject_type,
          pv.subject_id,
          pv.resource_type,
          pv.resource_id,
          pv.action,
          pv.result,
          pv.reason,
          pv.conditions,
          pv.evaluated_at,
          pv.evaluation_duration_ms,
          pv.metadata
        FROM policy_verdicts pv
        WHERE pv.tenant_id = $1 AND pv.id = ANY($2)
        `, [tenantId, missingIds]);
            const dbVerdicts = new Map();
            for (const row of result.rows) {
                const verdict = {
                    id: row.id,
                    tenantId: row.tenant_id,
                    policyId: row.policy_id,
                    policyVersion: row.policy_version,
                    subjectType: row.subject_type,
                    subjectId: row.subject_id,
                    resourceType: row.resource_type,
                    resourceId: row.resource_id,
                    action: row.action,
                    result: row.result,
                    reason: row.reason,
                    conditions: row.conditions || [],
                    evaluatedAt: row.evaluated_at,
                    evaluationDurationMs: row.evaluation_duration_ms,
                    cached: false,
                    metadata: row.metadata || {},
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded from database'),
                };
                dbVerdicts.set(verdict.id, verdict);
                verdictMap.set(verdict.id, verdict);
            }
            // Cache the newly fetched verdicts
            if (redis && dbVerdicts.size > 0) {
                const pipeline = redis.pipeline();
                for (const [id, verdict] of dbVerdicts.entries()) {
                    const { governanceVerdict, ...cacheData } = verdict;
                    pipeline.setex(`verdict:${tenantId}:${id}`, 60, // 1 minute TTL - verdicts are typically short-lived
                    JSON.stringify(cacheData));
                }
                await pipeline.exec();
            }
            const duration = Date.now() - startTime;
            logger_js_1.default.debug({
                batchSize: missingIds.length,
                found: dbVerdicts.size,
                duration,
            }, 'Policy verdict batch load completed');
        }
        catch (error) {
            logger_js_1.default.error({ error, ids: missingIds }, 'Error in policy verdict batch loader');
        }
        finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }
    // Return verdicts in the same order as requested IDs
    return ids.map((id) => {
        const verdict = verdictMap.get(id);
        if (!verdict) {
            return new Error(`Policy verdict not found: ${id}`);
        }
        return verdict;
    });
}
/**
 * Batch function for loading verdicts by composite key
 */
async function batchLoadVerdictsByKey(keys, context) {
    const { redis, tenantId, pgPool } = context;
    const verdictMap = new Map();
    const missingKeys = [];
    // 1. Try to load from Redis cache first
    if (redis) {
        try {
            const cacheKeys = keys.map((k) => `verdict-key:${tenantId}:${keyToString(k)}`);
            const cachedValues = await redis.mget(cacheKeys);
            cachedValues.forEach((val, index) => {
                if (val) {
                    try {
                        const verdict = JSON.parse(val);
                        verdictMap.set(keyToString(keys[index]), {
                            ...verdict,
                            cached: true,
                            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded from cache'),
                        });
                    }
                    catch {
                        missingKeys.push(keys[index]);
                    }
                }
                else {
                    missingKeys.push(keys[index]);
                }
            });
        }
        catch (error) {
            logger_js_1.default.warn({ error }, 'Redis cache error in policyVerdictLoader key lookup');
            missingKeys.push(...keys.filter(k => !verdictMap.has(keyToString(k))));
        }
    }
    else {
        missingKeys.push(...keys);
    }
    // 2. Load missing verdicts from PostgreSQL
    if (missingKeys.length > 0) {
        const client = context.pgClient || await pgPool.connect();
        const shouldRelease = !context.pgClient;
        try {
            // Build a query with all the composite keys
            const conditions = missingKeys.map((_, i) => {
                const base = i * 4;
                return `(pv.policy_id = $${base + 2} AND pv.subject_id = $${base + 3} AND pv.resource_id = $${base + 4} AND pv.action = $${base + 5})`;
            });
            const params = [tenantId];
            for (const key of missingKeys) {
                params.push(key.policyId, key.subjectId, key.resourceId, key.action);
            }
            const result = await client.query(`
        SELECT
          pv.id,
          pv.tenant_id,
          pv.policy_id,
          pv.policy_version,
          pv.subject_type,
          pv.subject_id,
          pv.resource_type,
          pv.resource_id,
          pv.action,
          pv.result,
          pv.reason,
          pv.conditions,
          pv.evaluated_at,
          pv.evaluation_duration_ms,
          pv.metadata
        FROM policy_verdicts pv
        WHERE pv.tenant_id = $1 AND (${conditions.join(' OR ')})
        ORDER BY pv.evaluated_at DESC
        `, params);
            const dbVerdicts = new Map();
            for (const row of result.rows) {
                const key = {
                    policyId: row.policy_id,
                    subjectId: row.subject_id,
                    resourceId: row.resource_id,
                    action: row.action,
                };
                const keyStr = keyToString(key);
                // Only keep the most recent verdict for each key
                if (!dbVerdicts.has(keyStr)) {
                    const verdict = {
                        id: row.id,
                        tenantId: row.tenant_id,
                        policyId: row.policy_id,
                        policyVersion: row.policy_version,
                        subjectType: row.subject_type,
                        subjectId: row.subject_id,
                        resourceType: row.resource_type,
                        resourceId: row.resource_id,
                        action: row.action,
                        result: row.result,
                        reason: row.reason,
                        conditions: row.conditions || [],
                        evaluatedAt: row.evaluated_at,
                        evaluationDurationMs: row.evaluation_duration_ms,
                        cached: false,
                        metadata: row.metadata || {},
                        governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded by key'),
                    };
                    dbVerdicts.set(keyStr, verdict);
                    verdictMap.set(keyStr, verdict);
                }
            }
            // Cache the newly fetched verdicts
            if (redis && dbVerdicts.size > 0) {
                const pipeline = redis.pipeline();
                for (const [keyStr, verdict] of dbVerdicts.entries()) {
                    const { governanceVerdict, ...cacheData } = verdict;
                    pipeline.setex(`verdict-key:${tenantId}:${keyStr}`, 60, // 1 minute TTL
                    JSON.stringify(cacheData));
                }
                await pipeline.exec();
            }
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Error loading verdicts by key');
        }
        finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }
    // Return verdicts in the same order as requested keys (null if not found)
    return keys.map((key) => verdictMap.get(keyToString(key)) || null);
}
/**
 * Batch function for loading verdicts by subject
 */
async function batchLoadVerdictsBySubject(subjectIds, context) {
    const { tenantId, pgPool } = context;
    const client = context.pgClient || await pgPool.connect();
    const shouldRelease = !context.pgClient;
    try {
        const result = await client.query(`
      SELECT
        pv.id,
        pv.tenant_id,
        pv.policy_id,
        pv.policy_version,
        pv.subject_type,
        pv.subject_id,
        pv.resource_type,
        pv.resource_id,
        pv.action,
        pv.result,
        pv.reason,
        pv.conditions,
        pv.evaluated_at,
        pv.evaluation_duration_ms,
        pv.metadata
      FROM policy_verdicts pv
      WHERE pv.tenant_id = $1 AND pv.subject_id = ANY($2)
      ORDER BY pv.evaluated_at DESC
      LIMIT 1000
      `, [tenantId, subjectIds]);
        // Group verdicts by subject ID
        const verdictsBySubject = new Map();
        for (const row of result.rows) {
            const verdict = {
                id: row.id,
                tenantId: row.tenant_id,
                policyId: row.policy_id,
                policyVersion: row.policy_version,
                subjectType: row.subject_type,
                subjectId: row.subject_id,
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                action: row.action,
                result: row.result,
                reason: row.reason,
                conditions: row.conditions || [],
                evaluatedAt: row.evaluated_at,
                evaluationDurationMs: row.evaluation_duration_ms,
                cached: false,
                metadata: row.metadata || {},
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded by subject'),
            };
            const existing = verdictsBySubject.get(verdict.subjectId) || [];
            existing.push(verdict);
            verdictsBySubject.set(verdict.subjectId, existing);
        }
        return subjectIds.map((subjectId) => verdictsBySubject.get(subjectId) || []);
    }
    catch (error) {
        logger_js_1.default.error({ error, subjectIds }, 'Error loading verdicts by subject');
        return subjectIds.map(() => new Error('Failed to load verdicts'));
    }
    finally {
        if (shouldRelease) {
            client.release();
        }
    }
}
/**
 * Batch function for loading denied verdicts for audit
 */
async function batchLoadDeniedVerdicts(policyIds, context) {
    const { tenantId, pgPool } = context;
    const client = context.pgClient || await pgPool.connect();
    const shouldRelease = !context.pgClient;
    try {
        const result = await client.query(`
      SELECT
        pv.id,
        pv.tenant_id,
        pv.policy_id,
        pv.policy_version,
        pv.subject_type,
        pv.subject_id,
        pv.resource_type,
        pv.resource_id,
        pv.action,
        pv.result,
        pv.reason,
        pv.conditions,
        pv.evaluated_at,
        pv.evaluation_duration_ms,
        pv.metadata
      FROM policy_verdicts pv
      WHERE pv.tenant_id = $1
        AND pv.policy_id = ANY($2)
        AND pv.result = 'DENY'
      ORDER BY pv.evaluated_at DESC
      LIMIT 500
      `, [tenantId, policyIds]);
        // Group verdicts by policy ID
        const verdictsByPolicy = new Map();
        for (const row of result.rows) {
            const verdict = {
                id: row.id,
                tenantId: row.tenant_id,
                policyId: row.policy_id,
                policyVersion: row.policy_version,
                subjectType: row.subject_type,
                subjectId: row.subject_id,
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                action: row.action,
                result: row.result,
                reason: row.reason,
                conditions: row.conditions || [],
                evaluatedAt: row.evaluated_at,
                evaluationDurationMs: row.evaluation_duration_ms,
                cached: false,
                metadata: row.metadata || {},
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Denied verdict loaded'),
            };
            const existing = verdictsByPolicy.get(verdict.policyId) || [];
            existing.push(verdict);
            verdictsByPolicy.set(verdict.policyId, existing);
        }
        return policyIds.map((policyId) => verdictsByPolicy.get(policyId) || []);
    }
    catch (error) {
        logger_js_1.default.error({ error, policyIds }, 'Error loading denied verdicts');
        return policyIds.map(() => new Error('Failed to load denied verdicts'));
    }
    finally {
        if (shouldRelease) {
            client.release();
        }
    }
}
// ============================================================================
// Loader Creation
// ============================================================================
/**
 * Creates a new Policy Verdict DataLoader by ID
 */
function createPolicyVerdictLoader(context) {
    return new dataloader_1.default(
    // @ts-ignore
    (ids) => batchLoadVerdicts(ids, context), {
        cache: true,
        maxBatchSize: 100,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * Creates a DataLoader for looking up verdicts by composite key
 */
function createVerdictByKeyLoader(context) {
    return new dataloader_1.default((keys) => batchLoadVerdictsByKey(keys, context), {
        cache: true,
        maxBatchSize: 50,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
        cacheKeyFn: keyToString,
    });
}
/**
 * Creates a DataLoader for loading verdicts by subject
 */
function createVerdictsBySubjectLoader(context) {
    return new dataloader_1.default((subjectIds) => batchLoadVerdictsBySubject(subjectIds, context), {
        cache: true,
        maxBatchSize: 30,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * Creates a DataLoader for loading denied verdicts by policy
 */
function createDeniedVerdictsLoader(context) {
    return new dataloader_1.default((policyIds) => batchLoadDeniedVerdicts(policyIds, context), {
        cache: true,
        maxBatchSize: 20,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
exports.default = createPolicyVerdictLoader;
