"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dpEngine = exports.DifferentialPrivacyEngine = void 0;
const logger_js_1 = require("../../config/logger.js");
/**
 * Core Differential Privacy Engine (Task #101).
 * Implements Laplace noise injection for privacy-preserving analytics.
 */
class DifferentialPrivacyEngine {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DifferentialPrivacyEngine.instance) {
            DifferentialPrivacyEngine.instance = new DifferentialPrivacyEngine();
        }
        return DifferentialPrivacyEngine.instance;
    }
    /**
     * Generates Laplace noise based on epsilon and sensitivity.
     */
    generateLaplaceNoise(epsilon, sensitivity) {
        const scale = sensitivity / epsilon;
        const u = Math.random() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
    /**
     * Applies DP to a numeric aggregate (e.g. count, sum).
     */
    privatizeAggregate(value, config = {}) {
        const epsilon = config.epsilon || 0.1; // Stricter default
        const sensitivity = config.sensitivity || 1.0; // Assume unit sensitivity for counts
        const noise = this.generateLaplaceNoise(epsilon, sensitivity);
        const privatizedValue = value + noise;
        logger_js_1.logger.debug({ original: value, privatized: privatizedValue, epsilon }, 'DP: Aggregate privatized');
        // Ensure counts don't go negative
        return Math.max(0, privatizedValue);
    }
    /**
     * K-Anonymity check for small buckets.
     */
    enforceKAnonymity(count, k = 5) {
        if (count < k) {
            logger_js_1.logger.warn({ count, k }, 'DP: Bucket size below K threshold, suppressing');
            return null;
        }
        return count;
    }
}
exports.DifferentialPrivacyEngine = DifferentialPrivacyEngine;
exports.dpEngine = DifferentialPrivacyEngine.getInstance();
