/**
 * Risk Assessor - Main Country Risk Assessment Engine
 * Calculates comprehensive risk scores and generates risk profiles
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CountryRiskProfile,
  CategoryRiskScores,
  RiskScore,
  RiskIndicators,
  RiskCategory,
  CreditRating,
  RiskLevel,
  RatingOutlook,
  TrendDirection,
  AssessmentConfig,
  HistoricalRiskData,
  RiskTrends,
  PeerComparison,
  KeyRisk,
  Opportunity,
  DataQuality,
  DataSource,
  RiskAssessmentReport,
  DetailedAnalysis,
  CategoryAnalysis,
  RiskChangeEvent,
  RatingHistory,
  ScoreHistory,
} from '../types/index.js';
import { RiskScoring } from '../scoring/RiskScoring.js';

/**
 * Main Risk Assessment Engine
 */
export class RiskAssessor {
  private readonly scoring: RiskScoring;
  private readonly config: AssessmentConfig;
  private assessmentHistory: Map<string, CountryRiskProfile[]>;
  private changeEvents: Map<string, RiskChangeEvent[]>;

  constructor(config: Partial<AssessmentConfig> = {}) {
    this.config = this.initializeConfig(config);
    this.scoring = new RiskScoring(this.config.categoryWeights, this.config.ratingThresholds);
    this.assessmentHistory = new Map();
    this.changeEvents = new Map();
  }

  /**
   * Initialize assessment configuration with defaults
   */
  private initializeConfig(config: Partial<AssessmentConfig>): AssessmentConfig {
    return {
      categoryWeights: config.categoryWeights || {
        [RiskCategory.POLITICAL]: 0.20,
        [RiskCategory.ECONOMIC]: 0.25,
        [RiskCategory.SECURITY]: 0.15,
        [RiskCategory.REGULATORY]: 0.12,
        [RiskCategory.OPERATIONAL]: 0.10,
        [RiskCategory.SOCIAL]: 0.08,
        [RiskCategory.ENVIRONMENTAL]: 0.05,
        [RiskCategory.TECHNOLOGICAL]: 0.05,
      },
      ratingThresholds: config.ratingThresholds || {
        AAA: 95,
        AA: 85,
        A: 75,
        BBB: 65,
        BB: 55,
        B: 45,
        CCC: 35,
        CC: 25,
        C: 15,
      },
      historicalPeriod: config.historicalPeriod || 365,
      forecastHorizon: config.forecastHorizon || 180,
      confidenceThreshold: config.confidenceThreshold || 0.7,
      includePeerComparison: config.includePeerComparison ?? true,
      peerSelectionCriteria: config.peerSelectionCriteria || {
        maxPeers: 5,
      },
      includeForecasting: config.includeForecasting ?? true,
      includeScenarioAnalysis: config.includeScenarioAnalysis ?? false,
      includeStressTesting: config.includeStressTesting ?? false,
    };
  }

