/**
 * Risk Forecaster - Predictive Risk Analytics
 * Forecasting future risk levels, scenario modeling, and trend analysis
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CountryRiskProfile,
  ForecastResult,
  ScenarioAnalysis,
  StressTestResult,
  CreditRating,
  RiskCategory,
  RiskLevel,
  TrendDirection,
  CategoryRiskScores,
  ScoreHistory,
  HistoricalRiskData,
} from '../types/index.js';
import { RiskScoring } from '../scoring/RiskScoring.js';

/**
 * Forecast Model Configuration
 */
export interface ForecastConfig {
  // Time horizons (in days)
  shortTermHorizon: number;
  mediumTermHorizon: number;
  longTermHorizon: number;

  // Model parameters
  trendWeight: number;           // Weight given to historical trends
  momentumWeight: number;         // Weight given to recent momentum
  seasonalityWeight: number;      // Weight given to seasonal patterns
  externalFactorsWeight: number;  // Weight given to external factors

  // Confidence intervals
  confidenceLevel: number;        // Default: 0.95 for 95% confidence

  // Scenario analysis
  enableScenarios: boolean;
  scenarioCount: number;

  // Monte Carlo simulation
  monteCarloIterations: number;
}

/**
 * External Risk Factors
 */
export interface ExternalFactors {
  globalEconomicGrowth?: number;
  globalInterestRates?: number;
  commodityPrices?: Record<string, number>;
  regionalStability?: number;
  geopoliticalTensions?: number;
  pandemicRisk?: number;
  climateEvents?: number;
}

/**
 * Risk Forecaster Engine
 */
export class RiskForecaster {
  private readonly scoring: RiskScoring;
  private readonly config: ForecastConfig;

  constructor(
    scoring: RiskScoring,
    config: Partial<ForecastConfig> = {}
  ) {
    this.scoring = scoring;
    this.config = this.initializeConfig(config);
  }

  /**
   * Initialize forecaster configuration with defaults
   */
  private initializeConfig(config: Partial<ForecastConfig>): ForecastConfig {
    return {
      shortTermHorizon: config.shortTermHorizon || 90,
      mediumTermHorizon: config.mediumTermHorizon || 180,
      longTermHorizon: config.longTermHorizon || 365,
      trendWeight: config.trendWeight ?? 0.4,
      momentumWeight: config.momentumWeight ?? 0.3,
      seasonalityWeight: config.seasonalityWeight ?? 0.1,
      externalFactorsWeight: config.externalFactorsWeight ?? 0.2,
      confidenceLevel: config.confidenceLevel ?? 0.95,
      enableScenarios: config.enableScenarios ?? true,
      scenarioCount: config.scenarioCount ?? 3,
      monteCarloIterations: config.monteCarloIterations ?? 1000,
    };
  }

  /**
   * Generate comprehensive risk forecast
   */
  async forecastRisk(
    currentProfile: CountryRiskProfile,
    horizon: number,
    externalFactors?: ExternalFactors
  ): Promise<ForecastResult> {
    // Extract historical trends
    const trends = this.extractTrends(currentProfile.historicalData);

    // Calculate momentum
    const momentum = this.calculateMomentum(currentProfile.historicalData.scores);

    // Identify seasonal patterns
    const seasonality = this.analyzeSeasonality(currentProfile.historicalData.scores);

    // Apply external factors
    const externalImpact = this.assessExternalImpact(externalFactors || {});

    // Combine factors to forecast score
    const projectedScore = this.projectScore(
      currentProfile.overallScore,
      trends,
      momentum,
      seasonality,
      externalImpact,
      horizon
    );

    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(
      projectedScore,
      currentProfile.historicalData.scores,
      horizon
    );

    // Forecast category scores
    const categoryForecasts = this.forecastCategories(
      currentProfile.riskScores,
      trends,
      momentum,
      horizon
    );

    // Convert to rating
    const projectedRating = this.scoring.scoreToRating(projectedScore);
    const projectedRiskLevel = this.scoring.scoreToRiskLevel(projectedScore);

    // Identify key drivers
    const keyDrivers = this.identifyForecastDrivers(
      trends,
      momentum,
      externalFactors
    );

    // List assumptions
    const assumptions = this.listAssumptions(externalFactors);

    return {
      countryCode: currentProfile.countryCode,
      forecastDate: new Date(),
      horizon,
      projectedRating,
      projectedScore,
      projectedRiskLevel,
      confidence: this.calculateForecastConfidence(horizon, currentProfile.dataQuality.overall),
      confidenceInterval: confidenceInterval as [number, number],
      categoryForecasts,
      keyDrivers,
      assumptions,
      risks: this.identifyForecastRisks(trends, externalFactors),
    };
  }

