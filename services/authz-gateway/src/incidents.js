"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIncidentEvidence = generateIncidentEvidence;
const node_crypto_1 = __importDefault(require("node:crypto"));
const slo_1 = require("./slo");
const observability_1 = require("./observability");
function buildRequestHeaders(req) {
    return Object.entries(req.headers).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
            acc[key] = value;
        }
        else if (Array.isArray(value) && value.length > 0) {
            acc[key] = value.join(',');
        }
        return acc;
    }, {});
}
async function generateIncidentEvidence(req) {
    const traceId = req.headers['x-trace-id'] || node_crypto_1.default.randomUUID();
    const spanId = req.headers['x-span-id'];
    const tenantId = (0, slo_1.resolveTenantId)(req, req.res || {});
    const route = req.route?.path || req.path || 'fleet';
    const sloEvidence = (0, slo_1.buildSloEvidence)(tenantId, route);
    return {
        id: node_crypto_1.default.randomUUID(),
        generatedAt: new Date().toISOString(),
        tenantId,
        route,
        traceId,
        spanId,
        requestHeaders: buildRequestHeaders(req),
        metrics: sloEvidence.metrics,
        controls: {
            policyBundleVersion: process.env.POLICY_BUNDLE_VERSION || 'v1',
            residency: req.headers['x-resource-residency'] || 'unknown',
            classification: req.headers['x-resource-classification'] || 'unknown',
        },
        context: {
            action: req.res?.locals?.action,
            resourceId: req.res?.locals?.resourceId,
        },
        metricsSnapshot: await observability_1.registry.metrics(),
    };
}