  /**
   * Perform comprehensive risk assessment for a country
   */
  async assessCountryRisk(
    countryCode: string,
    countryName: string,
    indicators: RiskIndicators,
    options: {
      region?: string;
      subRegion?: string;
      analyst?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<CountryRiskProfile> {
    // Calculate category scores
    const categoryScores = this.calculateCategoryScores(indicators);

    // Calculate overall score and rating
    const overallScore = this.scoring.calculateOverallScore(categoryScores);
    const overallRating = this.scoring.scoreToRating(overallScore);
    const riskLevel = this.scoring.scoreToRiskLevel(overallScore);

    // Determine outlook
    const outlook = await this.determineOutlook(countryCode, overallScore, categoryScores);

    // Get historical data
    const historicalData = this.getHistoricalData(countryCode);

    // Calculate trends
    const trends = this.calculateTrends(countryCode, categoryScores, historicalData);

    // Identify key risks and opportunities
    const keyRisks = this.identifyKeyRisks(indicators, categoryScores);
    const opportunities = this.identifyOpportunities(indicators, categoryScores);

    // Assess data quality
    const dataQuality = this.assessDataQuality(indicators);

    // Generate peer comparisons if enabled
    const peerComparisons = this.config.includePeerComparison
      ? await this.generatePeerComparisons(countryCode, overallScore, categoryScores)
      : [];

    // Create risk profile
    const riskProfile: CountryRiskProfile = {
      countryCode,
      countryName,
      region: options.region || 'Unknown',
      subRegion: options.subRegion,
      overallRating,
      overallScore,
      riskLevel,
      outlook,
      riskScores: categoryScores,
      indicators,
      assessmentDate: new Date(),
      nextReviewDate: this.calculateNextReviewDate(),
      lastModified: new Date(),
      historicalData,
      trends,
      peerComparisons,
      keyRisks,
      opportunities,
      recommendations: this.generateRecommendations(categoryScores, keyRisks),
      analyst: options.analyst,
      confidence: this.calculateConfidence(dataQuality, indicators),
      dataQuality,
      sources: this.extractDataSources(indicators),
      metadata: options.metadata || {},
    };

    // Store in history
    this.storeAssessment(countryCode, riskProfile);

    // Check for significant changes
    await this.checkForSignificantChanges(countryCode, riskProfile);

    return riskProfile;
  }

  /**
   * Calculate risk scores for all categories
   */
  private calculateCategoryScores(indicators: RiskIndicators): CategoryRiskScores {
    const scores: CategoryRiskScores = {
      political: this.calculatePoliticalScore(indicators.political),
      economic: this.calculateEconomicScore(indicators.economic),
      security: this.calculateSecurityScore(indicators.security),
      regulatory: this.calculateRegulatoryScore(indicators.regulatory),
      operational: this.calculateOperationalScore(indicators.operational),
      social: this.calculateSocialScore(indicators.social),
      environmental: this.calculateEnvironmentalScore(indicators.environmental),
      technological: this.calculateTechnologicalScore(indicators.technological),
    };

    return scores;
  }

  /**
   * Calculate political risk score
   */
  private calculatePoliticalScore(indicators: any): RiskScore {
    const subScores = {
      stability: (indicators.governmentStability + indicators.institutionalStrength) / 2,
      governance: (indicators.ruleOfLaw + indicators.corruptionIndex + indicators.transparencyScore) / 3,
      leadership: (indicators.leadershipStability + indicators.policyConsistency) / 2,
      international: (indicators.diplomaticStanding + (100 - indicators.conflictRisk) + (100 - indicators.sanctionsRisk)) / 3,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.POLITICAL,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.POLITICAL],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: this.identifyPoliticalDrivers(indicators),
      concerns: this.identifyPoliticalConcerns(indicators),
      lastUpdated: new Date(),
      confidence: 0.85,
    };
  }

  /**
   * Calculate economic risk score
   */
  private calculateEconomicScore(indicators: any): RiskScore {
    const subScores = {
      growth: this.normalizeGDPGrowth(indicators.gdpGrowth),
      stability: this.calculateMacroStability(indicators),
      debt: this.calculateDebtScore(indicators),
      external: this.calculateExternalPositionScore(indicators),
      financial: indicators.bankingSystemStrength,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.ECONOMIC,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.ECONOMIC],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: this.identifyEconomicDrivers(indicators),
      concerns: this.identifyEconomicConcerns(indicators),
      lastUpdated: new Date(),
      confidence: 0.9,
    };
  }

