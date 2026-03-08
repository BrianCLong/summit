"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ExperimentationService {
    experiments = new Map();
    createExperiment(exp) {
        this.experiments.set(exp.id, exp);
    }
    getAssignment(experimentId, entityId) {
        const exp = this.experiments.get(experimentId);
        if (!exp || exp.status !== 'ACTIVE')
            return null;
        // Deterministic hashing for assignment
        const hash = crypto_1.default.createHash('md5').update(`${experimentId}:${entityId}`).digest('hex');
        const val = parseInt(hash.substring(0, 8), 16) % 100; // 0-99
        let cumulative = 0;
        for (const variant of exp.variants) {
            cumulative += variant.trafficWeight;
            if (val < cumulative) {
                return { experimentId, variantId: variant.id, entityId };
            }
        }
        return null; // Should not happen if weights sum to 100
    }
    checkStopConditions(experimentId, metrics) {
        const exp = this.experiments.get(experimentId);
        if (!exp)
            return false;
        for (const [metric, threshold] of Object.entries(exp.stopConditions)) {
            if (metrics[metric] !== undefined && metrics[metric] < threshold) { // Assuming lower is worse for success rate, etc. need operator support in real impl
                // Simplified: Assume stop condition is "if value < threshold" (e.g. success rate drops)
                exp.status = 'STOPPED';
                return true;
            }
        }
        return false;
    }
}
exports.ExperimentationService = ExperimentationService;
