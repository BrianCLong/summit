"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagClient = exports.OPAFeatureFlagClient = void 0;
const api_1 = require("@opentelemetry/api");
const crypto_1 = require("crypto");
const logger_js_1 = require("../config/logger.js");
const opa_client_js_1 = require("../services/opa-client.js");
const metrics_js_1 = require("./metrics.js");
const DEFAULT_SOURCE = 'runtime-sdk';
class OPAFeatureFlagClient {
    opaClient;
    failOpen;
    constructor(opaClient = new opa_client_js_1.OPAClient(), failOpen = process.env.FEATURE_FLAG_FAIL_OPEN !== 'false') {
        this.opaClient = opaClient;
        this.failOpen = failOpen;
        (0, metrics_js_1.ensureMetricsRegistered)();
    }
    async evaluateFlag(flag, context = {}) {
        const started = process.hrtime.bigint();
        const evaluationId = (0, crypto_1.randomUUID)();
        const input = this.buildInput(flag, context, evaluationId);
        let enabled = this.failOpen;
        let reason = 'fail-open';
        let raw = null;
        let killSwitchActive = false;
        try {
            raw = await this.opaClient.evaluateQuery('feature_flags/decision', input);
            enabled = Boolean(raw?.enabled);
            reason = raw?.reason || 'opa-decision';
            killSwitchActive = Boolean(raw?.kill_switch_active);
            this.audit('feature_flag_decision', {
                evaluationId,
                flag,
                enabled,
                reason,
                killSwitchActive,
                context: input.context,
                opa: raw,
            });
        }
        catch (error) {
            reason = 'opa-error';
            this.audit('feature_flag_error', {
                evaluationId,
                flag,
                error: error instanceof Error ? error.message : 'Unknown error',
                context: input.context,
            });
        }
        finally {
            const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
            metrics_js_1.featureFlagLatency
                .labels({
                flag,
                source: input.context.source || DEFAULT_SOURCE,
                outcome: enabled ? 'enabled' : 'disabled',
            })
                .observe(durationSeconds);
            metrics_js_1.featureFlagDecisions
                .labels({
                flag,
                source: input.context.source || DEFAULT_SOURCE,
                outcome: enabled ? 'enabled' : 'disabled',
            })
                .inc();
        }
        const decision = {
            flag,
            enabled,
            reason,
            killSwitchActive,
            audit: raw?.audit,
            evaluationId,
            evaluatedAt: new Date().toISOString(),
            source: input.context.source,
            metadata: raw?.metadata,
        };
        return { decision, raw };
    }
    async isKillSwitchActive(module, context = {}) {
        const started = process.hrtime.bigint();
        const evaluationId = (0, crypto_1.randomUUID)();
        const input = this.buildInput('kill_switch', { ...context, module }, evaluationId);
        let active = false;
        let reason = 'not-configured';
        let raw = null;
        try {
            raw = await this.opaClient.evaluateQuery('feature_flags/kill_switch', input);
            active = Boolean(raw?.active);
            reason = raw?.reason || reason;
            metrics_js_1.killSwitchGauge.labels({ module }).set(active ? 1 : 0);
            this.audit('kill_switch_check', {
                evaluationId,
                module,
                active,
                reason,
                context: input.context,
            });
        }
        catch (error) {
            reason = 'opa-error';
            metrics_js_1.killSwitchGauge.labels({ module }).set(0);
            this.audit('kill_switch_error', {
                evaluationId,
                module,
                error: error instanceof Error ? error.message : 'Unknown error',
                context: input.context,
            });
        }
        finally {
            const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
            metrics_js_1.featureFlagLatency
                .labels({ flag: 'kill_switch', source: input.context.source || DEFAULT_SOURCE, outcome: active ? 'enabled' : 'disabled' })
                .observe(durationSeconds);
        }
        const decision = {
            module,
            active,
            reason,
            audit: raw?.audit,
            evaluationId,
            evaluatedAt: new Date().toISOString(),
        };
        return { decision, raw };
    }
    buildInput(flag, context, evaluationId) {
        const activeContext = api_1.context.active();
        const carrier = {};
        api_1.propagation.inject(activeContext, carrier);
        const spanContext = api_1.trace.getSpan(activeContext)?.spanContext();
        // Sprint 08: Deterministic ramp seed for percentage rollouts
        const tenantId = context.tenantId || 'unknown';
        const rampSeed = (0, crypto_1.createHash)('sha256')
            .update(`${tenantId}:${flag}:${context.requestId || evaluationId}`)
            .digest('hex')
            .substring(0, 16);
        return {
            flag,
            evaluation_id: evaluationId,
            ramp_seed: rampSeed,
            context: {
                source: context.source || DEFAULT_SOURCE,
                userId: context.userId,
                tenantId: context.tenantId,
                roles: context.roles || [],
                scopes: context.scopes || [],
                module: context.module,
                ip: context.ip,
                correlationId: context.correlationId,
                requestId: context.requestId,
                traceId: context.traceId || spanContext?.traceId,
                spanId: context.spanId || spanContext?.spanId,
                environment: context.environment || process.env.NODE_ENV || 'development',
                metadata: context.metadata || {},
                baggage: carrier,
            },
        };
    }
    audit(event, payload) {
        logger_js_1.logger.info({ event, ...payload }, 'feature-flags');
    }
}
exports.OPAFeatureFlagClient = OPAFeatureFlagClient;
exports.featureFlagClient = new OPAFeatureFlagClient();
