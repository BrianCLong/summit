/**
 * Risk Scoring - Scoring Methodology and Rating Engine
 * Multi-factor scoring models, weighting algorithms, and rating scales
 */

import {
  CreditRating,
  RiskLevel,
  RiskCategory,
  CategoryRiskScores,
  RatingThresholds,
} from '../types/index.js';

/**
 * Risk Scoring Engine
 * Implements sophisticated scoring and rating methodologies
 */
export class RiskScoring {
  private readonly categoryWeights: Record<RiskCategory, number>;
  private readonly ratingThresholds: RatingThresholds;

  constructor(
    categoryWeights: Record<RiskCategory, number>,
    ratingThresholds: RatingThresholds
  ) {
    this.categoryWeights = categoryWeights;
    this.ratingThresholds = ratingThresholds;
    this.validateWeights();
  }

  /**
   * Validate that category weights sum to 1.0
   */
  private validateWeights(): void {
    const sum = Object.values(this.categoryWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error(`Category weights must sum to 1.0, got ${sum}`);
    }
  }

  /**
   * Calculate overall risk score using weighted average
   */
  calculateOverallScore(categoryScores: CategoryRiskScores): number {
    let weightedSum = 0;

    Object.values(categoryScores).forEach((riskScore) => {
      const weight = this.categoryWeights[riskScore.category];
      weightedSum += riskScore.score * weight;
    });

    return Math.round(weightedSum * 10) / 10;
  }

  /**
   * Calculate overall score with custom weights
   */
  calculateWeightedScore(
    categoryScores: CategoryRiskScores,
    customWeights: Partial<Record<RiskCategory, number>>
  ): number {
    const mergedWeights = { ...this.categoryWeights, ...customWeights };
    let weightedSum = 0;

    Object.values(categoryScores).forEach((riskScore) => {
      const weight = mergedWeights[riskScore.category] || 0;
      weightedSum += riskScore.score * weight;
    });

    return Math.round(weightedSum * 10) / 10;
  }

  /**
   * Convert numeric score to credit rating
   */
  scoreToRating(score: number): CreditRating {
    if (score >= this.ratingThresholds.AAA) return CreditRating.AAA;
    if (score >= this.ratingThresholds.AA + 2.5) return CreditRating.AA_PLUS;
    if (score >= this.ratingThresholds.AA) return CreditRating.AA;
    if (score >= this.ratingThresholds.AA - 2.5) return CreditRating.AA_MINUS;

    if (score >= this.ratingThresholds.A + 2.5) return CreditRating.A_PLUS;
    if (score >= this.ratingThresholds.A) return CreditRating.A;
    if (score >= this.ratingThresholds.A - 2.5) return CreditRating.A_MINUS;

    if (score >= this.ratingThresholds.BBB + 2.5) return CreditRating.BBB_PLUS;
    if (score >= this.ratingThresholds.BBB) return CreditRating.BBB;
    if (score >= this.ratingThresholds.BBB - 2.5) return CreditRating.BBB_MINUS;

    if (score >= this.ratingThresholds.BB + 2.5) return CreditRating.BB_PLUS;
    if (score >= this.ratingThresholds.BB) return CreditRating.BB;
    if (score >= this.ratingThresholds.BB - 2.5) return CreditRating.BB_MINUS;

    if (score >= this.ratingThresholds.B + 2.5) return CreditRating.B_PLUS;
    if (score >= this.ratingThresholds.B) return CreditRating.B;
    if (score >= this.ratingThresholds.B - 2.5) return CreditRating.B_MINUS;

    if (score >= this.ratingThresholds.CCC + 2.5) return CreditRating.CCC_PLUS;
    if (score >= this.ratingThresholds.CCC) return CreditRating.CCC;
    if (score >= this.ratingThresholds.CCC - 2.5) return CreditRating.CCC_MINUS;

    if (score >= this.ratingThresholds.CC) return CreditRating.CC;
    if (score >= this.ratingThresholds.C) return CreditRating.C;

    return CreditRating.D;
  }

