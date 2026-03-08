"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.governance = void 0;
const PolicyEngine_js_1 = require("./PolicyEngine.js");
const TelemetryLayer_js_1 = require("./TelemetryLayer.js");
const uuid_1 = require("uuid");
const policyEngine = new PolicyEngine_js_1.PolicyEngine();
const telemetryLayer = new TelemetryLayer_js_1.TelemetryLayer('governance_events.jsonl');
exports.governance = {
    // Config
    loadPolicies: (policies) => policyEngine.loadPolicies(policies),
    // Core API
    check: (context) => {
        const decision = policyEngine.check(context);
        // Auto-log policy decisions? Maybe only violations?
        // Let's log violations
        if (decision.action !== 'ALLOW') {
            telemetryLayer.logEvent({
                id: (0, uuid_1.v4)(),
                kind: 'policy_violation',
                runId: context.metadata?.runId || 'unknown',
                tenantId: context.tenantId,
                timestamp: new Date().toISOString(),
                details: {
                    context,
                    decision
                }
            });
        }
        return decision;
    },
    logEvent: async (event) => {
        await telemetryLayer.logEvent({
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            ...event
        });
    },
    // Helpers
    getGraphStats: () => telemetryLayer.getGraphStats(),
    getTrace: (runId) => telemetryLayer.getTrace(runId)
};
__exportStar(require("./types.js"), exports);
__exportStar(require("./war-plan/index.js"), exports);
