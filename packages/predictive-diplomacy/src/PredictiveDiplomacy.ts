import {
  Prediction,
  PredictionType,
  PredictionTimeframe,
  Confidence,
  TrendAnalysis,
  RiskScenario,
  OpportunityForecast,
  DiplomaticForecast,
  AllianceShiftPrediction,
  LeadershipTransitionImpact,
  NegotiationOutcomePrediction,
  RegionalStabilityForecast,
  Indicator,
  PredictedOutcome
} from './types.js';

/**
 * PredictiveDiplomacy
 *
 * Advanced prediction and forecasting engine for diplomatic outcomes,
 * relationship trajectories, and geopolitical developments
 */
export class PredictiveDiplomacy {
  private predictions: Map<string, Prediction> = new Map();
  private predictionsByType: Map<PredictionType, Set<string>> = new Map();
  private forecasts: Map<string, DiplomaticForecast> = new Map();

  /**
   * Generate a prediction
   */
  generatePrediction(prediction: Prediction): void {
    this.predictions.set(prediction.id, prediction);

    if (!this.predictionsByType.has(prediction.type)) {
      this.predictionsByType.set(prediction.type, new Set());
    }
    this.predictionsByType.get(prediction.type)!.add(prediction.id);
  }

  /**
   * Predict relationship trajectory
   */
  predictRelationshipTrajectory(
    country1: string,
    country2: string,
    currentQuality: number,
    recentTrend: string,
    indicators: Indicator[]
  ): Prediction {
    // Analyze trend
    const trendScore = this.calculateTrendScore(recentTrend);
    const indicatorScore = this.aggregateIndicators(indicators);

    const trajectoryScore = (currentQuality + trendScore + indicatorScore) / 3;

    let predictedStatus: string;
    if (trajectoryScore > 75) predictedStatus = 'Strategic Partnership';
    else if (trajectoryScore > 60) predictedStatus = 'Strong Relations';
    else if (trajectoryScore > 40) predictedStatus = 'Normal Relations';
    else if (trajectoryScore > 25) predictedStatus = 'Strained Relations';
    else predictedStatus = 'Tense Relations';

    const confidence = this.calculateConfidence(indicators.length, indicatorScore);

    const prediction: Prediction = {
      id: `pred-${Date.now()}-rel-${country1}-${country2}`,
      type: PredictionType.RELATIONSHIP_TRAJECTORY,
      timeframe: PredictionTimeframe.SHORT_TERM,
      generatedDate: new Date(),
      subject: `${country1}-${country2} Relations`,
      description: `Predicted trajectory of bilateral relationship`,
      prediction: `Relationship likely to reach ${predictedStatus} status`,
      confidence,
      confidenceScore: this.confidenceToScore(confidence),
      indicators,
      historicalPatterns: [],
      scenarios: [],
      assumptions: [
        'No major diplomatic incidents',
        'Current leadership remains in place',
        'No significant external shocks'
      ],
      limitingFactors: ['Regional dynamics', 'Domestic politics', 'Third-party influence'],
      outcomes: this.generateRelationshipOutcomes(trajectoryScore),
      mostLikelyOutcome: {
        outcome: predictedStatus,
        probability: 60,
        confidence,
        timeframe: '6-12 months',
        implications: ['May affect regional alliances', 'Trade implications likely'],
        stakeholders: []
      },
      worstCase: {
        outcome: 'Tense Relations',
        probability: 15,
        confidence: Confidence.MEDIUM,
        timeframe: '3-6 months',
        implications: ['Diplomatic friction', 'Reduced cooperation'],
        stakeholders: []
      },
      bestCase: {
        outcome: 'Strategic Partnership',
        probability: 25,
        confidence: Confidence.MEDIUM,
        timeframe: '12+ months',
        implications: ['Enhanced cooperation', 'Joint initiatives'],
        stakeholders: []
      },
      keyEventsToWatch: [
        'High-level visits',
        'Trade agreement negotiations',
        'Regional summit outcomes'
      ],
      earlyWarningSignals: [
        'Diplomatic protests',
        'Sanctions threats',
        'Military posturing'
      ],
      verificationMilestones: [],
      geopoliticalContext: 'Complex regional dynamics with competing interests',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.generatePrediction(prediction);
    return prediction;
  }

  /**
   * Predict policy shift
   */
  predictPolicyShift(
    country: string,
    domain: string,
    currentPosition: string,
    indicators: Indicator[]
  ): Prediction {
    const shiftProbability = this.calculateShiftProbability(indicators);

    let predictedPosition: string;
    if (shiftProbability > 70) {
      predictedPosition = 'Major policy shift expected';
    } else if (shiftProbability > 40) {
      predictedPosition = 'Tactical adjustment likely';
    } else {
      predictedPosition = 'Policy continuity expected';
    }

    const confidence = shiftProbability > 60 ? Confidence.HIGH : Confidence.MEDIUM;

    const prediction: Prediction = {
      id: `pred-${Date.now()}-policy-${country}`,
      type: PredictionType.POLICY_SHIFT,
      timeframe: PredictionTimeframe.SHORT_TERM,
      generatedDate: new Date(),
      subject: `${country} ${domain} Policy`,
      description: `Predicted policy evolution in ${domain}`,
      prediction: predictedPosition,
      confidence,
      confidenceScore: shiftProbability,
      indicators,
      historicalPatterns: [],
      scenarios: [],
      assumptions: ['Current trends continue', 'No leadership change'],
      limitingFactors: ['Domestic constraints', 'Alliance commitments'],
      outcomes: [],
      mostLikelyOutcome: {
        outcome: predictedPosition,
        probability: shiftProbability,
        confidence,
        timeframe: '3-12 months',
        implications: [],
        stakeholders: []
      },
      worstCase: { outcome: 'No change', probability: 30, confidence: Confidence.LOW, timeframe: '12+ months', implications: [], stakeholders: [] },
      bestCase: { outcome: 'Major shift', probability: 70, confidence: Confidence.MEDIUM, timeframe: '3-6 months', implications: [], stakeholders: [] },
      keyEventsToWatch: ['Policy speeches', 'Legislative changes', 'International commitments'],
      earlyWarningSignals: ['Rhetorical shifts', 'Consultation processes', 'Think tank proposals'],
      verificationMilestones: [],
      geopoliticalContext: `${country} navigating complex ${domain} challenges`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.generatePrediction(prediction);
    return prediction;
  }

  /**
   * Predict negotiation outcome
   */
  predictNegotiationOutcome(
    negotiationId: string,
    subject: string,
    parties: string[],
    round: number,
    progress: number
  ): NegotiationOutcomePrediction {
    const remainingProgress = 100 - progress;
    const avgRoundProgress = progress / round;
    const estimatedRoundsRemaining = Math.ceil(remainingProgress / avgRoundProgress);

    const successProbability = progress > 70 ? 75 :
                              progress > 50 ? 60 :
                              progress > 30 ? 40 : 25;

    return {
      negotiationId,
      subject,
      parties,
      startDate: new Date(),
      predictedDuration: estimatedRoundsRemaining * 30, // Assume 30 days per round
      successProbability,
      possibleOutcomes: [
        {
          outcome: 'Full agreement reached',
          probability: successProbability,
          favoredParties: parties.slice(0, Math.ceil(parties.length / 2)),
          timeToAchieve: estimatedRoundsRemaining * 30
        },
        {
          outcome: 'Partial agreement',
          probability: 100 - successProbability - 15,
          favoredParties: parties,
          timeToAchieve: (estimatedRoundsRemaining + 2) * 30
        },
        {
          outcome: 'Negotiation collapse',
          probability: 15,
          favoredParties: [],
          timeToAchieve: undefined
        }
      ],
      stickingPoints: [],
      dealBreakers: [],
      sweeteners: [],
      externalFactors: []
    };
  }

  /**
   * Forecast regional stability
   */
  forecastRegionalStability(
    region: string,
    countries: string[],
    currentStability: number,
    flashpoints: any[]
  ): RegionalStabilityForecast {
    const flashpointRisk = flashpoints.length * 10;
    const projectedStability = Math.max(0, currentStability - flashpointRisk);

    let trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    if (projectedStability > currentStability + 10) trend = 'IMPROVING';
    else if (projectedStability < currentStability - 10) trend = 'DETERIORATING';
    else trend = 'STABLE';

    return {
      region,
      timeframe: PredictionTimeframe.MEDIUM_TERM,
      overallStability: projectedStability,
      trend,
      flashpoints: flashpoints.map(fp => ({
        location: fp.location || region,
        issue: fp.issue,
        escalationRisk: fp.severity * 10,
        parties: fp.parties || [],
        mitigationOptions: ['Diplomatic mediation', 'Economic incentives', 'Security guarantees']
      })),
      stabilizingFactors: ['Economic interdependence', 'Institutional frameworks'],
      destabilizingFactors: ['Unresolved disputes', 'Arms proliferation'],
      countryStability: countries.map(c => ({
        country: c,
        stability: currentStability + (Math.random() * 20 - 10), // Simplified
        trend: 'STABLE' as const
      })),
      spilloverRisks: [],
      recommendations: [
        'Strengthen regional dialogue mechanisms',
        'Address root causes of instability',
        'Enhance early warning systems'
      ]
    };
  }

  /**
   * Analyze trends
   */
  analyzeTrends(
    subject: string,
    domain: string,
    dataPoints: { date: Date; value: number }[]
  ): TrendAnalysis {
    if (dataPoints.length < 2) {
      return this.getDefaultTrend(subject, domain);
    }

    // Calculate trend
    const recent = dataPoints.slice(-3);
    const avgRecent = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const avgAll = dataPoints.reduce((sum, d) => sum + d.value, 0) / dataPoints.length;

    let overallTrend: TrendAnalysis['overallTrend'];
    if (avgRecent > avgAll * 1.2) overallTrend = 'STRONGLY_POSITIVE';
    else if (avgRecent > avgAll * 1.05) overallTrend = 'POSITIVE';
    else if (avgRecent < avgAll * 0.8) overallTrend = 'STRONGLY_NEGATIVE';
    else if (avgRecent < avgAll * 0.95) overallTrend = 'NEGATIVE';
    else overallTrend = 'STABLE';

    // Calculate volatility
    const variance = dataPoints.reduce((sum, d) => sum + Math.pow(d.value - avgAll, 2), 0) / dataPoints.length;
    const volatility = Math.min(100, Math.sqrt(variance));

    return {
      subject,
      domain,
      timeRange: {
        start: dataPoints[0].date,
        end: dataPoints[dataPoints.length - 1].date
      },
      overallTrend,
      trendStrength: Math.abs(avgRecent - avgAll) / avgAll * 100,
      volatility,
      dataPoints: dataPoints.map(d => ({ ...d, confidence: 0.8 })),
      projection: {
        shortTerm: { value: avgRecent, confidence: 0.75 },
        mediumTerm: { value: avgRecent * 1.1, confidence: 0.6 },
        longTerm: { value: avgRecent * 1.2, confidence: 0.4 }
      },
      inflectionPoints: [],
      drivers: []
    };
  }

  /**
   * Identify opportunities
   */
  identifyOpportunities(
    timeframe: PredictionTimeframe,
    domain: string
  ): OpportunityForecast[] {
    // This would integrate with other packages to identify real opportunities
    // Simplified for now
    return [];
  }

  /**
   * Assess risks
   */
  assessRisks(
    timeframe: PredictionTimeframe,
    region?: string
  ): RiskScenario[] {
    // This would integrate with crisis diplomacy and other packages
    // Simplified for now
    return [];
  }

  /**
   * Generate comprehensive forecast
   */
  generateForecast(
    scope: 'BILATERAL' | 'REGIONAL' | 'GLOBAL',
    subject: string,
    timeframe: PredictionTimeframe
  ): DiplomaticForecast {
    const forecast: DiplomaticForecast = {
      id: `forecast-${Date.now()}-${scope}`,
      scope,
      subject,
      timeframe,
      generatedDate: new Date(),
      predictions: [],
      trends: [],
      risks: [],
      opportunities: [],
      keyFindings: [
        'Complex regional dynamics observed',
        'Multiple competing interests identified',
        'Opportunities for diplomatic engagement exist'
      ],
      strategicRecommendations: [
        'Enhance bilateral dialogue',
        'Strengthen multilateral cooperation',
        'Monitor early warning indicators'
      ],
      uncertainties: [
        'Leadership transitions',
        'Economic volatility',
        'External shocks'
      ],
      confidenceAssessment: {
        overall: Confidence.MEDIUM,
        byType: {}
      }
    };

    this.forecasts.set(forecast.id, forecast);
    return forecast;
  }

  /**
   * Update prediction based on new information
   */
  updatePrediction(
    predictionId: string,
    newInformation: string,
    confidenceAdjustment?: number
  ): void {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) return;

    if (!prediction.updates) {
      prediction.updates = [];
    }

    prediction.updates.push({
      date: new Date(),
      reason: 'New information available',
      changes: [],
      confidenceAdjustment,
      newInformation
    });

    if (confidenceAdjustment) {
      prediction.confidenceScore = Math.max(0, Math.min(100,
        prediction.confidenceScore + confidenceAdjustment
      ));
    }

    prediction.updatedAt = new Date();
  }

  /**
   * Verify prediction accuracy
   */
  verifyPrediction(
    predictionId: string,
    actualOutcome: string
  ): number {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) return 0;

    // Calculate accuracy based on how close the prediction was
    const accuracy = prediction.prediction.toLowerCase().includes(actualOutcome.toLowerCase()) ? 100 : 0;

    prediction.actualOutcome = {
      outcome: actualOutcome,
      date: new Date(),
      accuracy
    };

    return accuracy;
  }

