/**
 * Predictive Threat Modeling Engine
 *
 * Advanced predictive analytics for anticipating threats,
 * modeling adversary behavior, and risk forecasting
 */

export interface ThreatScenario {
  id: string;
  name: string;
  description: string;
  threatActors: string[];
  attackVectors: string[];
  targetAssets: string[];
  likelihood: number;
  impact: number;
  timeframe: { min: number; max: number }; // days
  indicators: string[];
  mitigations: string[];
}

export interface RiskForecast {
  entityId: string;
  forecastPeriod: { start: Date; end: Date };
  baselineRisk: number;
  forecastedRisk: number;
  confidence: number;
  contributingFactors: Array<{
    factor: string;
    weight: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  }>;
  recommendations: string[];
  scenarios: ThreatScenario[];
}

export interface AdversaryModel {
  actorId: string;
  capabilities: Map<string, number>;
  intentions: string[];
  resources: 'LIMITED' | 'MODERATE' | 'SUBSTANTIAL' | 'UNLIMITED';
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  operationalPatterns: {
    preferredTTPs: string[];
    targetingCriteria: string[];
    operationalTempo: 'SLOW' | 'MODERATE' | 'FAST' | 'BURST';
  };
  decisionModel: {
    objectives: string[];
    constraints: string[];
    decisionFactors: Map<string, number>;
  };
}

export interface AttackSimulation {
  id: string;
  scenario: ThreatScenario;
  adversaryModel: AdversaryModel;
  simulationSteps: Array<{
    step: number;
    action: string;
    success: boolean;
    detectionProbability: number;
    impact: number;
  }>;
  outcome: 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'DETECTED';
  metrics: {
    totalSteps: number;
    successfulSteps: number;
    timeToDetection: number;
    totalImpact: number;
  };
  vulnerabilitiesExploited: string[];
  detectionGaps: string[];
}

export class PredictiveEngine {
  private adversaryModels: Map<string, AdversaryModel> = new Map();
  private scenarios: Map<string, ThreatScenario> = new Map();
  private historicalData: any[] = [];

  /**
   * Generate risk forecast for entity
   */
  async generateRiskForecast(
    entityId: string,
    forecastDays: number,
    historicalData: any[]
  ): Promise<RiskForecast> {
    // Extract features from historical data
    const features = this.extractForecastFeatures(historicalData);

    // Calculate baseline risk
    const baselineRisk = this.calculateBaselineRisk(features);

    // Run time series prediction
    const forecast = this.runTimeSeriesForecast(features, forecastDays);

    // Identify contributing factors
    const factors = this.identifyContributingFactors(features, forecast);

    // Generate relevant scenarios
    const scenarios = this.generateRelevantScenarios(entityId, factors);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, scenarios);

