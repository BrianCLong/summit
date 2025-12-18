/**
 * Political Stability Indicator Calculator
 * @module @summit/geopolitical-analysis/calculators/political-stability
 */

import { PoliticalStabilityIndicator } from '../types/index.js';
import { BaseCalculator, IndicatorInput } from './base.js';
import { weightedAverage } from '../utils/scoring.js';

/**
 * Input for political stability calculation
 */
export interface PoliticalStabilityInput extends IndicatorInput {
  eliteCohesion: number; // 0-100
  governmentEffectiveness: number; // 0-100
  politicalViolenceRisk: number; // 0-100
  institutionalStrength: number; // 0-100
  protestActivity: number; // 0-100
  electionRisk: number; // 0-100
}

/**
 * Calculator for political stability indicators
 */
export class PoliticalStabilityCalculator extends BaseCalculator<PoliticalStabilityIndicator> {
  /**
   * Calculate political stability indicator
   */
  calculate(input: PoliticalStabilityInput): PoliticalStabilityIndicator {
    this.validateInput(input);
    this.validatePoliticalInput(input);

    // Calculate overall stability score (inverse of risk)
    const riskScore = weightedAverage([
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
  private validatePoliticalInput(input: PoliticalStabilityInput): void {
    const fields = [
      'eliteCohesion',
      'governmentEffectiveness',
      'politicalViolenceRisk',
      'institutionalStrength',
      'protestActivity',
      'electionRisk',
    ];

    for (const field of fields) {
      const value = input[field] as number;
      if (!this.isValidRange(value, 0, 100)) {
        throw new Error(`${field} must be between 0 and 100, got ${value}`);
      }
    }
  }

  protected getRequiredFields(): string[] {
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