  private calculateTrendScore(trend: string): number {
    switch (trend) {
      case 'IMPROVING': return 80;
      case 'STABLE': return 60;
      case 'DETERIORATING': return 30;
      case 'VOLATILE': return 45;
      default: return 50;
    }
  }

  private aggregateIndicators(indicators: Indicator[]): number {
    if (indicators.length === 0) return 50;

    const weighted = indicators.reduce((sum, ind) => {
      const value = typeof ind.currentValue === 'number' ? ind.currentValue : 50;
      return sum + (value * ind.weight);
    }, 0);

    const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
    return totalWeight > 0 ? weighted / totalWeight : 50;
  }

  private calculateConfidence(indicatorCount: number, score: number): Confidence {
    const baseConfidence = Math.min(90, 40 + (indicatorCount * 10));
    const adjustedConfidence = baseConfidence * (score / 100);

    if (adjustedConfidence > 90) return Confidence.VERY_HIGH;
    if (adjustedConfidence > 75) return Confidence.HIGH;
    if (adjustedConfidence > 50) return Confidence.MEDIUM;
    if (adjustedConfidence > 25) return Confidence.LOW;
    return Confidence.VERY_LOW;
  }

  private confidenceToScore(confidence: Confidence): number {
    switch (confidence) {
      case Confidence.VERY_HIGH: return 95;
      case Confidence.HIGH: return 82;
      case Confidence.MEDIUM: return 62;
      case Confidence.LOW: return 37;
      case Confidence.VERY_LOW: return 15;
    }
  }

