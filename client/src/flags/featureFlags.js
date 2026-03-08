"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlags = exports.isFeatureEnabled = exports.getFeatureFlags = void 0;
const types_1 = require("./types");
Object.defineProperty(exports, "FeatureFlags", { enumerable: true, get: function () { return types_1.FeatureFlags; } });
/**
 * Reads feature flags from environment variables.
 * Supports both Vite (import.meta.env) and Node/Jest (process.env).
 *
 * Defaults to FALSE if not explicitly set to 'true'.
 */
const getFeatureFlags = () => {
    const getVal = (key) => {
        const envKey = `VITE_${key}`;
        // Check process.env (Node/Jest/Vite with compatibility plugin)
        try {
            if (typeof process !== 'undefined' && process.env && process.env[envKey] === 'true') {
                return true;
            }
        }
        catch {
            // ignore
        }
        // Check import.meta.env (Vite standard)
        // This is required for the client application to work in production.
        // Note: This might cause SyntaxError in CJS environments (like Jest) if not transformed.
        try {
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[envKey] === 'true') {
                return true;
            }
        }
        catch {
            // ignore
        }
        return false;
    };
    return {
        FEATURE_INVESTIGATION_UI: getVal('FEATURE_INVESTIGATION_UI'),
        FEATURE_TIMELINE_UI: getVal('FEATURE_TIMELINE_UI'),
        FEATURE_REPORT_DOWNLOAD: getVal('FEATURE_REPORT_DOWNLOAD'),
    };
};
exports.getFeatureFlags = getFeatureFlags;
const isFeatureEnabled = (flag) => {
    const flags = (0, exports.getFeatureFlags)();
    return flags[flag];
};
exports.isFeatureEnabled = isFeatureEnabled;
