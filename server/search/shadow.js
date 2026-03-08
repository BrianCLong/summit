"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadowQuery = shadowQuery;
const diff_js_1 = require("./util/diff.js");
async function shadowQuery(q) {
    const cur = await searchActive(q);
    const cand = await searchCandidate(q);
    const { jaccard, overlapAt10 } = (0, diff_js_1.compare)(cur.top10, cand.top10);
    metrics.shadow_overlap10.observe(overlapAt10);
    if (overlapAt10 < 0.6)
        metrics.shadow_low_overlap_total.inc();
    return cur; // serve active results, record cand
}
