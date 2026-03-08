"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustRiskResolvers = void 0;
const redact_js_1 = require("../../redaction/redact.js");
const featureFlags_js_1 = require("../../config/featureFlags.js");
const trust_risk_metrics_js_1 = require("../../observability/trust-risk-metrics.js");
const trustRiskRepo_js_1 = require("../../db/repositories/trustRiskRepo.js");
function nowIso() {
    return new Date().toISOString();
}
exports.trustRiskResolvers = {
    Query: {
        async trustScore(_, { subjectId }, ctx) {
            if (!featureFlags_js_1.FeatureFlags.isEnabled('agent.angleton')) {
                return {
                    subjectId,
                    score: 0.5,
                    reasons: ['agent_disabled'],
                    updatedAt: nowIso(),
                };
            }
            const tenantId = ctx?.tenantId || 't0';
            const existing = await (0, trustRiskRepo_js_1.getTrustScore)(tenantId, subjectId);
            const score = existing?.score ?? 0.7;
            const reasons = existing?.reasons ?? ['baseline'];
            const payload = {
                subjectId,
                score,
                reasons,
                updatedAt: existing?.updated_at ?? nowIso(),
            };
            (0, trust_risk_metrics_js_1.recordTrustScore)(subjectId, score);
            const policy = { rules: { email: 'pii', phone: 'pii' } };
            return await redact_js_1.redactionService.redactObject(payload, policy, ctx?.tenantId ?? 't0');
        },
        async riskSignals(_, { tenantId, limit, kind, severity }) {
            const rows = await (0, trustRiskRepo_js_1.listRecentSignals)(tenantId, undefined, Math.min(limit ?? 50, 100));
            return rows
                .filter((r) => (!kind || r.kind === kind) &&
                (!severity || r.severity === severity))
                .map((r) => ({
                id: r.id,
                tenantId: r.tenant_id,
                kind: r.kind,
                severity: r.severity,
                message: r.message,
                source: r.source,
                createdAt: r.created_at,
                context: r.context,
            }));
        },
        async riskSignalsPage(_, { tenantId, limit, offset, kind, severity }) {
            const page = await (0, trustRiskRepo_js_1.listRiskSignalsPaged)(tenantId, {
                kind,
                severity,
                limit,
                offset,
            });
            return {
                items: page.items.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    kind: r.kind,
                    severity: r.severity,
                    message: r.message,
                    source: r.source,
                    createdAt: r.created_at,
                    context: r.context,
                })),
                total: page.total,
                nextOffset: page.nextOffset,
            };
        },
        async trustScoresPage(_, { tenantId, limit, offset }) {
            const page = await (0, trustRiskRepo_js_1.listTrustScores)(tenantId, limit, offset);
            return {
                items: page.items.map((ts) => ({
                    subjectId: ts.subject_id,
                    score: Number(ts.score),
                    reasons: ts.reasons || [],
                    updatedAt: ts.updated_at,
                })),
                total: page.total,
                nextOffset: page.nextOffset,
            };
        },
        async incidentBundle(_, { id }) {
            return {
                id,
                type: 'DATA_INTEGRITY',
                status: 'OPEN',
                createdAt: nowIso(),
                signals: [
                    {
                        id: 'rs_1',
                        tenantId: 't0',
                        kind: 'anomaly',
                        severity: 'HIGH',
                        message: 'unexpected data path',
                        source: 'angleton',
                        createdAt: nowIso(),
                        context: { path: '/ingest/v2' },
                    },
                ],
                actions: ['quarantine-input', 'request-corroboration', 'notify-owner'],
                notes: 'Auto-generated bundle for review',
            };
        },
    },
    Mutation: {
        async raiseRiskSignal(_, { input }) {
            if (!featureFlags_js_1.FeatureFlags.isEnabled('agent.harel') && !featureFlags_js_1.FeatureFlags.isEnabled('agent.angleton')) {
                throw new Error('risk signaling disabled by feature flags');
            }
            const rec = {
                id: `rs_${Date.now()}`,
                tenantId: input.tenantId,
                kind: input.kind,
                severity: input.severity,
                message: input.message,
                source: input.source,
                createdAt: nowIso(),
                context: input.context || null,
            };
            await (0, trustRiskRepo_js_1.insertRiskSignal)({
                id: rec.id,
                tenant_id: rec.tenantId,
                kind: rec.kind,
                severity: rec.severity,
                message: rec.message,
                source: rec.source,
                context: rec.context,
            });
            (0, trust_risk_metrics_js_1.recordRiskSignal)({
                tenantId: rec.tenantId,
                kind: rec.kind,
                severity: rec.severity,
                source: rec.source,
            });
            return rec;
        },
        async createIncidentBundle(_, { input }) {
            const bundle = {
                id: `ib_${Date.now()}`,
                type: input.type,
                status: 'OPEN',
                createdAt: nowIso(),
                signals: (input.signalIds || []).map((id) => ({
                    id,
                    tenantId: 't0',
                    kind: 'linked',
                    severity: 'LOW',
                    message: 'linked signal',
                    source: 'system',
                    createdAt: nowIso(),
                    context: {},
                })),
                actions: ['assign-reviewer'],
                notes: input.notes || null,
            };
            // Record metrics for each linked signal
            for (const s of bundle.signals) {
                (0, trust_risk_metrics_js_1.recordRiskSignal)({
                    tenantId: s.tenantId,
                    kind: s.kind,
                    severity: s.severity,
                    source: s.source,
                });
            }
            return bundle;
        },
    },
};
exports.default = exports.trustRiskResolvers;
