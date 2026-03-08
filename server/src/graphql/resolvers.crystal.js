"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrystalResolvers = exports.Subscription = exports.Mutation = exports.Query = void 0;
const session_orchestrator_js_1 = require("../crystal/session-orchestrator.js");
function toStartRunInput(args) {
    const overrides = {};
    if (args.commandOverride) {
        overrides.command = args.commandOverride;
    }
    if (typeof args.timeoutMs === 'number') {
        overrides.timeoutMs = args.timeoutMs;
    }
    if (args.environment) {
        overrides.environment = args.environment;
    }
    return {
        sessionId: args.sessionId,
        runDefinitionId: args.runDefinitionId,
        overrides: Object.keys(overrides).length ? overrides : undefined,
    };
}
function createRunLogAsyncIterator(sessionId, runId) {
    const queue = [];
    const listeners = [];
    const unsubscribe = session_orchestrator_js_1.crystalOrchestrator.subscribeToRunLogs(sessionId, runId, (event) => {
        if (listeners.length) {
            const resolve = listeners.shift();
            resolve?.({ value: event, done: false });
        }
        else {
            queue.push(event);
        }
    });
    return {
        async next() {
            if (queue.length) {
                return { value: queue.shift(), done: false };
            }
            return new Promise((resolve) => {
                listeners.push(resolve);
            });
        },
        async return() {
            unsubscribe();
            return { value: undefined, done: true };
        },
        async throw(error) {
            unsubscribe();
            throw error;
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };
}
exports.Query = {
    crystalSessions: () => session_orchestrator_js_1.crystalOrchestrator.listSessions(),
    crystalSession: (_, { id }) => session_orchestrator_js_1.crystalOrchestrator.getSession(id),
    crystalAdapters: () => session_orchestrator_js_1.crystalOrchestrator.getAdapters(),
    crystalBudgets: () => session_orchestrator_js_1.crystalOrchestrator.getCostSnapshot().budgets,
};
exports.Mutation = {
    createCrystalSession: (_, { input }) => session_orchestrator_js_1.crystalOrchestrator.createSession(input),
    startCrystalRun: (_, { input }) => session_orchestrator_js_1.crystalOrchestrator.startRun(toStartRunInput(input)),
    recordCrystalMessage: (_, { input }) => session_orchestrator_js_1.crystalOrchestrator.recordMessage(input),
    updateCrystalPanels: (_, { input }) => session_orchestrator_js_1.crystalOrchestrator.updatePanels(input),
    closeCrystalSession: (_, { sessionId }) => session_orchestrator_js_1.crystalOrchestrator.closeSession({ sessionId }),
};
exports.Subscription = {
    crystalRunLogs: {
        subscribe: (_, args) => createRunLogAsyncIterator(args.sessionId, args.runId),
    },
};
exports.CrystalResolvers = {
    Query: exports.Query,
    Mutation: exports.Mutation,
    Subscription: exports.Subscription,
};
exports.default = exports.CrystalResolvers;
