"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyPreservingML = exports.PrivacyPreservingML = void 0;
const logger_js_1 = require("../../config/logger.js");
const DifferentialPrivacyEngine_js_1 = require("./DifferentialPrivacyEngine.js");
/**
 * Utility for Privacy-Preserving Machine Learning (Task #101).
 * Implements logic for adding DP noise to gradients (simulated DP-SGD).
 */
class PrivacyPreservingML {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PrivacyPreservingML.instance) {
            PrivacyPreservingML.instance = new PrivacyPreservingML();
        }
        return PrivacyPreservingML.instance;
    }
    /**
     * Applies differential privacy noise to a set of gradients.
     * This is a simulated implementation of DP-SGD gradient clipping and noise addition.
     */
    privatizeGradients(gradients, config) {
        logger_js_1.logger.info({ size: gradients.length }, 'ML-Privacy: Privatizing gradients');
        // 1. Clip gradients to bound sensitivity
        const clippedGradients = this.clipGradients(gradients, config.l2NormClip);
        // 2. Add Gaussian/Laplace noise
        const epsilon = 1.0 / config.noiseMultiplier; // Inverse relationship
        const privatized = clippedGradients.map(g => g + DifferentialPrivacyEngine_js_1.dpEngine.generateLaplaceNoise(epsilon, config.l2NormClip / config.batchSize));
        logger_js_1.logger.debug('ML-Privacy: Noise added to gradients');
        return privatized;
    }
    /**
     * Bounds the L2 norm of the gradients.
     */
    clipGradients(gradients, maxNorm) {
        const l2Norm = Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0));
        const factor = Math.min(1, maxNorm / (l2Norm + 1e-6));
        return gradients.map(g => g * factor);
    }
}
exports.PrivacyPreservingML = PrivacyPreservingML;
exports.privacyPreservingML = PrivacyPreservingML.getInstance();
