/**
 * Supply Chain Vulnerability Calculator
 * @module @summit/geopolitical-analysis/calculators/supply-chain
 */

import { SupplyChainIndicator } from '../types/index.js';
import { BaseCalculator, IndicatorInput } from './base.js';
import { weightedAverage } from '../utils/scoring.js';

/**
 * Input for supply chain vulnerability calculation
 */
export interface SupplyChainInput extends IndicatorInput {
  resourceType: string; // e.g., 'lithium', 'rare-earths', 'oil'
  supplyConcentration: number; // 0-100, Herfindahl index normalized
  alternativeSourcesAvailable: number; // 0-100
  transportationRisk: number; // 0-100
  geopoliticalDependency: number; // 0-100
  stockpileDays: number; // days of consumption in reserve
}

/**
 * Calculator for supply chain vulnerability indicators
 */
export class SupplyChainCalculator extends BaseCalculator<SupplyChainIndicator> {
  /**
   * Calculate supply chain vulnerability indicator
   */
  calculate(input: SupplyChainInput): SupplyChainIndicator {
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
    const overallVulnerability = weightedAverage([
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
  private calculateReserveRisk(stockpileDays: number): number {
    // Less than 30 days is critical
    // 30-90 days is moderate
    // 90-180 days is good
    // 180+ days is excellent
    if (stockpileDays < 30) {
      return 100;
    } else if (stockpileDays < 90) {
      return 75 - ((stockpileDays - 30) / 60) * 50;
    } else if (stockpileDays < 180) {
      return 25 - ((stockpileDays - 90) / 90) * 20;
    } else {
      return Math.max(0, 5 - (stockpileDays - 180) / 365 * 5);
    }
  }

  /**
   * Validate supply chain specific inputs
   */
  private validateSupplyChainInput(input: SupplyChainInput): void {
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
      const value = input[field] as number;
      if (!this.isValidRange(value, 0, 100)) {
        throw new Error(`${field} must be between 0 and 100, got ${value}`);
      }
    }

    if (input.stockpileDays < 0 || input.stockpileDays > 3650) {
      throw new Error(
        `stockpileDays must be between 0 and 3650, got ${input.stockpileDays}`
      );
    }
  }

  protected getRequiredFields(): string[] {
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