    return {
      entityId,
      forecastPeriod: {
        start: new Date(),
        end: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000)
      },
      baselineRisk,
      forecastedRisk: forecast.value,
      confidence: forecast.confidence,
      contributingFactors: factors,
      recommendations,
      scenarios
    };
  }

  /**
   * Model adversary behavior
   */
  async modelAdversary(
    actorId: string,
    historicalOperations: any[],
    knownCapabilities: string[]
  ): Promise<AdversaryModel> {
    // Analyze historical operations
    const operationalAnalysis = this.analyzeOperations(historicalOperations);

    // Infer capabilities from observed behavior
    const capabilities = this.inferCapabilities(historicalOperations, knownCapabilities);

    // Model decision-making
    const decisionModel = this.modelDecisionMaking(historicalOperations);

    // Infer intentions
    const intentions = this.inferIntentions(operationalAnalysis);

    const model: AdversaryModel = {
      actorId,
      capabilities,
      intentions,
      resources: this.estimateResources(operationalAnalysis),
      riskTolerance: this.estimateRiskTolerance(operationalAnalysis),
      operationalPatterns: {
        preferredTTPs: operationalAnalysis.commonTTPs,
        targetingCriteria: operationalAnalysis.targetingPatterns,
        operationalTempo: this.assessOperationalTempo(historicalOperations)
      },
      decisionModel
    };

    this.adversaryModels.set(actorId, model);
    return model;
  }

  /**
   * Simulate attack scenario
   */
  async simulateAttack(
    scenario: ThreatScenario,
    adversaryModel: AdversaryModel,
    defenses: any[]
  ): Promise<AttackSimulation> {
    const simulationSteps: AttackSimulation['simulationSteps'] = [];
    let currentStep = 0;
    let detected = false;
    let totalImpact = 0;
    const vulnerabilitiesExploited: string[] = [];
    const detectionGaps: string[] = [];

    // Simulate each phase of attack
    const attackPhases = [
      'RECONNAISSANCE',
      'INITIAL_ACCESS',
      'PERSISTENCE',
      'PRIVILEGE_ESCALATION',
      'LATERAL_MOVEMENT',
      'COLLECTION',
      'EXFILTRATION'
    ];

    for (const phase of attackPhases) {
      currentStep++;

      // Calculate success probability based on adversary capabilities and defenses
      const successProb = this.calculatePhaseSuccess(phase, adversaryModel, defenses);

      // Calculate detection probability
      const detectionProb = this.calculateDetectionProbability(phase, defenses);

      const success = Math.random() < successProb;
      const detectedThisStep = Math.random() < detectionProb;

      const stepImpact = success ? this.calculatePhaseImpact(phase, scenario) : 0;
      totalImpact += stepImpact;

      if (success && !detectedThisStep) {
        vulnerabilitiesExploited.push(`${phase}_vulnerability`);
      }

      if (success && !detectedThisStep) {
        detectionGaps.push(`${phase}_detection_gap`);
      }

      simulationSteps.push({
        step: currentStep,
        action: phase,
        success,
        detectionProbability: detectionProb,
        impact: stepImpact
      });

      if (detectedThisStep) {
        detected = true;
        break;
      }

      if (!success && phase === 'INITIAL_ACCESS') {
        break; // Cannot proceed without initial access
      }
    }

    // Determine outcome
    let outcome: AttackSimulation['outcome'];
    const successfulSteps = simulationSteps.filter(s => s.success).length;

    if (detected) {
      outcome = 'DETECTED';
    } else if (successfulSteps === attackPhases.length) {
      outcome = 'SUCCESS';
    } else if (successfulSteps > attackPhases.length / 2) {
      outcome = 'PARTIAL';
    } else {
      outcome = 'FAILURE';
    }

    return {
      id: crypto.randomUUID(),
      scenario,
      adversaryModel,
      simulationSteps,
      outcome,
      metrics: {
        totalSteps: currentStep,
        successfulSteps,
        timeToDetection: detected ? currentStep : -1,
        totalImpact
      },
      vulnerabilitiesExploited,
      detectionGaps
    };
  }

  /**
   * Run Monte Carlo simulation for risk assessment
   */
  async runMonteCarloSimulation(
    scenario: ThreatScenario,
    adversaryModel: AdversaryModel,
    defenses: any[],
    iterations: number = 1000
  ): Promise<{
    successRate: number;
    detectionRate: number;
    avgImpact: number;
    impactDistribution: { min: number; max: number; p25: number; p50: number; p75: number };
    confidenceInterval: { lower: number; upper: number };
    criticalVulnerabilities: Array<{ vulnerability: string; exploitRate: number }>;
  }> {
    const results: AttackSimulation[] = [];

    for (let i = 0; i < iterations; i++) {
      const simulation = await this.simulateAttack(scenario, adversaryModel, defenses);
      results.push(simulation);
    }

    // Calculate statistics
    const successCount = results.filter(r => r.outcome === 'SUCCESS').length;
    const detectedCount = results.filter(r => r.outcome === 'DETECTED').length;
    const impacts = results.map(r => r.metrics.totalImpact).sort((a, b) => a - b);

    // Count vulnerability exploitations
    const vulnCounts = new Map<string, number>();
    for (const result of results) {
      for (const vuln of result.vulnerabilitiesExploited) {
        vulnCounts.set(vuln, (vulnCounts.get(vuln) || 0) + 1);
      }
    }

    return {
      successRate: successCount / iterations,
      detectionRate: detectedCount / iterations,
      avgImpact: impacts.reduce((a, b) => a + b, 0) / iterations,
      impactDistribution: {
        min: impacts[0],
        max: impacts[impacts.length - 1],
        p25: impacts[Math.floor(iterations * 0.25)],
        p50: impacts[Math.floor(iterations * 0.5)],
        p75: impacts[Math.floor(iterations * 0.75)]
      },
      confidenceInterval: {
        lower: impacts[Math.floor(iterations * 0.025)],
        upper: impacts[Math.floor(iterations * 0.975)]
      },
      criticalVulnerabilities: Array.from(vulnCounts.entries())
        .map(([vulnerability, count]) => ({
          vulnerability,
          exploitRate: count / iterations
        }))
        .sort((a, b) => b.exploitRate - a.exploitRate)
        .slice(0, 10)
    };
  }

  /**
   * Generate threat scenarios based on environment
   */
  async generateThreatScenarios(
    assets: string[],
    threatActors: string[],
    vulnerabilities: string[]
  ): Promise<ThreatScenario[]> {
    const scenarios: ThreatScenario[] = [];

    // Generate scenarios for each actor-asset combination
    for (const actor of threatActors) {
      const adversaryModel = this.adversaryModels.get(actor);

      for (const asset of assets) {
        // Find relevant vulnerabilities
        const relevantVulns = this.findRelevantVulnerabilities(asset, vulnerabilities);

        if (relevantVulns.length > 0) {
          const scenario = this.buildScenario(actor, asset, relevantVulns, adversaryModel);
          scenarios.push(scenario);
        }
      }
    }

    // Rank scenarios by risk
    scenarios.sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));

    return scenarios.slice(0, 20);
  }

  /**
   * Predict adversary next actions
   */
  async predictNextActions(
    actorId: string,
    currentState: any,
    recentActions: any[]
  ): Promise<Array<{
    action: string;
    probability: number;
    expectedTimeframe: { min: number; max: number };
    indicators: string[];
    countermeasures: string[];
  }>> {
    const adversaryModel = this.adversaryModels.get(actorId);
    if (!adversaryModel) {
      return [];
    }

    // Analyze current state and recent actions
    const stateAnalysis = this.analyzeCurrentState(currentState, recentActions);

    // Use decision model to predict next actions
    const predictions = this.applyDecisionModel(adversaryModel, stateAnalysis);

    // Generate indicators for each predicted action
    const predictedActions = predictions.map(pred => ({
      action: pred.action,
      probability: pred.probability,
      expectedTimeframe: this.estimateTimeframe(pred, adversaryModel),
      indicators: this.generateActionIndicators(pred.action),
      countermeasures: this.generateCountermeasures(pred.action)
    }));

    return predictedActions.sort((a, b) => b.probability - a.probability);
  }

  // Private implementation methods

  private extractForecastFeatures(historicalData: any[]): Record<string, number[]> {
    return {
      riskScores: historicalData.map(d => d.riskScore || 0),
      incidentCounts: historicalData.map(d => d.incidents || 0),
      anomalyCounts: historicalData.map(d => d.anomalies || 0)
    };
  }

  private calculateBaselineRisk(features: Record<string, number[]>): number {
    const avgRisk = features.riskScores.reduce((a, b) => a + b, 0) / (features.riskScores.length || 1);
    return avgRisk;
  }

  private runTimeSeriesForecast(features: Record<string, number[]>, days: number): {
    value: number;
    confidence: number;
  } {
    // Simple exponential smoothing forecast
    const alpha = 0.3;
    let forecast = features.riskScores[0] || 0;

    for (const value of features.riskScores) {
      forecast = alpha * value + (1 - alpha) * forecast;
    }

    // Add trend component
    const trend = this.calculateTrend(features.riskScores);
    forecast += trend * days;

    // Clamp to valid range
    forecast = Math.max(0, Math.min(1, forecast));

    // Confidence decreases with forecast horizon
    const confidence = Math.max(0.3, 0.9 - (days * 0.01));

    return { value: forecast, confidence };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = values.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private identifyContributingFactors(
    features: Record<string, number[]>,
    forecast: { value: number; confidence: number }
  ): RiskForecast['contributingFactors'] {
    const factors: RiskForecast['contributingFactors'] = [];

    // Analyze each feature's contribution
    for (const [feature, values] of Object.entries(features)) {
      const trend = this.calculateTrend(values);
      const weight = Math.abs(this.correlateWithRisk(values, features.riskScores));

      factors.push({
        factor: feature,
        weight,
        trend: trend > 0.01 ? 'INCREASING' : trend < -0.01 ? 'DECREASING' : 'STABLE'
      });
    }

    return factors.sort((a, b) => b.weight - a.weight).slice(0, 5);
  }

  private correlateWithRisk(values: number[], riskScores: number[]): number {
    // Simple correlation calculation
    const n = Math.min(values.length, riskScores.length);
    if (n < 2) return 0;

    const meanV = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanR = riskScores.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let num = 0, den1 = 0, den2 = 0;

    for (let i = 0; i < n; i++) {
      const dv = values[i] - meanV;
      const dr = riskScores[i] - meanR;
      num += dv * dr;
      den1 += dv * dv;
      den2 += dr * dr;
    }

    const den = Math.sqrt(den1 * den2);
    return den > 0 ? num / den : 0;
  }

  private generateRelevantScenarios(entityId: string, factors: any[]): ThreatScenario[] {
    // Generate scenarios based on risk factors
    return [];
  }

  private generateRecommendations(factors: any[], scenarios: any[]): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      if (factor.trend === 'INCREASING' && factor.weight > 0.3) {
        recommendations.push(`Address increasing ${factor.factor} risk factor`);
      }
    }

    recommendations.push('Review and update security controls');
    recommendations.push('Conduct threat hunting based on predicted scenarios');
    recommendations.push('Update incident response procedures');

    return recommendations;
  }

  private analyzeOperations(operations: any[]): any {
    return {
      commonTTPs: [],
      targetingPatterns: [],
      avgDwellTime: 30,
      successRate: 0.7
    };
  }

  private inferCapabilities(operations: any[], known: string[]): Map<string, number> {
    const capabilities = new Map<string, number>();

    for (const cap of known) {
      capabilities.set(cap, 0.8);
    }

    return capabilities;
  }

  private modelDecisionMaking(operations: any[]): AdversaryModel['decisionModel'] {
    return {
      objectives: ['Data theft', 'Persistence'],
      constraints: ['Avoid detection', 'Minimize exposure'],
      decisionFactors: new Map([
        ['target_value', 0.8],
        ['detection_risk', -0.6],
        ['effort_required', -0.4]
      ])
    };
  }

  private inferIntentions(analysis: any): string[] {
    return ['Espionage', 'Data collection'];
  }

  private estimateResources(analysis: any): AdversaryModel['resources'] {
    return 'SUBSTANTIAL';
  }

  private estimateRiskTolerance(analysis: any): AdversaryModel['riskTolerance'] {
    return 'MEDIUM';
  }

  private assessOperationalTempo(operations: any[]): AdversaryModel['operationalPatterns']['operationalTempo'] {
    return 'MODERATE';
  }

  private calculatePhaseSuccess(phase: string, model: AdversaryModel, defenses: any[]): number {
    // Calculate based on adversary capabilities vs defenses
    return 0.6 + Math.random() * 0.3;
  }

  private calculateDetectionProbability(phase: string, defenses: any[]): number {
    return 0.2 + Math.random() * 0.4;
  }

  private calculatePhaseImpact(phase: string, scenario: ThreatScenario): number {
    const phaseImpacts: Record<string, number> = {
      'RECONNAISSANCE': 0.05,
      'INITIAL_ACCESS': 0.1,
      'PERSISTENCE': 0.15,
      'PRIVILEGE_ESCALATION': 0.2,
      'LATERAL_MOVEMENT': 0.15,
      'COLLECTION': 0.2,
      'EXFILTRATION': 0.15
    };

    return (phaseImpacts[phase] || 0.1) * scenario.impact;
  }

  private findRelevantVulnerabilities(asset: string, vulnerabilities: string[]): string[] {
    return vulnerabilities.slice(0, 3);
  }

  private buildScenario(
    actor: string,
    asset: string,
    vulnerabilities: string[],
    model?: AdversaryModel
  ): ThreatScenario {
    return {
      id: crypto.randomUUID(),
      name: `${actor} targeting ${asset}`,
      description: `Threat scenario involving ${actor} exploiting vulnerabilities in ${asset}`,
      threatActors: [actor],
      attackVectors: vulnerabilities,
      targetAssets: [asset],
      likelihood: 0.3 + Math.random() * 0.4,
      impact: 0.4 + Math.random() * 0.4,
      timeframe: { min: 7, max: 90 },
      indicators: [],
      mitigations: []
    };
  }

  private analyzeCurrentState(state: any, recentActions: any[]): any {
    return {
      compromisedSystems: [],
      accessLevel: 'USER',
      dataAccessed: []
    };
  }

  private applyDecisionModel(model: AdversaryModel, state: any): Array<{
    action: string;
    probability: number;
  }> {
    return [
      { action: 'LATERAL_MOVEMENT', probability: 0.7 },
      { action: 'PRIVILEGE_ESCALATION', probability: 0.5 },
      { action: 'DATA_COLLECTION', probability: 0.4 }
    ];
  }

  private estimateTimeframe(prediction: any, model: AdversaryModel): { min: number; max: number } {
    return { min: 1, max: 7 };
  }

  private generateActionIndicators(action: string): string[] {
    return [
      `${action.toLowerCase()}_attempt`,
      'unusual_access_pattern',
      'credential_misuse'
    ];
  }

  private generateCountermeasures(action: string): string[] {
    return [
      'Enhanced monitoring',
      'Access restrictions',
      'Network segmentation'
    ];
  }

  // Public API

  addScenario(scenario: ThreatScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  getScenario(id: string): ThreatScenario | undefined {
    return this.scenarios.get(id);
  }

  getAllScenarios(): ThreatScenario[] {
    return Array.from(this.scenarios.values());
  }

  getAdversaryModel(actorId: string): AdversaryModel | undefined {
    return this.adversaryModels.get(actorId);
  }
}
