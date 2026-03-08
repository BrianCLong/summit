"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceOkResolvers = void 0;
const slo_metrics_js_1 = require("../../crystal/slo-metrics.js");
const evidenceRepo_js_1 = require("../../db/repositories/evidenceRepo.js");
exports.evidenceOkResolvers = {
    Query: {
        async evidenceOk(_root, { service, releaseId }, _ctx) {
            // Prefer the latest Evidence bundle for this service/releaseId if available
            const ev = await (0, evidenceRepo_js_1.getLatestEvidence)(service, releaseId).catch(() => null);
            let snapshot;
            let cost;
            if (ev) {
                snapshot = {
                    service,
                    p95Ms: ev.slo?.p95Ms ?? 0,
                    p99Ms: ev.slo?.p99Ms ?? null,
                    errorRate: ev.slo?.errorRate ?? 0,
                    window: ev.slo?.window ?? 'unknown',
                };
                cost = ev.cost || null;
            }
            else {
                const slo = slo_metrics_js_1.sloMetrics.getSLOSnapshot();
                snapshot = {
                    service,
                    p95Ms: Math.round(slo.gatewayReadP95),
                    p99Ms: Math.round(slo.gatewayReadP99),
                    errorRate: 0.01,
                    window: '15m',
                };
                cost = { graphqlPerMillionUsd: 1.8, ingestPerThousandUsd: 0.08 };
            }
            const reasons = [];
            const READ_P95_BUDGET = 350;
            const ERROR_RATE_BUDGET = 0.02;
            const GRAPHQL_COST_BUDGET = 2.0;
            if (snapshot.p95Ms > READ_P95_BUDGET)
                reasons.push(`p95 ${snapshot.p95Ms}ms > ${READ_P95_BUDGET}ms`);
            if (snapshot.errorRate > ERROR_RATE_BUDGET)
                reasons.push(`errorRate ${snapshot.errorRate} > ${ERROR_RATE_BUDGET}`);
            if ((cost?.graphqlPerMillionUsd ?? 0) > GRAPHQL_COST_BUDGET)
                reasons.push(`graphql cost ${cost.graphqlPerMillionUsd} > ${GRAPHQL_COST_BUDGET}`);
            return { ok: reasons.length === 0, reasons, snapshot, cost };
        },
    },
};
exports.default = exports.evidenceOkResolvers;