  private calculateShiftProbability(indicators: Indicator[]): number {
    const leadingIndicators = indicators.filter(i => i.type === 'LEADING');
    if (leadingIndicators.length === 0) return 30;

    return this.aggregateIndicators(leadingIndicators);
  }

  private generateRelationshipOutcomes(score: number): PredictedOutcome[] {
    return [
      {
        outcome: 'Strategic Partnership',
        probability: score > 70 ? 60 : 20,
        confidence: score > 70 ? Confidence.HIGH : Confidence.LOW,
        timeframe: '12+ months',
        implications: ['Deep cooperation', 'Joint initiatives'],
        stakeholders: []
      },
      {
        outcome: 'Normal Relations',
        probability: 40,
        confidence: Confidence.MEDIUM,
        timeframe: '6-12 months',
        implications: ['Stable engagement', 'Limited friction'],
        stakeholders: []
      },
      {
        outcome: 'Strained Relations',
        probability: score < 40 ? 60 : 20,
        confidence: score < 40 ? Confidence.HIGH : Confidence.LOW,
        timeframe: '3-6 months',
        implications: ['Diplomatic tensions', 'Reduced cooperation'],
        stakeholders: []
      }
    ];
  }

  private getDefaultTrend(subject: string, domain: string): TrendAnalysis {
    return {
      subject,
      domain,
      timeRange: { start: new Date(), end: new Date() },
      overallTrend: 'STABLE',
      trendStrength: 0,
      volatility: 0,
      dataPoints: [],
      projection: {
        shortTerm: { value: 0, confidence: 0 },
        mediumTerm: { value: 0, confidence: 0 },
        longTerm: { value: 0, confidence: 0 }
      },
      inflectionPoints: [],
      drivers: []
    };
  }

  /**
   * Get predictions by type
   */
  getPredictionsByType(type: PredictionType): Prediction[] {
    const predictionIds = this.predictionsByType.get(type) || new Set();
    return Array.from(predictionIds)
      .map(id => this.predictions.get(id))
      .filter((p): p is Prediction => p !== undefined);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalPredictions: number;
    byType: Record<string, number>;
    averageConfidence: number;
    verifiedPredictions: number;
    averageAccuracy: number;
  } {
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    let verifiedCount = 0;
    let totalAccuracy = 0;

    for (const prediction of this.predictions.values()) {
      byType[prediction.type] = (byType[prediction.type] || 0) + 1;
      totalConfidence += prediction.confidenceScore;

      if (prediction.actualOutcome) {
        verifiedCount++;
        totalAccuracy += prediction.actualOutcome.accuracy;
      }
    }

    return {
      totalPredictions: this.predictions.size,
      byType,
      averageConfidence: this.predictions.size > 0 ? totalConfidence / this.predictions.size : 0,
      verifiedPredictions: verifiedCount,
      averageAccuracy: verifiedCount > 0 ? totalAccuracy / verifiedCount : 0
    };
  }
}
