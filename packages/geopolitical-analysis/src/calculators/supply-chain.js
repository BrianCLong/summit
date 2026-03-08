"use strict";
/**
 * Supply Chain Vulnerability Calculator
 * @module @intelgraph/geopolitical-analysis/calculators/supply-chain
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplyChainCalculator = void 0;
const base_js_1 = require("./base.js");
const scoring_js_1 = require("../utils/scoring.js");
/**
 * Calculator for supply chain vulnerability indicators
 */
class SupplyChainCalculator extends base_js_1.BaseCalculator {
    /**
     * Calculate supply chain vulnerability indicator
     */
    calculate(input) {
        this.validateInput(input);
        this.validateSupplyChainInput(input);
        // Calculate component risks
        const concentrationRisk = input.supplyConcentration;
        const alternativesRisk = 100 - input.alternativeSourcesAvailable; // Fewer alternatives = higher risk
        const transportRisk = input.transportationRisk;
        const geopoliticalRisk = input.geopoliticalDependency;
        // Stockpile provides buffer - calculate reserve adequacy risk
        const reserveRisk = this.calculateReserveRisk(input.stockpileDays);
        // Overall supply chain vulnerability
        const overallVulnerability = (0, scoring_js_1.weightedAverage)([
            { value: concentrationRisk, weight: 0.30 },
            { value: alternativesRisk, weight: 0.25 },
            { value: transportRisk, weight: 0.20 },
            { value: geopoliticalRisk, weight: 0.20 },
            { value: reserveRisk, weight: 0.05 },
        ]);
        const base = this.createBase(input, overallVulnerability, {
            source: 'supply-chain-calculator',
            dataRecencyDays: 60,
            sourceReliability: 75,
            resourceType: input.resourceType,
            criticalityAssessed: true,
        });
        return {
            ...base,
            type: 'SUPPLY_CHAIN',
            resourceType: input.resourceType,
            supplyConcentration: input.supplyConcentration,
            alternativeSourcesAvailable: input.alternativeSourcesAvailable,
            transportationRisk: input.transportationRisk,
            geopoliticalDependency: input.geopoliticalDependency,
            stockpileDays: input.stockpileDays,
        };
    }
    /**
     * Calculate risk from inadequate reserves
     */
    calculateReserveRisk(stockpileDays) {
        // Less than 30 days is critical
        // 30-90 days is moderate
        // 90-180 days is good
        // 180+ days is excellent
        if (stockpileDays < 30) {
            return 100;
        }
        else if (stockpileDays < 90) {
            return 75 - ((stockpileDays - 30) / 60) * 50;
        }
        else if (stockpileDays < 180) {
            return 25 - ((stockpileDays - 90) / 90) * 20;
        }
        else {
            return Math.max(0, 5 - (stockpileDays - 180) / 365 * 5);
        }
    }
    /**
     * Validate supply chain specific inputs
     */
    validateSupplyChainInput(input) {
        if (!input.resourceType || input.resourceType.trim().length === 0) {
            throw new Error('resourceType is required');
        }
        const numericFields = [
            'supplyConcentration',
            'alternativeSourcesAvailable',
            'transportationRisk',
            'geopoliticalDependency',
        ];
        for (const field of numericFields) {
            const value = input[field];
            if (!this.isValidRange(value, 0, 100)) {
                throw new Error(`${field} must be between 0 and 100, got ${value}`);
            }
        }
        if (input.stockpileDays < 0 || input.stockpileDays > 3650) {
            throw new Error(`stockpileDays must be between 0 and 3650, got ${input.stockpileDays}`);
        }
    }
    getRequiredFields() {
        return [
            'resourceType',
            'supplyConcentration',
            'alternativeSourcesAvailable',
            'transportationRisk',
            'geopoliticalDependency',
            'stockpileDays',
        ];
    }
}
exports.SupplyChainCalculator = SupplyChainCalculator;