  /**
   * Convert credit rating to numeric score (midpoint)
   */
  ratingToScore(rating: CreditRating): number {
    const ratingMap: Record<CreditRating, number> = {
      [CreditRating.AAA]: 97.5,
      [CreditRating.AA_PLUS]: 87.5,
      [CreditRating.AA]: 85,
      [CreditRating.AA_MINUS]: 82.5,
      [CreditRating.A_PLUS]: 77.5,
      [CreditRating.A]: 75,
      [CreditRating.A_MINUS]: 72.5,
      [CreditRating.BBB_PLUS]: 67.5,
      [CreditRating.BBB]: 65,
      [CreditRating.BBB_MINUS]: 62.5,
      [CreditRating.BB_PLUS]: 57.5,
      [CreditRating.BB]: 55,
      [CreditRating.BB_MINUS]: 52.5,
      [CreditRating.B_PLUS]: 47.5,
      [CreditRating.B]: 45,
      [CreditRating.B_MINUS]: 42.5,
      [CreditRating.CCC_PLUS]: 37.5,
      [CreditRating.CCC]: 35,
      [CreditRating.CCC_MINUS]: 32.5,
      [CreditRating.CC]: 25,
      [CreditRating.C]: 15,
      [CreditRating.D]: 5,
    };

    return ratingMap[rating];
  }

  /**
   * Convert score to risk level
   */
  scoreToRiskLevel(score: number): RiskLevel {
    if (score >= 85) return RiskLevel.VERY_LOW;
    if (score >= 70) return RiskLevel.LOW;
    if (score >= 55) return RiskLevel.MODERATE;
    if (score >= 40) return RiskLevel.HIGH;
    if (score >= 25) return RiskLevel.VERY_HIGH;
    return RiskLevel.EXTREME;
  }

  /**
   * Convert risk level to score range
   */
  riskLevelToScoreRange(riskLevel: RiskLevel): [number, number] {
    const ranges: Record<RiskLevel, [number, number]> = {
      [RiskLevel.VERY_LOW]: [85, 100],
      [RiskLevel.LOW]: [70, 85],
      [RiskLevel.MODERATE]: [55, 70],
      [RiskLevel.HIGH]: [40, 55],
      [RiskLevel.VERY_HIGH]: [25, 40],
      [RiskLevel.EXTREME]: [0, 25],
    };

    return ranges[riskLevel];
  }

  /**
   * Check if rating is investment grade
   */
  isInvestmentGrade(rating: CreditRating): boolean {
    const investmentGradeRatings = [
      CreditRating.AAA,
      CreditRating.AA_PLUS,
      CreditRating.AA,
      CreditRating.AA_MINUS,
      CreditRating.A_PLUS,
      CreditRating.A,
      CreditRating.A_MINUS,
      CreditRating.BBB_PLUS,
      CreditRating.BBB,
      CreditRating.BBB_MINUS,
    ];

    return investmentGradeRatings.includes(rating);
  }

  /**
   * Calculate rating notch difference
   */
  calculateNotchDifference(rating1: CreditRating, rating2: CreditRating): number {
    const ratingOrder = [
      CreditRating.AAA,
      CreditRating.AA_PLUS,
      CreditRating.AA,
      CreditRating.AA_MINUS,
      CreditRating.A_PLUS,
      CreditRating.A,
      CreditRating.A_MINUS,
      CreditRating.BBB_PLUS,
      CreditRating.BBB,
      CreditRating.BBB_MINUS,
      CreditRating.BB_PLUS,
      CreditRating.BB,
      CreditRating.BB_MINUS,
      CreditRating.B_PLUS,
      CreditRating.B,
      CreditRating.B_MINUS,
      CreditRating.CCC_PLUS,
      CreditRating.CCC,
      CreditRating.CCC_MINUS,
      CreditRating.CC,
      CreditRating.C,
      CreditRating.D,
    ];

    const index1 = ratingOrder.indexOf(rating1);
    const index2 = ratingOrder.indexOf(rating2);

    return index1 - index2;
  }

  /**
   * Normalize score to 0-100 range
   */
  normalizeScore(value: number, min: number, max: number, inverse: boolean = false): number {
    if (max === min) return 50;

    const normalized = ((value - min) / (max - min)) * 100;
    const clamped = Math.max(0, Math.min(100, normalized));

    return inverse ? 100 - clamped : clamped;
  }

