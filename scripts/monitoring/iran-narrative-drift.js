"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDrift = detectDrift;
function detectDrift(currentNarratives, historicalNarratives) {
    // Drift logic comparing taxonomy churn
    const churn = Math.abs(currentNarratives.length - historicalNarratives.length) / Math.max(1, historicalNarratives.length);
    if (churn > 0.4) {
        console.warn("ALERT: Narrative taxonomy churn > 40%");
    }
}
