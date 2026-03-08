"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.differentialPrivacyService = exports.DifferentialPrivacyService = void 0;
const logger_js_1 = require("../config/logger.js");
/**
 * Service for applying Differential Privacy to query results.
 * Essential for Sovereign Mesh Queries (Task #113).
 */
class DifferentialPrivacyService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DifferentialPrivacyService.instance) {
            DifferentialPrivacyService.instance = new DifferentialPrivacyService();
        }
        return DifferentialPrivacyService.instance;
    }
    /**
     * Adds Laplace noise to a numerical result.
     * Mechanism: result + Laplace(sensitivity / epsilon)
     */
    addLaplaceNoise(value, config = { epsilon: 1.0, sensitivity: 1.0 }) {
        const scale = config.sensitivity / config.epsilon;
        const u = Math.random() - 0.5;
        const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
        logger_js_1.logger.debug({ value, noise, epsilon: config.epsilon }, 'DP: Applied Laplace noise');
        return value + noise;
    }
    /**
     * Guards a result set by applying DP to aggregates or redaction to identifiers.
     * For Phase 6, we focus on Aggregate queries (COUNT, AVG).
     */
    guardResult(result, queryType) {
        if (queryType === 'AGGREGATE' && typeof result.value === 'number') {
            return {
                ...result,
                value: Math.round(this.addLaplaceNoise(result.value)), // Rounding for plausible counts
                isApproximation: true
            };
        }
        // For detailed queries crossing sovereign boundaries, we might redact PII
        // For now, we pass through but flag it.
        return result;
    }
}
exports.DifferentialPrivacyService = DifferentialPrivacyService;
exports.differentialPrivacyService = DifferentialPrivacyService.getInstance();
