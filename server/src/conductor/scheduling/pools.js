"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPools = listPools;
exports.currentPricing = currentPricing;
exports.pickCheapestEligible = pickCheapestEligible;
exports.estimatePoolPrice = estimatePoolPrice;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const safeNum = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
const safeEst = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return n;
};
async function listPools() {
    const { rows } = await pg.query('SELECT id, region, labels, capacity FROM pool_registry');
    return rows;
}
async function currentPricing() {
    const { rows } = await pg.query('SELECT pool_id, cpu_sec_usd, gb_sec_usd, egress_gb_usd FROM pool_pricing');
    const m = {};
    for (const r of rows)
        m[r.pool_id] = r;
    return m;
}
function pickCheapestEligible(candidates, costs, est, residency) {
    let best = null;
    for (const p of candidates) {
        if (residency &&
            !p.region.toLowerCase().startsWith(residency.toLowerCase()))
            continue;
        const c = costs[p.id];
        if (!c)
            continue;
        const cpuSec = safeEst(est.cpuSec);
        const gbSec = safeEst(est.gbSec);
        const egressGb = safeEst(est.egressGb);
        const cpuUsd = safeNum(c.cpu_sec_usd);
        const gbUsd = safeNum(c.gb_sec_usd);
        const egressUsd = safeNum(c.egress_gb_usd);
        const price = cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd;
        if (!best ||
            price < best.price ||
            (price === best.price && p.id.localeCompare(best.id) < 0))
            best = { id: p.id, price };
    }
    return best;
}
function estimatePoolPrice(cost, est, discount = 1) {
    if (!cost)
        return 0;
    const cpuSec = safeEst(est.cpuSec);
    const gbSec = safeEst(est.gbSec);
    const egressGb = safeEst(est.egressGb);
    const cpuUsd = safeNum(cost.cpu_sec_usd);
    const gbUsd = safeNum(cost.gb_sec_usd);
    const egressUsd = safeNum(cost.egress_gb_usd);
    return (cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd) * discount;
}
