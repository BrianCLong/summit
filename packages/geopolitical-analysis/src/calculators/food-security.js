"use strict";
/**
 * Food Security Risk Calculator
 * @module @intelgraph/geopolitical-analysis/calculators/food-security
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodSecurityCalculator = void 0;
const base_js_1 = require("./base.js");
const scoring_js_1 = require("../utils/scoring.js");
/**
 * Calculator for food security indicators
 */
class FoodSecurityCalculator extends base_js_1.BaseCalculator {
    /**
     * Calculate food security indicator
     */
    calculate(input) {
        this.validateInput(input);
        this.validateFoodSecurityInput(input);
        // Calculate component risk scores
        const reserveRisk = (0, scoring_js_1.normalize)(input.grainReservesDays, 0, 180, true); // Lower reserves = higher risk
        const priceRisk = (0, scoring_js_1.normalize)(Math.abs(input.foodPriceInflation), 0, 50, false); // Higher inflation = higher risk
        const importRisk = input.importDependence; // Already 0-100
        const productionRisk = (0, scoring_js_1.normalize)(input.agriculturalProduction, 50, 150, true); // Lower production = higher risk
        const supplyChainRisk = input.supplyChainDisruption; // Already 0-100
        // Calculate social unrest risk based on food insecurity
        const socialUnrestRisk = this.calculateSocialUnrestRisk(reserveRisk, priceRisk, input.importDependence);
        // Overall food security risk (higher = more at risk)
        const overallRisk = (0, scoring_js_1.weightedAverage)([
            { value: reserveRisk, weight: 0.25 },
            { value: priceRisk, weight: 0.20 },
            { value: importRisk, weight: 0.20 },
            { value: productionRisk, weight: 0.20 },
            { value: supplyChainRisk, weight: 0.15 },
        ]);
        const base = this.createBase(input, overallRisk, {
            source: 'food-security-calculator',
            dataRecencyDays: 15,
            sourceReliability: 80,
            methodology: 'weighted-composite-indicator',
        });
        return {
            ...base,
            type: 'FOOD_SECURITY',
            grainReservesDays: input.grainReservesDays,
            foodPriceInflation: input.foodPriceInflation,
            importDependence: input.importDependence,
            agriculturalProduction: input.agriculturalProduction,
            supplyChainDisruption: input.supplyChainDisruption,
            socialUnrestRisk,
        };
    }
    /**
     * Calculate social unrest risk based on food security factors
     */
    calculateSocialUnrestRisk(reserveRisk, priceRisk, importDependence) {
        // Higher food insecurity increases unrest risk
        // Import dependence amplifies the effect
        const baseUnrestRisk = (0, scoring_js_1.weightedAverage)([
            { value: reserveRisk, weight: 0.5 },
            { value: priceRisk, weight: 0.5 },
        ]);
        // Apply multiplier for high import dependence
        const dependenceMultiplier = 1 + (importDependence / 100) * 0.5;
        return Math.min(100, baseUnrestRisk * dependenceMultiplier);
    }
    /**
     * Validate food security specific inputs
     */
    validateFoodSecurityInput(input) {
        if (input.grainReservesDays < 0 || input.grainReservesDays > 1000) {
            throw new Error(`grainReservesDays must be between 0 and 1000, got ${input.grainReservesDays}`);
        }
        if (Math.abs(input.foodPriceInflation) > 1000) {
            throw new Error(`foodPriceInflation seems unrealistic: ${input.foodPriceInflation}%`);
        }
        if (!this.isValidRange(input.importDependence, 0, 100)) {
            throw new Error(`importDependence must be between 0 and 100, got ${input.importDependence}`);
        }
        if (input.agriculturalProduction < 0 || input.agriculturalProduction > 300) {
            throw new Error(`agriculturalProduction index must be between 0 and 300, got ${input.agriculturalProduction}`);
        }
        if (!this.isValidRange(input.supplyChainDisruption, 0, 100)) {
            throw new Error(`supplyChainDisruption must be between 0 and 100, got ${input.supplyChainDisruption}`);
        }
    }
    getRequiredFields() {
        return [
            'grainReservesDays',
            'foodPriceInflation',
            'importDependence',
            'agriculturalProduction',
            'supplyChainDisruption',
        ];
    }
}
exports.FoodSecurityCalculator = FoodSecurityCalculator;
