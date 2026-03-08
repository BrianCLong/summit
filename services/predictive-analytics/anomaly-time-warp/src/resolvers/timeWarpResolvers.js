"use strict";
/**
 * GraphQL Resolvers for Anomaly Time-Warp Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeWarpResolvers = void 0;
const TimeWarpEngine_js_1 = require("../TimeWarpEngine.js");
let engine = null;
function getEngine() {
    if (!engine) {
        engine = (0, TimeWarpEngine_js_1.createTimeWarpEngine)();
    }
    return engine;
}
exports.timeWarpResolvers = {
    Query: {
        predictAnomalies: async (_parent, args) => {
            const e = getEngine();
            if (args.horizon) {
                e.setDetectionWindow(args.horizon);
            }
            const result = await e.predictAnomalies(args.data || [], args.domain);
            return result.predictions;
        },
        getPrecursors: async (_parent, args) => {
            const e = getEngine();
            // Check if precursors already extracted
            let precursors = e.getPrecursors(args.anomalyId);
            if (precursors.length === 0 && args.historicalData) {
                const result = await e.extractPrecursors(args.anomalyId, args.historicalData);
                precursors = result.signals;
            }
            return precursors;
        },
        getWarpedTimeline: async (_parent, args) => {
            const e = getEngine();
            let timeline = e.getTimeline(args.anomalyId);
            if (!timeline) {
                const result = await e.generateWarpedTimeline(args.anomalyId);
                timeline = result.timeline;
            }
            return timeline;
        },
        planIntervention: async (_parent, args) => {
            const e = getEngine();
            return e.planIntervention(args.anomalyId);
        },
        getAllPredictions: (_parent, args) => {
            const e = getEngine();
            let predictions = e.getAllPredictions();
            if (args.minProbability !== undefined) {
                predictions = predictions.filter((p) => p.probability >= args.minProbability);
            }
            return predictions;
        },
    },
    Mutation: {
        monitorForAnomalies: async (_parent, args) => {
            const e = getEngine();
            const detectedAnomalies = [];
            await e.monitorForAnomalies(args.data, args.domain, (prediction) => {
                detectedAnomalies.push(prediction.id);
            });
            return {
                detected: detectedAnomalies.length,
                anomalyIds: detectedAnomalies,
            };
        },
        setDetectionWindow: (_parent, args) => {
            const e = getEngine();
            e.setDetectionWindow(args.windowHours);
            return true;
        },
        executeIntervention: async (_parent, args) => {
            // In production, would execute the intervention
            return {
                success: true,
                interventionId: args.interventionId,
                executedAt: new Date(),
            };
        },
        runFullAnalysis: async (_parent, args) => {
            const e = getEngine();
            return e.runFullAnalysis(args.data || [], args.domain);
        },
        clearHistory: () => {
            getEngine().clearHistory();
            return true;
        },
    },
};
exports.default = exports.timeWarpResolvers;
