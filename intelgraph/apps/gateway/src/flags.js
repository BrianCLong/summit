"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flags = void 0;
exports.Flags = {
    LAC_ENFORCE: process.env.FEATURE_LAC_ENFORCE === "true",
    COPILOT_NLQ: process.env.COPILOT_NLQ === "true",
    ER_PROBABILISTIC: process.env.ER_PROBABILISTIC === "true",
    UI_TRIPANE: process.env.UI_TRIPANE === "true",
    COST_GUARD_ENFORCE: process.env.COST_GUARD_ENFORCE === "true",
    ZK_TX: process.env.FEATURE_ZK_TX === "true",
    PROV_WALLETS: process.env.FEATURE_PROV_WALLETS === "true"
};
