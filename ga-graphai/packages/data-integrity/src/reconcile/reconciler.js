"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcile = reconcile;
const canonicalizer_js_1 = require("../canonical/canonicalizer.js");
function reconcile(scope, storeA, storeB, options = {}) {
    const sampleSize = options.sampleSize ?? 5;
    const seed = options.seed ?? 42;
    const deterministicIds = (ids) => ids.slice().sort();
    const sample = (ids) => {
        const sorted = deterministicIds(ids);
        const result = [];
        let cursor = seed;
        for (let i = 0; i < Math.min(sampleSize, sorted.length); i += 1) {
            cursor = (cursor * 9301 + 49297) % 233280;
            const idx = cursor % sorted.length;
            result.push(sorted[idx]);
        }
        return Array.from(new Set(result)).sort();
    };
    const missingInA = storeB.ids.filter((id) => !storeA.ids.includes(id)).sort();
    const missingInB = storeA.ids.filter((id) => !storeB.ids.includes(id)).sort();
    const checksumMismatches = [];
    if (storeA.checksums && storeB.checksums) {
        for (const id of Object.keys(storeA.checksums)) {
            if (!storeB.checksums[id])
                continue;
            if (storeA.checksums[id] !== storeB.checksums[id]) {
                checksumMismatches.push(id);
            }
        }
    }
    const stale = [];
    const sampledA = sample(storeA.ids);
    for (const id of sampledA) {
        const hashA = storeA.checksums?.[id] ?? (0, canonicalizer_js_1.stableHash)(id);
        const hashB = storeB.checksums?.[id];
        if (hashB && hashA !== hashB) {
            stale.push(id);
        }
    }
    return {
        scope,
        missingInA,
        missingInB,
        checksumMismatches: checksumMismatches.sort(),
        stale: stale.sort(),
    };
}