  /**
   * Calculate security risk score
   */
  private calculateSecurityScore(indicators: any): RiskScore {
    const subScores = {
      conflict: 100 - indicators.conflictIntensity,
      terrorism: 100 - indicators.terrorismThreat,
      unrest: 100 - indicators.civilUnrest,
      crime: 100 - indicators.criminalityRate,
      regional: indicators.regionalStability,
      cyber: 100 - indicators.cyberSecurityRisk,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.SECURITY,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.SECURITY],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: this.identifySecurityDrivers(indicators),
      concerns: this.identifySecurityConcerns(indicators),
      lastUpdated: new Date(),
      confidence: 0.8,
    };
  }

  /**
   * Calculate regulatory risk score
   */
  private calculateRegulatoryScore(indicators: any): RiskScore {
    const subScores = {
      legal: (indicators.legalSystemStrength + indicators.contractEnforcement + indicators.propertyRights) / 3,
      business: (indicators.easeOfDoingBusiness + indicators.regulatoryQuality + indicators.regulatoryStability) / 3,
      compliance: (indicators.antiMoneyLaunderingCompliance + indicators.taxTransparency) / 2,
      market: (100 - indicators.tradeBarriers + 100 - indicators.investmentRestrictions) / 2,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.REGULATORY,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.REGULATORY],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: ['Legal framework', 'Business environment'],
      concerns: [],
      lastUpdated: new Date(),
      confidence: 0.85,
    };
  }

  /**
   * Calculate operational risk score
   */
  private calculateOperationalScore(indicators: any): RiskScore {
    const subScores = {
      infrastructure: (indicators.infrastructureQuality + indicators.logisticsPerformance + indicators.energyReliability) / 3,
      humanCapital: (indicators.laborForceQuality + indicators.educationLevel + indicators.skillsAvailability) / 3,
      supplyChain: (indicators.supplyChainResilience + indicators.portEfficiency + indicators.customsEfficiency) / 3,
      continuity: (100 - indicators.naturalDisasterRisk + indicators.pandemicPreparedness) / 2,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.OPERATIONAL,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.OPERATIONAL],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: ['Infrastructure', 'Human capital'],
      concerns: [],
      lastUpdated: new Date(),
      confidence: 0.8,
    };
  }

  /**
   * Calculate social risk score
   */
  private calculateSocialScore(indicators: any): RiskScore {
    const subScores = {
      development: indicators.humanDevelopmentIndex * 100,
      stability: (indicators.socialCohesion + 100 - indicators.ethnicTensions + 100 - indicators.religiousTensions) / 3,
      services: (indicators.healthcareQuality + indicators.educationQuality) / 2,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.SOCIAL,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.SOCIAL],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: ['Human development', 'Social cohesion'],
      concerns: [],
      lastUpdated: new Date(),
      confidence: 0.85,
    };
  }

  /**
   * Calculate environmental risk score
   */
  private calculateEnvironmentalScore(indicators: any): RiskScore {
    const subScores = {
      climate: 100 - indicators.climateChangeVulnerability,
      disasters: 100 - indicators.naturalDisasterFrequency,
      resources: (100 - indicators.resourceScarcity + indicators.energySecurity + indicators.foodSecurity) / 3,
      quality: (indicators.airQuality + indicators.sustainabilityScore) / 2,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.ENVIRONMENTAL,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.ENVIRONMENTAL],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: ['Climate resilience', 'Resource security'],
      concerns: [],
      lastUpdated: new Date(),
      confidence: 0.75,
    };
  }

  /**
   * Calculate technological risk score
   */
  private calculateTechnologicalScore(indicators: any): RiskScore {
    const subScores = {
      infrastructure: (indicators.digitalInfrastructure + indicators.mobileConnectivity) / 2,
      innovation: (indicators.innovationCapacity + indicators.technologyAdoption) / 2,
      security: (indicators.cyberSecurityMaturity + indicators.dataSecurity) / 2,
    };

    const score = Object.values(subScores).reduce((sum, s) => sum + s, 0) / Object.keys(subScores).length;

    return {
      category: RiskCategory.TECHNOLOGICAL,
      score: Math.round(score * 10) / 10,
      rating: this.scoring.scoreToRating(score),
      weight: this.config.categoryWeights[RiskCategory.TECHNOLOGICAL],
      riskLevel: this.scoring.scoreToRiskLevel(score),
      trend: TrendDirection.STABLE,
      subScores,
      drivers: ['Digital infrastructure', 'Innovation'],
      concerns: [],
      lastUpdated: new Date(),
      confidence: 0.8,
    };
  }

  /**
   * Helper methods for economic score calculation
   */
  private normalizeGDPGrowth(growth: number): number {
    // Convert GDP growth to 0-100 scale
    // Negative growth = low score, 5%+ = high score
    if (growth < -5) return 20;
    if (growth < -2) return 40;
    if (growth < 0) return 50;
    if (growth < 2) return 60;
    if (growth < 3) return 70;
    if (growth < 5) return 85;
    return 95;
  }

  private calculateMacroStability(indicators: any): number {
    const inflationScore = indicators.inflationRate < 2 ? 90 : indicators.inflationRate < 5 ? 75 : 50;
    const unemploymentScore = indicators.unemploymentRate < 5 ? 90 : indicators.unemploymentRate < 10 ? 70 : 50;
    return (inflationScore + unemploymentScore) / 2;
  }

  private calculateDebtScore(indicators: any): number {
    const debtScore = indicators.publicDebtToGDP < 40 ? 95 : indicators.publicDebtToGDP < 60 ? 80 : indicators.publicDebtToGDP < 90 ? 60 : 40;
    return (debtScore + indicators.debtSustainability) / 2;
  }

  private calculateExternalPositionScore(indicators: any): number {
    return (indicators.exchangeRateStability + indicators.exportDiversification + (100 - indicators.currentAccountVulnerability)) / 3;
  }

  /**
   * Determine rating outlook based on trends
   */
  private async determineOutlook(
    countryCode: string,
    currentScore: number,
    categoryScores: CategoryRiskScores
  ): Promise<RatingOutlook> {
    const history = this.assessmentHistory.get(countryCode) || [];

    if (history.length < 2) {
      return RatingOutlook.STABLE;
    }

    const previousScore = history[history.length - 1].overallScore;
    const scoreDelta = currentScore - previousScore;

    if (scoreDelta > 5) return RatingOutlook.POSITIVE;
    if (scoreDelta < -5) return RatingOutlook.NEGATIVE;
    if (Math.abs(scoreDelta) > 2) return RatingOutlook.DEVELOPING;

    return RatingOutlook.STABLE;
  }

  /**
   * Calculate risk trends
   */
  private calculateTrends(
    countryCode: string,
    categoryScores: CategoryRiskScores,
    historicalData: HistoricalRiskData
  ): RiskTrends {
    const history = historicalData.scores;

    return {
      overall: this.calculateTrendForCategory(history, 'overall'),
      byCategory: {
        [RiskCategory.POLITICAL]: this.calculateTrendForCategory(history, RiskCategory.POLITICAL),
        [RiskCategory.ECONOMIC]: this.calculateTrendForCategory(history, RiskCategory.ECONOMIC),
        [RiskCategory.SECURITY]: this.calculateTrendForCategory(history, RiskCategory.SECURITY),
        [RiskCategory.REGULATORY]: this.calculateTrendForCategory(history, RiskCategory.REGULATORY),
        [RiskCategory.OPERATIONAL]: this.calculateTrendForCategory(history, RiskCategory.OPERATIONAL),
        [RiskCategory.SOCIAL]: this.calculateTrendForCategory(history, RiskCategory.SOCIAL),
        [RiskCategory.ENVIRONMENTAL]: this.calculateTrendForCategory(history, RiskCategory.ENVIRONMENTAL),
        [RiskCategory.TECHNOLOGICAL]: this.calculateTrendForCategory(history, RiskCategory.TECHNOLOGICAL),
      },
      momentum: TrendDirection.STABLE,
      volatility: 0,
      shortTermOutlook: 'Stable risk profile expected in the near term',
      mediumTermOutlook: 'Moderate uncertainty in medium-term outlook',
      longTermOutlook: 'Long-term trends dependent on structural reforms',
    };
  }

  private calculateTrendForCategory(history: ScoreHistory[], category: string): any {
    if (history.length < 2) {
      return {
        direction: TrendDirection.STABLE,
        magnitude: 0,
        duration: 0,
        confidence: 0.5,
        indicators: [],
      };
    }

    // Simple trend calculation
    const recent = history.slice(-5);
    const trend = recent[recent.length - 1].overallScore - recent[0].overallScore;

    return {
      direction: trend > 2 ? TrendDirection.IMPROVING : trend < -2 ? TrendDirection.DETERIORATING : TrendDirection.STABLE,
      magnitude: Math.abs(trend),
      duration: recent.length * 30,
      confidence: 0.7,
      indicators: [],
    };
  }

  /**
   * Identify key risks
   */
  private identifyKeyRisks(indicators: RiskIndicators, categoryScores: CategoryRiskScores): KeyRisk[] {
    const risks: KeyRisk[] = [];

    // Political risks
    if (indicators.political.governmentStability < 40) {
      risks.push({
        id: uuidv4(),
        title: 'Government Instability',
        description: 'Low government stability poses risk of policy discontinuity',
        category: RiskCategory.POLITICAL,
        severity: RiskLevel.HIGH,
        probability: 0.6,
        potentialImpact: 75,
        timeHorizon: 'SHORT',
      });
    }

    // Economic risks
    if (indicators.economic.publicDebtToGDP > 90) {
      risks.push({
        id: uuidv4(),
        title: 'High Public Debt',
        description: 'Elevated public debt levels limit fiscal flexibility',
        category: RiskCategory.ECONOMIC,
        severity: RiskLevel.HIGH,
        probability: 0.8,
        potentialImpact: 70,
        timeHorizon: 'MEDIUM',
      });
    }

    // Security risks
    if (indicators.security.conflictIntensity > 60) {
      risks.push({
        id: uuidv4(),
        title: 'Security Concerns',
        description: 'Elevated conflict risk threatens stability',
        category: RiskCategory.SECURITY,
        severity: RiskLevel.VERY_HIGH,
        probability: 0.7,
        potentialImpact: 85,
        timeHorizon: 'SHORT',
      });
    }

    return risks;
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(indicators: RiskIndicators, categoryScores: CategoryRiskScores): Opportunity[] {
    const opportunities: Opportunity[] = [];

    if (indicators.economic.gdpGrowth > 5) {
      opportunities.push({
        id: uuidv4(),
        title: 'Strong Economic Growth',
        description: 'Robust GDP growth presents investment opportunities',
        category: RiskCategory.ECONOMIC,
        potential: 80,
        feasibility: 70,
        timeframe: '1-2 years',
      });
    }

    return opportunities;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(categoryScores: CategoryRiskScores, keyRisks: KeyRisk[]): string[] {
    const recommendations: string[] = [];

    if (categoryScores.political.score < 60) {
      recommendations.push('Monitor political developments closely');
      recommendations.push('Engage with stakeholders to understand political dynamics');
    }

    if (categoryScores.economic.score < 60) {
      recommendations.push('Review economic exposure and diversification strategies');
    }

    if (keyRisks.length > 3) {
      recommendations.push('Implement enhanced risk monitoring framework');
    }

    return recommendations;
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(indicators: RiskIndicators): DataQuality {
    return {
      overall: 85,
      completeness: 90,
      accuracy: 85,
      timeliness: 80,
      reliability: 85,
      coverage: 85,
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(dataQuality: DataQuality, indicators: RiskIndicators): number {
    return dataQuality.overall / 100;
  }

  /**
   * Extract data sources from indicators
   */
  private extractDataSources(indicators: RiskIndicators): DataSource[] {
    return [];
  }

  /**
   * Generate peer comparisons
   */
  private async generatePeerComparisons(
    countryCode: string,
    overallScore: number,
    categoryScores: CategoryRiskScores
  ): Promise<PeerComparison[]> {
    // Placeholder - would be implemented with actual peer data
    return [];
  }

  /**
   * Calculate next review date
   */
  private calculateNextReviewDate(): Date {
    const next = new Date();
    next.setMonth(next.getMonth() + 3);
    return next;
  }

  /**
   * Store assessment in history
   */
  private storeAssessment(countryCode: string, profile: CountryRiskProfile): void {
    const history = this.assessmentHistory.get(countryCode) || [];
    history.push(profile);
    this.assessmentHistory.set(countryCode, history);
  }

  /**
   * Get historical data for a country
   */
  private getHistoricalData(countryCode: string): HistoricalRiskData {
    const history = this.assessmentHistory.get(countryCode) || [];

    return {
      ratings: this.buildRatingHistory(history),
      scores: this.buildScoreHistory(history),
      events: [],
    };
  }

  private buildRatingHistory(history: CountryRiskProfile[]): RatingHistory[] {
    return history.map((profile, index) => ({
      date: profile.assessmentDate,
      rating: profile.overallRating,
      outlook: profile.outlook,
      action: index === 0 ? 'INITIAL' : 'AFFIRMED',
      reason: 'Periodic review',
    }));
  }

  private buildScoreHistory(history: CountryRiskProfile[]): ScoreHistory[] {
    return history.map(profile => ({
      date: profile.assessmentDate,
      overallScore: profile.overallScore,
      categoryScores: {
        [RiskCategory.POLITICAL]: profile.riskScores.political.score,
        [RiskCategory.ECONOMIC]: profile.riskScores.economic.score,
        [RiskCategory.SECURITY]: profile.riskScores.security.score,
        [RiskCategory.REGULATORY]: profile.riskScores.regulatory.score,
        [RiskCategory.OPERATIONAL]: profile.riskScores.operational.score,
        [RiskCategory.SOCIAL]: profile.riskScores.social.score,
        [RiskCategory.ENVIRONMENTAL]: profile.riskScores.environmental.score,
        [RiskCategory.TECHNOLOGICAL]: profile.riskScores.technological.score,
      },
    }));
  }

  /**
   * Check for significant changes and generate events
   */
  private async checkForSignificantChanges(countryCode: string, currentProfile: CountryRiskProfile): Promise<void> {
    const history = this.assessmentHistory.get(countryCode) || [];

    if (history.length < 2) return;

    const previous = history[history.length - 2];

    // Check for rating change
    if (previous.overallRating !== currentProfile.overallRating) {
      const event: RiskChangeEvent = {
        timestamp: new Date(),
        countryCode,
        changeType: 'RATING_CHANGE',
        previousRating: previous.overallRating,
        newRating: currentProfile.overallRating,
        reason: 'Periodic assessment identified material changes',
        affectedCategories: Object.keys(RiskCategory).map(k => RiskCategory[k as keyof typeof RiskCategory]),
        significance: 'MAJOR',
      };

      const events = this.changeEvents.get(countryCode) || [];
      events.push(event);
      this.changeEvents.set(countryCode, events);
    }
  }

  /**
   * Helper methods to identify drivers and concerns
   */
  private identifyPoliticalDrivers(indicators: any): string[] {
    const drivers = [];
    if (indicators.governmentStability > 70) drivers.push('Strong government stability');
    if (indicators.ruleOfLaw > 70) drivers.push('Robust rule of law');
    return drivers;
  }

  private identifyPoliticalConcerns(indicators: any): string[] {
    const concerns = [];
    if (indicators.corruptionIndex < 40) concerns.push('Elevated corruption levels');
    if (indicators.conflictRisk > 60) concerns.push('High conflict risk');
    return concerns;
  }

  private identifyEconomicDrivers(indicators: any): string[] {
    const drivers = [];
    if (indicators.gdpGrowth > 4) drivers.push('Strong economic growth');
    if (indicators.publicDebtToGDP < 40) drivers.push('Low public debt');
    return drivers;
  }

  private identifyEconomicConcerns(indicators: any): string[] {
    const concerns = [];
    if (indicators.inflationRate > 10) concerns.push('High inflation');
    if (indicators.publicDebtToGDP > 90) concerns.push('Elevated debt levels');
    return concerns;
  }

  private identifySecurityDrivers(indicators: any): string[] {
    const drivers = [];
    if (indicators.regionalStability > 70) drivers.push('Stable regional environment');
    return drivers;
  }

  private identifySecurityConcerns(indicators: any): string[] {
    const concerns = [];
    if (indicators.terrorismThreat > 60) concerns.push('Elevated terrorism threat');
    if (indicators.civilUnrest > 60) concerns.push('High civil unrest');
    return concerns;
  }

  /**
   * Generate comprehensive assessment report
   */
  async generateReport(countryCode: string): Promise<RiskAssessmentReport | null> {
    const history = this.assessmentHistory.get(countryCode);
    if (!history || history.length === 0) return null;

    const currentProfile = history[history.length - 1];

    return {
      executiveSummary: this.generateExecutiveSummary(currentProfile),
      riskProfile: currentProfile,
      detailedAnalysis: this.generateDetailedAnalysis(currentProfile),
      keyFindings: this.generateKeyFindings(currentProfile),
      historicalContext: {
        ratingChanges: currentProfile.historicalData.ratings,
        scoreEvolution: currentProfile.historicalData.scores,
        majorEvents: currentProfile.historicalData.events,
        trends: ['Stable political environment', 'Improving economic indicators'],
        patterns: ['Seasonal volatility in Q4'],
      },
      outlook: {
        horizon: '12 months',
        outlook: currentProfile.outlook,
        direction: currentProfile.trends.overall.direction,
        positiveFactors: ['Strong institutions', 'Economic resilience'],
        negativeFactors: ['Regional tensions', 'Fiscal pressures'],
        uncertainties: ['Election outcomes', 'Global economic conditions'],
      },
      recommendations: currentProfile.recommendations.map(r => ({
        priority: 'MEDIUM' as const,
        category: RiskCategory.POLITICAL,
        title: r,
        description: r,
        rationale: 'Based on current risk assessment',
        expectedImpact: 'Moderate positive impact on risk profile',
        timeframe: '6-12 months',
      })),
      reportDate: new Date(),
      reportId: uuidv4(),
      analyst: currentProfile.analyst,
    };
  }

  private generateExecutiveSummary(profile: CountryRiskProfile): string {
    return `${profile.countryName} maintains a ${profile.overallRating} credit rating with ${profile.riskLevel.toLowerCase()} risk level. ` +
      `The outlook is ${profile.outlook.toLowerCase()} with an overall risk score of ${profile.overallScore.toFixed(1)}.`;
  }

  private generateDetailedAnalysis(profile: CountryRiskProfile): DetailedAnalysis {
    return {
      political: this.generateCategoryAnalysis(profile.riskScores.political),
      economic: this.generateCategoryAnalysis(profile.riskScores.economic),
      security: this.generateCategoryAnalysis(profile.riskScores.security),
      regulatory: this.generateCategoryAnalysis(profile.riskScores.regulatory),
      operational: this.generateCategoryAnalysis(profile.riskScores.operational),
      social: this.generateCategoryAnalysis(profile.riskScores.social),
      environmental: this.generateCategoryAnalysis(profile.riskScores.environmental),
      technological: this.generateCategoryAnalysis(profile.riskScores.technological),
    };
  }

  private generateCategoryAnalysis(riskScore: RiskScore): CategoryAnalysis {
    return {
      category: riskScore.category,
      score: riskScore.score,
      rating: riskScore.rating,
      strengths: riskScore.drivers,
      weaknesses: riskScore.concerns,
      trends: [`${riskScore.trend} trend observed`],
      topIndicators: Object.entries(riskScore.subScores || {}).map(([name, value]) => ({
        name,
        value,
        benchmark: 70,
        assessment: value > 70 ? 'Above benchmark' : 'Below benchmark',
      })),
      outlook: `${riskScore.trend} outlook for ${riskScore.category}`,
      keyRisks: riskScore.concerns,
    };
  }

  private generateKeyFindings(profile: CountryRiskProfile): string[] {
    return [
      `Overall risk rating: ${profile.overallRating}`,
      `${profile.keyRisks.length} key risks identified`,
      `${profile.opportunities.length} opportunities identified`,
      `Outlook: ${profile.outlook}`,
    ];
  }

  /**
   * Track risk changes over time
   */
  getRiskChanges(countryCode: string): RiskChangeEvent[] {
    return this.changeEvents.get(countryCode) || [];
  }

  /**
   * Get assessment history
   */
  getAssessmentHistory(countryCode: string): CountryRiskProfile[] {
    return this.assessmentHistory.get(countryCode) || [];
  }
}
