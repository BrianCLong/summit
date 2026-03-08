"use strict";
/**
 * GraphQL Resolvers for Predictive Integrity Shield
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrityResolvers = void 0;
const IntegrityShield_js_1 = require("../IntegrityShield.js");
let shield = null;
function getShield() {
    if (!shield) {
        shield = (0, IntegrityShield_js_1.createIntegrityShield)();
    }
    return shield;
}
exports.integrityResolvers = {
    Query: {
        getIntegrityStatus: () => {
            return getShield().getStatus();
        },
        checkDrift: async (_parent, args) => {
            const s = getShield();
            const report = await s.runFullCheck();
            return report.driftMetrics.filter((m) => args.modelId === 'all' || m.modelId === args.modelId);
        },
        analyzeBias: async (_parent, args) => {
            const s = getShield();
            const report = await s.runFullCheck();
            let indicators = report.biasIndicators;
            if (args.dimensions) {
                indicators = indicators.filter((i) => args.dimensions.includes(i.dimension));
            }
            return indicators;
        },
        getReliabilityScore: async (_parent, args) => {
            const s = getShield();
            const reports = s.getRecentReports(50);
            const modelReports = reports.filter((r) => r.modelId === args.modelId || args.modelId === 'all');
            if (modelReports.length === 0)
                return 1.0;
            return (modelReports.reduce((sum, r) => sum + r.reliabilityScore, 0) /
                modelReports.length);
        },
        getRecentAlerts: (_parent, args) => {
            const s = getShield();
            let reports = s.getRecentReports(args.count || 20);
            if (args.severity === 'high') {
                reports = reports.filter((r) => r.reliabilityScore < 0.5);
            }
            else if (args.severity === 'medium') {
                reports = reports.filter((r) => r.reliabilityScore >= 0.5 && r.reliabilityScore < 0.7);
            }
            return reports;
        },
    },
    Mutation: {
        enableShield: (_parent, args) => {
            shield = (0, IntegrityShield_js_1.createIntegrityShield)(args.config);
            return getShield().getStatus();
        },
        runIntegrityCheck: async (_parent, args) => {
            const s = getShield();
            return s.checkPrediction(args.prediction);
        },
        triggerSelfHeal: async (_parent, args) => {
            const s = getShield();
            const reports = s.getRecentReports(100);
            const report = reports.find((r) => r.id === args.reportId);
            if (!report) {
                throw new Error(`Report not found: ${args.reportId}`);
            }
            const actions = await s.triggerSelfHeal(report);
            return {
                success: true,
                actions,
            };
        },
        clearHistory: () => {
            getShield().clearHistory();
            return true;
        },
    },
};
exports.default = exports.integrityResolvers;