  /**
   * Extract trends from historical data
   */
  private extractTrends(historicalData: HistoricalRiskData): Record<string, number> {
    const scores = historicalData.scores;
    if (scores.length < 2) {
      return { overall: 0, political: 0, economic: 0, security: 0 };
    }

    const trends: Record<string, number> = {};

    // Overall trend
    trends.overall = this.calculateLinearTrend(
      scores.map(s => s.overallScore)
    );

    // Category trends
    Object.values(RiskCategory).forEach(category => {
      trends[category] = this.calculateLinearTrend(
        scores.map(s => s.categoryScores[category] || 0)
      );
    });

    return trends;
  }

  /**
   * Calculate linear trend using least squares regression
   */
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  /**
   * Calculate momentum from recent score changes
   */
  private calculateMomentum(scores: ScoreHistory[]): number {
    if (scores.length < 3) return 0;

    // Look at last 3 data points
    const recent = scores.slice(-3);
    const changes = [];

    for (let i = 1; i < recent.length; i++) {
      changes.push(recent[i].overallScore - recent[i - 1].overallScore);
    }

    // Average change rate
    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  /**
   * Analyze seasonal patterns
   */
  private analyzeSeasonality(scores: ScoreHistory[]): number {
    if (scores.length < 12) return 0;

    // Simplified seasonality detection
    // In practice, would use more sophisticated methods like FFT
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    scores.forEach(score => {
      const month = score.date.getMonth();
      monthlyAverages[month] += score.overallScore;
      monthlyCounts[month]++;
    });

    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
      }
    }

    // Calculate variance to detect seasonality
    const mean = monthlyAverages.reduce((a, b) => a + b, 0) / 12;
    const variance = monthlyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 12;

