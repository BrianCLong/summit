"use strict";
/**
 * @deprecated This module is legacy and contains security risks.
 * Use '@intelgraph/feature-flags' instead.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlag = getFlag;
const flags = {};
/**
 * @deprecated Use @intelgraph/feature-flags
 */
function getFlag(key, ctx = {}) {
    const f = flags[key];
    if (!f)
        return false;
    // Neutralized: Rules are no longer evaluated to prevent security risks (eval).
    // If rules are present, we log a warning and return the base enabled state.
    if (f.rules && f.rules.length > 0) {
        console.warn(`[Security] Ignored rules for flag ${key} in legacy store. Migrate to @intelgraph/feature-flags.`);
    }
    return f.enabled;
}
