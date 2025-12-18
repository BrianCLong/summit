/**
 * Food Security Risk Calculator
 * @module @summit/geopolitical-analysis/calculators/food-security
 */

import { FoodSecurityIndicator } from '../types/index.js';
import { BaseCalculator, IndicatorInput } from './base.js';
import { weightedAverage, normalize } from '../utils/scoring.js';

/**
 * Input for food security calculation
 */
export interface FoodSecurityInput extends IndicatorInput {
  grainReservesDays: number; // days of consumption in reserves
  foodPriceInflation: number; // annual percentage
  importDependence: number; // 0-100 percentage
  agriculturalProduction: number; // index, 100 = baseline
  supplyChainDisruption: number; // 0-100 severity
}

/**
 * Calculator for food security indicators
 */
export class FoodSecurityCalculator extends BaseCalculator<FoodSecurityIndicator> {
  /**
   * Calculate food security indicator
   */
  calculate(input: FoodSecurityInput): FoodSecurityIndicator {
    this.validateInput(input);
    this.validateFoodSecurityInput(input);

    // Calculate component risk scores
    const reserveRisk = normalize(input.grainReservesDays, 0, 180, true); // Lower reserves = higher risk
    const priceRisk = normalize(Math.abs(input.foodPriceInflation), 0, 50, false); // Higher inflation = higher risk
    const importRisk = input.importDependence; // Already 0-100
    const productionRisk = normalize(input.agriculturalProduction, 50, 150, true); // Lower production = higher risk
    const supplyChainRisk = input.supplyChainDisruption; // Already 0-100

    // Calculate social unrest risk based on food insecurity
    const socialUnrestRisk = this.calculateSocialUnrestRisk(
      reserveRisk,
      priceRisk,
      input.importDependence
    );

    // Overall food security risk (higher = more at risk)
    const overallRisk = weightedAverage([
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
  private calculateSocialUnrestRisk(
    reserveRisk: number,
    priceRisk: number,
    importDependence: number
  ): number {
    // Higher food insecurity increases unrest risk
    // Import dependence amplifies the effect
    const baseUnrestRisk = weightedAverage([
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
  private validateFoodSecurityInput(input: FoodSecurityInput): void {
    if (input.grainReservesDays < 0 || input.grainReservesDays > 1000) {
      throw new Error(
        `grainReservesDays must be between 0 and 1000, got ${input.grainReservesDays}`
      );
    }

    if (Math.abs(input.foodPriceInflation) > 1000) {
      throw new Error(
        `foodPriceInflation seems unrealistic: ${input.foodPriceInflation}%`
      );
    }

    if (!this.isValidRange(input.importDependence, 0, 100)) {
      throw new Error(
        `importDependence must be between 0 and 100, got ${input.importDependence}`
      );
    }

    if (input.agriculturalProduction < 0 || input.agriculturalProduction > 300) {
      throw new Error(
        `agriculturalProduction index must be between 0 and 300, got ${input.agriculturalProduction}`
      );
    }

    if (!this.isValidRange(input.supplyChainDisruption, 0, 100)) {
      throw new Error(
        `supplyChainDisruption must be between 0 and 100, got ${input.supplyChainDisruption}`
      );
    }
  }

  protected getRequiredFields(): string[] {
    return [
      'grainReservesDays',
      'foodPriceInflation',
      'importDependence',
      'agriculturalProduction',
      'supplyChainDisruption',
    ];
  }
}
