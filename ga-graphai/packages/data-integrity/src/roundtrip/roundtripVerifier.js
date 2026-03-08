"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRoundtrip = verifyRoundtrip;
const canonicalizer_js_1 = require("../canonical/canonicalizer.js");
function verifyRoundtrip(bundle, options = {}) {
    const mismatches = [];
    const ids = new Set(bundle.map((item) => item.id));
    if (options.expectedCount !== undefined && bundle.length !== options.expectedCount) {
        mismatches.push(`Expected ${options.expectedCount} objects but found ${bundle.length}`);
    }
    bundle.forEach((item) => {
        const hash = (0, canonicalizer_js_1.stableHash)(item.payload);
        if (!item.payload.__hash) {
            mismatches.push(`Missing hash for ${item.id}`);
        }
        else if (item.payload.__hash !== hash) {
            mismatches.push(`Hash mismatch for ${item.id}`);
        }
        if (item.references) {
            const missingRefs = item.references.filter((ref) => !ids.has(ref));
            if (missingRefs.length > 0) {
                mismatches.push(`Missing references for ${item.id}: ${missingRefs.join(', ')}`);
            }
        }
    });
    return { ok: mismatches.length === 0, mismatches: mismatches.sort() };
}