    return Math.sqrt(variance);
  }

  /**
   * Assess impact of external factors
   */
  private assessExternalImpact(factors: ExternalFactors): number {
    let impact = 0;
    let count = 0;

    if (factors.globalEconomicGrowth !== undefined) {
      impact += this.normalizeExternalFactor(factors.globalEconomicGrowth, -5, 10);
      count++;
    }

    if (factors.regionalStability !== undefined) {
      impact += factors.regionalStability;
      count++;
    }

    if (factors.geopoliticalTensions !== undefined) {
      impact -= factors.geopoliticalTensions * 0.5;
      count++;
    }

    if (factors.pandemicRisk !== undefined) {
      impact -= factors.pandemicRisk * 0.3;
      count++;
    }

    return count > 0 ? impact / count : 0;
  }

  /**
   * Normalize external factor to -50 to +50 range
   */
  private normalizeExternalFactor(value: number, min: number, max: number): number {
    const normalized = ((value - min) / (max - min)) * 100 - 50;
    return Math.max(-50, Math.min(50, normalized));
  }

  /**
   * Project future score based on multiple factors
   */
  private projectScore(
    currentScore: number,
    trends: Record<string, number>,
    momentum: number,
    seasonality: number,
    externalImpact: number,
    horizon: number
  ): number {
    // Time decay factor (longer horizons have more uncertainty)
    const horizonDays = horizon;
    const timeFactor = horizonDays / 30; // Convert to months

    // Trend projection
    const trendProjection = trends.overall * timeFactor * this.config.trendWeight;

    // Momentum projection
    const momentumProjection = momentum * timeFactor * this.config.momentumWeight;

    // External factors projection
    const externalProjection = externalImpact * this.config.externalFactorsWeight;

    // Combine projections
    let projectedScore = currentScore +
      trendProjection +
      momentumProjection +
      externalProjection;

    // Apply mean reversion (scores tend to revert to mean over long periods)
    if (horizonDays > 180) {
      const meanScore = 60; // Typical mean
      const reversionFactor = Math.min(0.3, (horizonDays - 180) / 365 * 0.3);
      projectedScore = projectedScore * (1 - reversionFactor) + meanScore * reversionFactor;
    }

    // Clamp to valid range
    return Math.max(0, Math.min(100, projectedScore));
  }

  /**
   * Calculate confidence interval for forecast
   */
  private calculateConfidenceInterval(
    projectedScore: number,
    historicalScores: ScoreHistory[],
    horizon: number
  ): [number, number] {
    if (historicalScores.length < 2) {
      return [projectedScore - 10, projectedScore + 10];
    }

    // Calculate historical volatility
    const scores = historicalScores.map(s => s.overallScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Adjust for forecast horizon
    const horizonFactor = Math.sqrt(horizon / 30);
    const adjustedStdDev = stdDev * horizonFactor;

    // Calculate confidence interval (95% by default)
    const zScore = 1.96; // 95% confidence level
    const margin = zScore * adjustedStdDev;

    const lower = Math.max(0, projectedScore - margin);
    const upper = Math.min(100, projectedScore + margin);

    return [Math.round(lower * 10) / 10, Math.round(upper * 10) / 10];
  }

  /**
   * Forecast scores for each risk category
   */
  private forecastCategories(
    currentScores: CategoryRiskScores,
    trends: Record<string, number>,
    momentum: number,
    horizon: number
  ): Record<RiskCategory, number> {
    const forecasts: Record<RiskCategory, number> = {} as any;
    const timeFactor = horizon / 30;

    Object.values(RiskCategory).forEach(category => {
      const currentScore = currentScores[category.toLowerCase() as keyof CategoryRiskScores]?.score || 60;
      const categoryTrend = trends[category] || 0;

      const projected = currentScore +
        categoryTrend * timeFactor * 0.7 +
        momentum * timeFactor * 0.3;

      forecasts[category] = Math.max(0, Math.min(100, Math.round(projected * 10) / 10));
    });

    return forecasts;
  }

  /**
   * Calculate forecast confidence based on data quality and horizon
   */
  private calculateForecastConfidence(horizon: number, dataQuality: number): number {
    // Base confidence from data quality
    let confidence = dataQuality / 100;

    // Decay confidence with longer horizons
    const decayFactor = Math.exp(-horizon / 365);
    confidence *= (0.3 + 0.7 * decayFactor);

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Identify key drivers of forecast
   */
  private identifyForecastDrivers(
    trends: Record<string, number>,
    momentum: number,
    externalFactors?: ExternalFactors
  ): string[] {
    const drivers: string[] = [];

    if (Math.abs(trends.overall) > 0.5) {
      drivers.push(
        trends.overall > 0
          ? 'Positive historical trend'
          : 'Negative historical trend'
      );
    }

    if (Math.abs(momentum) > 1) {
      drivers.push(
        momentum > 0
          ? 'Positive momentum in recent periods'
          : 'Negative momentum in recent periods'
      );
    }

    if (externalFactors?.globalEconomicGrowth !== undefined) {
      if (externalFactors.globalEconomicGrowth > 3) {
        drivers.push('Strong global economic growth');
      } else if (externalFactors.globalEconomicGrowth < 0) {
        drivers.push('Global economic contraction');
      }
    }

    if (externalFactors?.geopoliticalTensions !== undefined && externalFactors.geopoliticalTensions > 60) {
      drivers.push('Elevated geopolitical tensions');
    }

    return drivers;
  }

  /**
   * List forecast assumptions
   */
  private listAssumptions(externalFactors?: ExternalFactors): string[] {
    const assumptions: string[] = [
      'Historical patterns continue',
      'No major unexpected shocks',
      'Policy framework remains stable',
    ];

    if (externalFactors?.globalEconomicGrowth !== undefined) {
      assumptions.push(`Global growth of ${externalFactors.globalEconomicGrowth.toFixed(1)}%`);
    }

    return assumptions;
  }

  /**
   * Identify forecast risks
   */
  private identifyForecastRisks(
    trends: Record<string, number>,
    externalFactors?: ExternalFactors
  ): string[] {
    const risks: string[] = [];

    if (trends.overall < -0.5) {
      risks.push('Deteriorating trend may continue');
    }

    if (externalFactors?.geopoliticalTensions !== undefined && externalFactors.geopoliticalTensions > 70) {
      risks.push('Geopolitical tensions could escalate');
    }

    if (externalFactors?.pandemicRisk !== undefined && externalFactors.pandemicRisk > 50) {
      risks.push('Pandemic risk remains elevated');
    }

    return risks;
  }

  /**
   * Generate scenario analysis
   */
  async generateScenarios(
    currentProfile: CountryRiskProfile,
    horizon: number
  ): Promise<ScenarioAnalysis[]> {
    const scenarios: ScenarioAnalysis[] = [];

    // Base case scenario
    const baseCase = await this.generateBaseScenario(currentProfile, horizon);
    scenarios.push(baseCase);

    // Optimistic scenario
    const optimistic = await this.generateOptimisticScenario(currentProfile, horizon);
    scenarios.push(optimistic);

    // Pessimistic scenario
    const pessimistic = await this.generatePessimisticScenario(currentProfile, horizon);
    scenarios.push(pessimistic);

    // Stress scenario (if enabled)
    if (this.config.scenarioCount > 3) {
      const stress = await this.generateStressScenario(currentProfile, horizon);
      scenarios.push(stress);
    }

    return scenarios;
  }

  /**
   * Generate base case scenario
   */
  private async generateBaseScenario(
    profile: CountryRiskProfile,
    horizon: number
  ): Promise<ScenarioAnalysis> {
    const forecast = await this.forecastRisk(profile, horizon);

    return {
      id: uuidv4(),
      name: 'Base Case',
      description: 'Most likely scenario based on current trends',
      probability: 0.5,
      projectedRating: forecast.projectedRating,
      projectedScore: forecast.projectedScore,
      impactByCategory: forecast.categoryForecasts,
      scenario: 'Current trends continue with normal volatility',
      triggers: ['Continuation of current policies', 'Stable external environment'],
      timeline: `${horizon} days`,
      implications: [
        'Rating remains stable',
        'Gradual evolution of risk profile',
      ],
    };
  }

  /**
   * Generate optimistic scenario
   */
  private async generateOptimisticScenario(
    profile: CountryRiskProfile,
    horizon: number
  ): Promise<ScenarioAnalysis> {
    const externalFactors: ExternalFactors = {
      globalEconomicGrowth: 5,
      regionalStability: 85,
      geopoliticalTensions: 20,
    };

    const forecast = await this.forecastRisk(profile, horizon, externalFactors);
    const boostedScore = Math.min(100, forecast.projectedScore + 10);

    return {
      id: uuidv4(),
      name: 'Optimistic',
      description: 'Favorable developments across multiple dimensions',
      probability: 0.25,
      projectedRating: this.scoring.scoreToRating(boostedScore),
      projectedScore: boostedScore,
      impactByCategory: this.boostCategoryScores(forecast.categoryForecasts, 10),
      scenario: 'Strong economic growth, successful reforms, improved stability',
      triggers: [
        'Successful policy reforms',
        'Strong global economic recovery',
        'Improved regional stability',
      ],
      timeline: `${horizon} days`,
      implications: [
        'Potential rating upgrade',
        'Improved investor confidence',
        'Lower borrowing costs',
      ],
    };
  }

  /**
   * Generate pessimistic scenario
   */
  private async generatePessimisticScenario(
    profile: CountryRiskProfile,
    horizon: number
  ): Promise<ScenarioAnalysis> {
    const externalFactors: ExternalFactors = {
      globalEconomicGrowth: -2,
      regionalStability: 40,
      geopoliticalTensions: 80,
    };

    const forecast = await this.forecastRisk(profile, horizon, externalFactors);
    const reducedScore = Math.max(0, forecast.projectedScore - 15);

    return {
      id: uuidv4(),
      name: 'Pessimistic',
      description: 'Adverse developments and increased risks',
      probability: 0.2,
      projectedRating: this.scoring.scoreToRating(reducedScore),
      projectedScore: reducedScore,
      impactByCategory: this.boostCategoryScores(forecast.categoryForecasts, -15),
      scenario: 'Economic downturn, political instability, regional tensions',
      triggers: [
        'Global economic recession',
        'Political crisis',
        'Regional conflict escalation',
      ],
      timeline: `${horizon} days`,
      implications: [
        'Potential rating downgrade',
        'Increased borrowing costs',
        'Capital outflows',
      ],
    };
  }

  /**
   * Generate stress scenario
   */
  private async generateStressScenario(
    profile: CountryRiskProfile,
    horizon: number
  ): Promise<ScenarioAnalysis> {
    const reducedScore = Math.max(0, profile.overallScore - 25);

    return {
      id: uuidv4(),
      name: 'Severe Stress',
      description: 'Extreme adverse scenario with multiple shocks',
      probability: 0.05,
      projectedRating: this.scoring.scoreToRating(reducedScore),
      projectedScore: reducedScore,
      impactByCategory: this.boostCategoryScores(
        this.forecastCategories(profile.riskScores, {}, 0, horizon),
        -25
      ),
      scenario: 'Multiple simultaneous crises',
      triggers: [
        'Severe economic crisis',
        'Political collapse',
        'Major security incident',
      ],
      timeline: `${horizon} days`,
      implications: [
        'Significant rating downgrade',
        'Potential default risk',
        'Economic crisis',
      ],
    };
  }

  /**
   * Boost or reduce category scores uniformly
   */
  private boostCategoryScores(
    scores: Record<RiskCategory, number>,
    adjustment: number
  ): Record<RiskCategory, number> {
    const adjusted: Record<RiskCategory, number> = {} as any;

    Object.entries(scores).forEach(([category, score]) => {
      adjusted[category as RiskCategory] = Math.max(0, Math.min(100, score + adjustment));
    });

    return adjusted;
  }

  /**
   * Perform stress testing
   */
  async stressTest(
    profile: CountryRiskProfile,
    scenario: string,
    severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME'
  ): Promise<StressTestResult> {
    const severityImpact = {
      MILD: -5,
      MODERATE: -10,
      SEVERE: -20,
      EXTREME: -30,
    };

    const impact = severityImpact[severity];
    const stressedScore = Math.max(0, profile.overallScore + impact);
    const stressedRating = this.scoring.scoreToRating(stressedScore);

    const categoryImpacts: Record<RiskCategory, number> = {} as any;
    Object.values(RiskCategory).forEach(category => {
      const baseScore = profile.riskScores[category.toLowerCase() as keyof CategoryRiskScores]?.score || 60;
      categoryImpacts[category] = Math.max(0, baseScore + impact);
    });

    return {
      scenario,
      severity,
      baselineScore: profile.overallScore,
      stressedScore,
      scoreDelta: impact,
      baselineRating: profile.overallRating,
      stressedRating,
      ratingDelta: this.scoring.calculateNotchDifference(profile.overallRating, stressedRating),
      categoryImpacts,
      vulnerabilities: this.identifyVulnerabilities(profile),
      resilience: this.calculateResilience(profile, stressedScore),
      recoveryTime: this.estimateRecoveryTime(severity),
    };
  }

  /**
   * Identify vulnerabilities
   */
  private identifyVulnerabilities(profile: CountryRiskProfile): string[] {
    const vulnerabilities: string[] = [];

    Object.entries(profile.riskScores).forEach(([category, score]) => {
      if (score.score < 50) {
        vulnerabilities.push(`Low ${category} score`);
      }
    });

    return vulnerabilities;
  }

  /**
   * Calculate resilience score
   */
  private calculateResilience(profile: CountryRiskProfile, stressedScore: number): number {
    const scoreDrop = profile.overallScore - stressedScore;
    if (scoreDrop === 0) return 100;

    // Higher resilience if the drop is smaller relative to the stress
    const resilience = Math.max(0, 100 - (scoreDrop * 3));
    return Math.round(resilience);
  }

  /**
   * Estimate recovery time
   */
  private estimateRecoveryTime(severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME'): number {
    const recoveryDays = {
      MILD: 90,
      MODERATE: 180,
      SEVERE: 365,
      EXTREME: 730,
    };

    return recoveryDays[severity];
  }

  /**
   * Perform Monte Carlo simulation for risk forecasting
   */
  async monteCarloSimulation(
    profile: CountryRiskProfile,
    horizon: number,
    iterations: number = this.config.monteCarloIterations
  ): Promise<{
    mean: number;
    median: number;
    stdDev: number;
    percentiles: Record<number, number>;
    distribution: number[];
  }> {
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Generate random external factors
      const factors = this.generateRandomFactors();

      // Forecast with random factors
      const forecast = await this.forecastRisk(profile, horizon, factors);
      results.push(forecast.projectedScore);
    }

    // Sort results
    results.sort((a, b) => a - b);

    // Calculate statistics
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const median = results[Math.floor(results.length / 2)];

    const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);

    const percentiles: Record<number, number> = {
      5: results[Math.floor(results.length * 0.05)],
      10: results[Math.floor(results.length * 0.10)],
      25: results[Math.floor(results.length * 0.25)],
      50: median,
      75: results[Math.floor(results.length * 0.75)],
      90: results[Math.floor(results.length * 0.90)],
      95: results[Math.floor(results.length * 0.95)],
    };

    return {
      mean: Math.round(mean * 10) / 10,
      median: Math.round(median * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      percentiles,
      distribution: results,
    };
  }

  /**
   * Generate random external factors for Monte Carlo
   */
  private generateRandomFactors(): ExternalFactors {
    return {
      globalEconomicGrowth: this.randomNormal(2.5, 2),
      regionalStability: this.randomNormal(65, 15),
      geopoliticalTensions: this.randomNormal(50, 20),
      pandemicRisk: this.randomNormal(30, 15),
    };
  }

  /**
   * Generate random number from normal distribution
   */
  private randomNormal(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }
}
