"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAndStoreMetrics = computeAndStoreMetrics;
const computeMetrics_1 = require("./computeMetrics");
async function computeAndStoreMetrics(store, data) {
    const divergence = (0, computeMetrics_1.computeDivergenceMetrics)(data.narrativeClaimLinks, data.asOf);
    const beliefGap = (0, computeMetrics_1.computeBeliefGapMetrics)(data.beliefClaimLinks, data.cohortId, data.asOf);
    await store.putMetrics({ divergence, beliefGap });
}
