/**
 * Base calculator for geopolitical indicators
 * @module @summit/geopolitical-analysis/calculators/base
 */

import {
  BaseIndicator,
  RiskLevel,
  ConfidenceLevel,
} from '../types/index.js';
import { scoreToRiskLevel, calculateConfidence } from '../utils/scoring.js';

/**
 * Input data for indicator calculation
 */
export interface IndicatorInput {
  countryCode: string;
  countryName: string;
  timestamp?: Date;
  [key: string]: unknown;
}

/**
 * Base class for all indicator calculators
 */
export abstract class BaseCalculator<T extends BaseIndicator> {
  /**
   * Calculate the indicator from input data
   */
  abstract calculate(input: IndicatorInput): T;

  /**
   * Validate input data
   */
  protected validateInput(input: IndicatorInput): void {
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
  protected createBase(
    input: IndicatorInput,
    score: number,
    metadata: Record<string, unknown> = {}
  ): Omit<BaseIndicator, 'type'> {
    const riskLevel = scoreToRiskLevel(score);
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
  protected generateId(input: IndicatorInput): string {
    const timestamp = (input.timestamp || new Date()).getTime();
    const random = Math.random().toString(36).substring(2, 9);
    return `${input.countryCode.toLowerCase()}-${timestamp}-${random}`;
  }

  /**
   * Calculate confidence level based on input data quality
   */
  protected calculateConfidenceLevel(
    input: IndicatorInput,
    metadata: Record<string, unknown>
  ): ConfidenceLevel {
    // Default confidence calculation
    // Can be overridden by specific calculators
    const dataRecency = metadata.dataRecencyDays as number || 30;
    const sourceReliability = metadata.sourceReliability as number || 70;
    const dataCompleteness = this.assessDataCompleteness(input);
    const expertConsensus = metadata.expertConsensus as number || 60;

    return calculateConfidence({
      dataRecency,
      sourceReliability,
      dataCompleteness,
      expertConsensus,
    });
  }

  /**
   * Assess completeness of input data
   */
  protected assessDataCompleteness(input: IndicatorInput): number {
    const requiredFields = this.getRequiredFields();
    const providedFields = Object.keys(input).filter(
      (key) => input[key] !== null && input[key] !== undefined
    );

    const completeness =
      (providedFields.length / (requiredFields.length + 2)) * 100; // +2 for country code and name

    return Math.min(100, completeness);
  }

  /**
   * Get list of required fields for this calculator
   */
  protected abstract getRequiredFields(): string[];

  /**
   * Clamp value between min and max
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Check if value is within valid range
   */
  protected isValidRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }
}
