"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCogBattleApi = makeCogBattleApi;
const guards_1 = require("../governance/guards");
function makeCogBattleApi(store) {
    return {
        async topNarratives(limit = 25) {
            return store.listTopNarratives(limit);
        },
        async beliefs(limit = 25) {
            return store.listBeliefs(limit);
        },
        async divergence(narrativeId) {
            return store.listDivergence(narrativeId);
        },
        async explain(query) {
            const guard = (0, guards_1.enforceAnalyticOnly)(query);
            if (!guard.ok) {
                throw new Error(guard.reason);
            }
            return { ok: true, note: 'Explain endpoint stub (analytic only).' };
        },
    };
}
