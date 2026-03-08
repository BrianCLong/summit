"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnsweringPolicy = void 0;
class AnsweringPolicy {
    config;
    constructor(config) {
        this.config = config;
    }
    shouldRefuse(result) {
        if (result.robustness.score < this.config.minRobustness) {
            return {
                refuse: true,
                reason: `Insufficient robustness: ${result.robustness.score.toFixed(2)} < ${this.config.minRobustness}`
            };
        }
        if (result.robustness.evidenceDiversity < this.config.minEvidenceDiversity) {
            return {
                refuse: true,
                reason: `Insufficient evidence diversity: ${result.robustness.evidenceDiversity} < ${this.config.minEvidenceDiversity}`
            };
        }
        return { refuse: false };
    }
}
exports.AnsweringPolicy = AnsweringPolicy;
