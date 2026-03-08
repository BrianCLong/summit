"use strict";
/**
 * GraphQL Resolvers for Graph-Native Predictive Orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestrationResolvers = void 0;
const PredictiveOrchestrator_js_1 = require("../PredictiveOrchestrator.js");
let orchestrator = null;
function getOrchestrator() {
    if (!orchestrator) {
        orchestrator = (0, PredictiveOrchestrator_js_1.createOrchestrator)();
    }
    return orchestrator;
}
exports.orchestrationResolvers = {
    Query: {
        getBindings: (_parent, args) => {
            const o = getOrchestrator();
            if (args.nodeId) {
                return o.getBindingsForNode(args.nodeId);
            }
            return [];
        },
        getActiveFlows: () => {
            return getOrchestrator().getActiveFlows();
        },
        getPathways: (_parent, args) => {
            const o = getOrchestrator();
            let pathways = o.getAllPathways();
            if (args.activeOnly) {
                pathways = pathways.filter((p) => p.active);
            }
            return pathways;
        },
        evaluateTriggers: () => {
            return getOrchestrator().evaluateTriggers();
        },
        getOrchestrationStatus: () => {
            return getOrchestrator().getStatus();
        },
    },
    Mutation: {
        bindPrediction: (_parent, args) => {
            const o = getOrchestrator();
            return o.bindPrediction(args.nodeId, args.predictionId, args.predictionValue, args.confidence);
        },
        createFlow: (_parent, args) => {
            const o = getOrchestrator();
            return o.createFlow(args.name, args.triggerCondition, args.actions);
        },
        rewirePathway: async (_parent, args) => {
            const o = getOrchestrator();
            return o.rewirePathway(args.pathwayId, args.reason);
        },
        executeDecision: async (_parent, args) => {
            const o = getOrchestrator();
            return o.executeFlow(args.flowId);
        },
        createPathway: (_parent, args) => {
            const o = getOrchestrator();
            return o.createPathway(args.name, args.nodes, args.transitions);
        },
    },
};
exports.default = exports.orchestrationResolvers;