  /**
   * Calculate z-score (standardized score)
   */
  calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /**
   * Convert z-score to percentile
   */
  zScoreToPercentile(zScore: number): number {
    // Simplified approximation using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(zScore));
    const d = 0.3989423 * Math.exp(-zScore * zScore / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return zScore >= 0 ? (1 - probability) * 100 : probability * 100;
  }

  /**
   * Apply logarithmic scaling for highly skewed metrics
   */
  logarithmicScale(value: number, base: number = 10): number {
    if (value <= 0) return 0;
    return Math.log(value) / Math.log(base);
  }

  /**
   * Calculate composite score with non-linear weights
   */
  calculateCompositeScore(
    scores: Record<string, number>,
    weights: Record<string, number>,
    scalingFunction?: (score: number) => number
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(scores).forEach(([key, score]) => {
      const weight = weights[key] || 0;
      const scaledScore = scalingFunction ? scalingFunction(score) : score;
      weightedSum += scaledScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Apply penalty factor for specific risks
   */
  applyPenalty(baseScore: number, penaltyFactor: number): number {
    // Penalty factor: 0 = no penalty, 1 = maximum penalty
    const penalty = baseScore * penaltyFactor * 0.3; // Max 30% reduction
    return Math.max(0, baseScore - penalty);
  }

  /**
   * Apply bonus for positive factors
   */
  applyBonus(baseScore: number, bonusFactor: number): number {
    // Bonus factor: 0 = no bonus, 1 = maximum bonus
    const bonus = (100 - baseScore) * bonusFactor * 0.2; // Max 20% of remaining score
    return Math.min(100, baseScore + bonus);
  }

  /**
   * Calculate volatility-adjusted score
   */
  volatilityAdjustedScore(score: number, volatility: number): number {
    // Higher volatility reduces the score
    const adjustment = volatility * 0.15; // Max 15% reduction
    return Math.max(0, score - adjustment);
  }

  /**
   * Calculate momentum-adjusted score
   */
  momentumAdjustedScore(
    currentScore: number,
    previousScore: number,
    momentum: number
  ): number {
    const trend = currentScore - previousScore;
    const adjustment = trend * momentum * 0.1; // Max 10% adjustment
    return Math.max(0, Math.min(100, currentScore + adjustment));
  }

  /**
   * Calculate percentile rank among peers
   */
  calculatePercentileRank(score: number, peerScores: number[]): number {
    if (peerScores.length === 0) return 50;

    const sortedScores = [...peerScores].sort((a, b) => a - b);
    const position = sortedScores.filter(s => s < score).length;

    return (position / sortedScores.length) * 100;
  }

  /**
   * Calculate relative score compared to benchmark
   */
  calculateRelativeScore(score: number, benchmark: number): number {
    if (benchmark === 0) return 0;
    return ((score - benchmark) / benchmark) * 100;
  }

  /**
   * Generate rating transition matrix
   * Returns probability of transitioning from one rating to another
   */
  getRatingTransitionProbability(
    currentRating: CreditRating,
    targetRating: CreditRating,
    timeHorizon: number
  ): number {
    const notchDifference = Math.abs(this.calculateNotchDifference(currentRating, targetRating));

    // Simplified model: probability decreases with distance
    // In practice, this would be based on historical transition matrices
    const baseProb = 0.8;
    const decayFactor = 0.15;

    if (notchDifference === 0) return baseProb;

    const probability = baseProb * Math.exp(-decayFactor * notchDifference);

    // Adjust for time horizon (longer horizon = more transitions possible)
    const timeAdjustment = Math.min(1.5, 1 + (timeHorizon / 365));

    return Math.min(1, probability * timeAdjustment);
  }

  /**
   * Calculate default probability from rating
   */
  calculateDefaultProbability(rating: CreditRating, years: number = 1): number {
    // Simplified default probability curves
    // In practice, these would be based on historical default data
    const annualDefaultRates: Record<CreditRating, number> = {
      [CreditRating.AAA]: 0.0001,
      [CreditRating.AA_PLUS]: 0.0002,
      [CreditRating.AA]: 0.0003,
      [CreditRating.AA_MINUS]: 0.0005,
      [CreditRating.A_PLUS]: 0.001,
      [CreditRating.A]: 0.002,
      [CreditRating.A_MINUS]: 0.004,
      [CreditRating.BBB_PLUS]: 0.008,
      [CreditRating.BBB]: 0.015,
      [CreditRating.BBB_MINUS]: 0.03,
      [CreditRating.BB_PLUS]: 0.06,
      [CreditRating.BB]: 0.12,
      [CreditRating.BB_MINUS]: 0.20,
      [CreditRating.B_PLUS]: 0.30,
      [CreditRating.B]: 0.45,
      [CreditRating.B_MINUS]: 0.60,
      [CreditRating.CCC_PLUS]: 0.70,
      [CreditRating.CCC]: 0.80,
      [CreditRating.CCC_MINUS]: 0.85,
      [CreditRating.CC]: 0.90,
      [CreditRating.C]: 0.95,
      [CreditRating.D]: 1.0,
    };

    const annualRate = annualDefaultRates[rating];

    // Calculate cumulative default probability over multiple years
    // Using: 1 - (1 - p)^n
    return 1 - Math.pow(1 - annualRate, years);
  }

  /**
   * Calculate expected loss given rating and exposure
   */
  calculateExpectedLoss(
    rating: CreditRating,
    exposure: number,
    recoveryRate: number = 0.4,
    years: number = 1
  ): number {
    const defaultProb = this.calculateDefaultProbability(rating, years);
    const lossGivenDefault = 1 - recoveryRate;

    return exposure * defaultProb * lossGivenDefault;
  }

  /**
   * Calculate risk-adjusted return
   */
  calculateRiskAdjustedReturn(
    expectedReturn: number,
    riskScore: number,
    riskFreeRate: number = 0.03
  ): number {
    const riskPremium = (100 - riskScore) / 100;
    const requiredReturn = riskFreeRate + riskPremium * 0.15;

    return expectedReturn - requiredReturn;
  }

  /**
   * Calculate Sharpe ratio for risk-return analysis
   */
  calculateSharpeRatio(
    expectedReturn: number,
    riskFreeRate: number,
    volatility: number
  ): number {
    if (volatility === 0) return 0;
    return (expectedReturn - riskFreeRate) / volatility;
  }

  /**
   * Multi-criteria decision analysis using weighted scoring
   */
  multiCriteriaScore(
    criteria: Record<string, number>,
    weights: Record<string, number>,
    thresholds?: Record<string, number>
  ): {
    score: number;
    passedThresholds: boolean;
    criteriaScores: Record<string, number>;
  } {
    let weightedSum = 0;
    let totalWeight = 0;
    const criteriaScores: Record<string, number> = {};
    let passedThresholds = true;

    Object.entries(criteria).forEach(([key, value]) => {
      const weight = weights[key] || 0;
      criteriaScores[key] = value;
      weightedSum += value * weight;
      totalWeight += weight;

      if (thresholds && thresholds[key] !== undefined) {
        if (value < thresholds[key]) {
          passedThresholds = false;
        }
      }
    });

    return {
      score: totalWeight > 0 ? weightedSum / totalWeight : 0,
      passedThresholds,
      criteriaScores,
    };
  }

  /**
   * Get rating description
   */
  getRatingDescription(rating: CreditRating): string {
    const descriptions: Record<CreditRating, string> = {
      [CreditRating.AAA]: 'Extremely strong capacity to meet financial commitments',
      [CreditRating.AA_PLUS]: 'Very strong capacity to meet financial commitments',
      [CreditRating.AA]: 'Very strong capacity to meet financial commitments',
      [CreditRating.AA_MINUS]: 'Very strong capacity to meet financial commitments',
      [CreditRating.A_PLUS]: 'Strong capacity to meet financial commitments',
      [CreditRating.A]: 'Strong capacity to meet financial commitments',
      [CreditRating.A_MINUS]: 'Strong capacity to meet financial commitments',
      [CreditRating.BBB_PLUS]: 'Adequate capacity to meet financial commitments',
      [CreditRating.BBB]: 'Adequate capacity to meet financial commitments',
      [CreditRating.BBB_MINUS]: 'Adequate capacity to meet financial commitments',
      [CreditRating.BB_PLUS]: 'Less vulnerable in the near term but faces major uncertainties',
      [CreditRating.BB]: 'Less vulnerable in the near term but faces major uncertainties',
      [CreditRating.BB_MINUS]: 'Less vulnerable in the near term but faces major uncertainties',
      [CreditRating.B_PLUS]: 'More vulnerable but currently has capacity to meet commitments',
      [CreditRating.B]: 'More vulnerable but currently has capacity to meet commitments',
      [CreditRating.B_MINUS]: 'More vulnerable but currently has capacity to meet commitments',
      [CreditRating.CCC_PLUS]: 'Currently vulnerable and dependent on favorable conditions',
      [CreditRating.CCC]: 'Currently vulnerable and dependent on favorable conditions',
      [CreditRating.CCC_MINUS]: 'Currently vulnerable and dependent on favorable conditions',
      [CreditRating.CC]: 'Highly vulnerable; default has not yet occurred but is expected',
      [CreditRating.C]: 'Highly vulnerable; default is imminent',
      [CreditRating.D]: 'In default or bankruptcy',
    };

    return descriptions[rating];
  }
}
