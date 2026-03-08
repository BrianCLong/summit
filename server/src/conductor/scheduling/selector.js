"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.choosePool = choosePool;
const pools_js_1 = require("./pools.js");
const federationMetrics_js_1 = require("../../metrics/federationMetrics.js");
async function choosePool(est, residency, _tenantId) {
    const pools = await (0, pools_js_1.listPools)();
    const prices = await (0, pools_js_1.currentPricing)();
    for (const p of pools)
        federationMetrics_js_1.poolInfo.labels(p.id, p.region).set(1);
    for (const id of Object.keys(prices)) {
        const c = prices[id];
        federationMetrics_js_1.poolCpuUsd.labels(id).set(Number(c.cpu_sec_usd));
        federationMetrics_js_1.poolGbUsd.labels(id).set(Number(c.gb_sec_usd));
        federationMetrics_js_1.poolEgressUsd.labels(id).set(Number(c.egress_gb_usd));
    }
    return (0, pools_js_1.pickCheapestEligible)(pools, prices, est, residency);
}
