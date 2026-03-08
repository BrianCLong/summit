"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickRegion = pickRegion;
function pickRegion(rs, need) {
    const healthy = rs.filter((r) => r.healthy && r.p95 <= need.maxP95);
    const scored = healthy.map((r) => ({
        r,
        s: r.costUSDPerK +
            (need.preferLowCarbon ? r.carbon * 1e-6 : 0) +
            r.p95 / 5000,
    }));
    return (scored.sort((a, b) => a.s - b.s)[0]?.r ||
        rs.sort((a, b) => a.p95 - b.p95)[0]);
}
