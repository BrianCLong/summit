"use strict";
/**
 * Base calculator for geopolitical indicators
 * @module @intelgraph/geopolitical-analysis/calculators/base
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCalculator = void 0;
const scoring_js_1 = require("../utils/scoring.js");
/**
 * Base class for all indicator calculators
 */
class BaseCalculator {
    /**
     * Validate input data
     */
    validateInput(input) {
        if (!input.countryCode || input.countryCode.length !== 2 && input.countryCode.length !== 3) {
            throw new Error('Invalid country code');
        }
        if (!input.countryName || input.countryName.trim().length === 0) {
            throw new Error('Country name is required');
        }
    }
    /**
     * Create base indicator properties
     */
    createBase(input, score, metadata = {}) {
        const riskLevel = (0, scoring_js_1.scoreToRiskLevel)(score);
        const confidence = this.calculateConfidenceLevel(input, metadata);
        return {
            id: this.generateId(input),
            countryCode: input.countryCode,
            countryName: input.countryName,
            timestamp: input.timestamp || new Date(),
            score,
            riskLevel,
            confidence,
            metadata: {
                ...metadata,
                calculatedAt: new Date().toISOString(),
                calculatorVersion: '1.0.0',
            },
        };
    }
    /**
     * Generate unique identifier for indicator
     */
    generateId(input) {
        const timestamp = (input.timestamp || new Date()).getTime();
        const random = Math.random().toString(36).substring(2, 9);
        return `${input.countryCode.toLowerCase()}-${timestamp}-${random}`;
    }
    /**
     * Calculate confidence level based on input data quality
     */
    calculateConfidenceLevel(input, metadata) {
        // Default confidence calculation
        // Can be overridden by specific calculators
        const dataRecency = metadata.dataRecencyDays || 30;
        const sourceReliability = metadata.sourceReliability || 70;
        const dataCompleteness = this.assessDataCompleteness(input);
        const expertConsensus = metadata.expertConsensus || 60;
        return (0, scoring_js_1.calculateConfidence)({
            dataRecency,
            sourceReliability,
            dataCompleteness,
            expertConsensus,
        });
    }
    /**
     * Assess completeness of input data
     */
    assessDataCompleteness(input) {
        const requiredFields = this.getRequiredFields();
        const providedFields = Object.keys(input).filter((key) => input[key] !== null && input[key] !== undefined);
        const completeness = (providedFields.length / (requiredFields.length + 2)) * 100; // +2 for country code and name
        return Math.min(100, completeness);
    }
    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    /**
     * Check if value is within valid range
     */
    isValidRange(value, min, max) {
        return value >= min && value <= max;
    }
}
exports.BaseCalculator = BaseCalculator;
