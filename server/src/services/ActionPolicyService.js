"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionPolicyService = void 0;
exports.calculateRequestHash = calculateRequestHash;
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = require("../config/logger.js");
const bundleStore_js_1 = require("../policy/bundleStore.js");
/**
 * Deterministically sort an object so that hashing is stable.
 */
function normalize(value) {
    if (Array.isArray(value)) {
        return value.map((item) => normalize(item));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
            acc[key] = normalize(value[key]);
            return acc;
        }, {});
    }
    return value;
}
function resolvePolicyVersion(request) {
    const pinned = request.policyVersion ||
        request.context?.policyVersion ||
        request.context?.pinnedPolicyVersion;
    if (pinned)
        return pinned;
    try {
        const resolved = bundleStore_js_1.policyBundleStore.resolve();
        return resolved.versionId;
    }
    catch (error) {
        logger_js_1.logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Falling back to request-supplied policy version');
        return request.context?.policyVersion;
    }
}
function calculateRequestHash(request) {
    const canonical = normalize({
        action: request.action,
        actor: request.actor,
        resource: request.resource,
        payload: request.payload,
        approvers: request.approvers || [],
        policyVersion: request.context?.policyVersion || request.context?.pinnedPolicyVersion,
    });
    return (0, crypto_1.createHash)('sha256')
        .update(JSON.stringify(canonical))
        .digest('hex');
}
class PolicyDecisionStore {
    async saveDecision(preflightId, requestHash, decision, request, meta, timingMs) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const reasonPayload = {
            reason: decision.reason,
            requestHash,
            obligations: decision.obligations || [],
            expiresAt: decision.expiresAt,
            correlationId: meta.correlationId,
            action: request.action,
        };
        await pool.query(`INSERT INTO policy_decisions_log (
          decision_id,
          policy_name,
          decision,
          reason,
          user_id,
          resource_type,
          resource_id,
          action,
          appeal_available,
          ip_address,
          user_agent,
          tenant_id,
          evaluation_time_ms,
          cache_hit
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
            preflightId,
            decision.policyVersion || 'actions',
            decision.allow ? 'ALLOW' : 'DENY',
            JSON.stringify(reasonPayload),
            request.actor?.id || null,
            request.resource?.type || null,
            requestHash,
            request.action,
            (decision.obligations || []).some((obligation) => obligation.code === 'APPEAL_WINDOW'),
            meta.ip || null,
            meta.userAgent || null,
            request.actor?.tenantId || null,
            timingMs,
            false,
        ]);
    }
    async getDecision(preflightId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const result = await pool.query(`SELECT decision_id, policy_name, decision, reason, resource_id
       FROM policy_decisions_log
       WHERE decision_id = $1
       LIMIT 1`, [preflightId]);
        if (!result.rows.length)
            return null;
        const row = result.rows[0];
        let parsed = {};
        try {
            parsed = JSON.parse(row.reason || '{}');
        }
        catch (error) {
            logger_js_1.logger.warn({
                error: error instanceof Error ? error.message : String(error),
                preflightId,
            }, 'Failed to parse policy decision metadata; falling back to raw reason');
        }
        const decision = {
            allow: row.decision === 'ALLOW',
            reason: parsed.reason || row.reason,
            obligations: parsed.obligations || [],
            decisionId: row.decision_id,
            policyVersion: row.policy_name,
            expiresAt: parsed.expiresAt,
        };
        return {
            decision,
            requestHash: parsed.requestHash || row.resource_id,
            policyName: row.policy_name,
        };
    }
}
class ActionPolicyService {
    opaUrl;
    store;
    http;
    defaultTtlSeconds = 900; // 15 minutes
    constructor(options) {
        this.opaUrl = options?.opaUrl || process.env.OPA_URL || 'http://localhost:8181';
        this.store = options?.store || new PolicyDecisionStore();
        this.http = axios_1.default.create({
            timeout: Number(process.env.OPA_TIMEOUT_MS || 5000),
        });
    }
    async preflight(request, meta = {}) {
        const actor = request.actor || { id: 'anonymous' };
        const normalized = {
            ...request,
            actor: {
                id: actor.id,
                role: actor.role,
                tenantId: actor.tenantId,
            },
        };
        if (!normalized.context)
            normalized.context = {};
        if (normalized.policyVersion && !normalized.context?.policyVersion) {
            normalized.context = {
                ...normalized.context,
                policyVersion: normalized.policyVersion,
            };
        }
        const requestedPolicyVersion = normalized.policyVersion ||
            normalized.context?.policyVersion ||
            normalized.context?.pinnedPolicyVersion;
        const policyVersion = requestedPolicyVersion || resolvePolicyVersion(normalized);
        if (policyVersion) {
            normalized.context = {
                ...(normalized.context || {}),
                policyVersion,
            };
        }
        const requestHash = calculateRequestHash(normalized);
        const started = Date.now();
        const opaDecision = await this.evaluateWithOpa(normalized, requestHash, meta, policyVersion);
        const decision = {
            allow: opaDecision.allow,
            reason: opaDecision.reason || (opaDecision.allow ? 'allow' : 'deny'),
            obligations: opaDecision.obligations || [],
            policyVersion: opaDecision.policy_version || opaDecision.policyVersion || policyVersion,
            decisionId: opaDecision.decision_id || (0, crypto_1.randomUUID)(),
            expiresAt: opaDecision.expires_at ||
                (opaDecision.ttl_seconds
                    ? new Date(Date.now() + opaDecision.ttl_seconds * 1000).toISOString()
                    : new Date(Date.now() + this.defaultTtlSeconds * 1000).toISOString()),
        };
        await this.store.saveDecision(decision.decisionId, requestHash, decision, normalized, meta, Date.now() - started);
        return {
            preflightId: decision.decisionId,
            requestHash,
            decision,
        };
    }
    async validateExecution(preflightId, request) {
        const record = await this.store.getDecision(preflightId);
        if (!record)
            return { status: 'missing' };
        const requestHash = calculateRequestHash(request);
        if (record.requestHash !== requestHash) {
            return {
                status: 'hash_mismatch',
                expected: record.requestHash,
                actual: requestHash,
            };
        }
        if (record.decision.expiresAt) {
            const expires = new Date(record.decision.expiresAt);
            if (Date.now() > expires.getTime()) {
                return { status: 'expired', expiresAt: record.decision.expiresAt };
            }
        }
        const unsatisfied = (record.decision.obligations || []).find((obligation) => obligation.satisfied === false);
        if (!record.decision.allow || unsatisfied) {
            return {
                status: 'blocked',
                reason: record.decision.reason,
                obligation: unsatisfied,
            };
        }
        return { status: 'ok', decision: record.decision, requestHash };
    }
    async evaluateWithOpa(request, requestHash, meta, policyVersion) {
        try {
            const response = await this.http.post(`${this.opaUrl}/v1/data/actions/decision`, {
                input: {
                    action: request.action,
                    actor: request.actor,
                    resource: request.resource,
                    payload: request.payload,
                    context: {
                        approvers: request.approvers || [],
                        correlationId: meta.correlationId,
                        requestHash,
                        policyVersion: policyVersion || request.context?.policyVersion,
                    },
                },
            });
            return response.data?.result || { allow: false, obligations: [] };
        }
        catch (error) {
            logger_js_1.logger.error({
                error: error instanceof Error ? error.message : String(error),
                action: request.action,
            }, 'OPA evaluation failed for action preflight');
            return {
                allow: false,
                reason: 'opa_evaluation_failed',
                obligations: [],
            };
        }
    }
}
exports.ActionPolicyService = ActionPolicyService;
