"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldShadowSample = shouldShadowSample;
exports.chooseStrategy = chooseStrategy;
const crypto_1 = __importDefault(require("crypto"));
function shouldShadowSample(runId, percent) {
    const h = crypto_1.default.createHash('sha256').update(runId).digest();
    return h[0] % 100 < percent;
}
function chooseStrategy(strategy) {
    const s = strategy || { mode: 'standard' };
    if (s.mode === 'shadow')
        return { shadow: true, run: 'candidate', baseline: s.shadowOf };
    if (s.mode === 'canary')
        return {
            canary: true,
            trafficPct: s.canary.trafficPercent,
            baseline: s.canary.baseline,
            rollbackOn: s.canary.rollbackOn,
        };
    return { standard: true };
}
