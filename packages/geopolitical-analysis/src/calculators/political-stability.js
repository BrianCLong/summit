"use strict";
/**
 * Political Stability Indicator Calculator
 * @module @intelgraph/geopolitical-analysis/calculators/political-stability
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoliticalStabilityCalculator = void 0;
const base_js_1 = require("./base.js");
const scoring_js_1 = require("../utils/scoring.js");
/**
 * Calculator for political stability indicators
 */
class PoliticalStabilityCalculator extends base_js_1.BaseCalculator {
    /**
     * Calculate political stability indicator
     */
    calculate(input) {
        this.validateInput(input);
        this.validatePoliticalInput(input);
        // Calculate overall stability score (inverse of risk)
        const riskScore = (0, scoring_js_1.weightedAverage)([
            { value: 100 - input.eliteCohesion, weight: 0.25 },
            { value: 100 - input.governmentEffectiveness, weight: 0.20 },
            { value: input.politicalViolenceRisk, weight: 0.25 },
            { value: 100 - input.institutionalStrength, weight: 0.15 },
            { value: input.protestActivity, weight: 0.10 },
            { value: input.electionRisk, weight: 0.05 },
        ]);
        // Overall stability is inverse of risk
        const stabilityScore = 100 - riskScore;
        const base = this.createBase(input, stabilityScore, {
            source: 'political-stability-calculator',
            dataRecencyDays: 30,
            sourceReliability: 75,
        });
        return {
            ...base,
            type: 'POLITICAL_STABILITY',
            eliteCohesion: input.eliteCohesion,
            governmentEffectiveness: input.governmentEffectiveness,
            politicalViolenceRisk: input.politicalViolenceRisk,
            institutionalStrength: input.institutionalStrength,
            protestActivity: input.protestActivity,
            electionRisk: input.electionRisk,
        };
    }
    /**
     * Validate political stability specific inputs
     */
    validatePoliticalInput(input) {
        const fields = [
            'eliteCohesion',
            'governmentEffectiveness',
            'politicalViolenceRisk',
            'institutionalStrength',
            'protestActivity',
            'electionRisk',
        ];
        for (const field of fields) {
            const value = input[field];
            if (!this.isValidRange(value, 0, 100)) {
                throw new Error(`${field} must be between 0 and 100, got ${value}`);
            }
        }
    }
    getRequiredFields() {
        return [
            'eliteCohesion',
            'governmentEffectiveness',
            'politicalViolenceRisk',
            'institutionalStrength',
            'protestActivity',
            'electionRisk',
        ];
    }
}
exports.PoliticalStabilityCalculator = PoliticalStabilityCalculator;
