/**
 * Strategic Foresight AI Suite Client
 *
 * Provides integration with the Strategic Foresight service for
 * predictive analytics, scenario planning, and strategic recommendations.
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('strategic-foresight-client');

export interface TrendPrediction {
  trendId: string;
  trendType: 'MARKET' | 'TECHNOLOGY' | 'REGULATORY' | 'GEOPOLITICAL' | 'COMPETITIVE';
  title: string;
  description: string;
  confidence: number;
  impactScore: number;
  timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  keyDrivers: string[];
  affectedSectors: string[];
  recommendedActions: string[];
  evidenceSources: string[];
}

export interface CompetitiveThreat {
  threatId: string;
  competitor: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threatType: string;
  description: string;
  confidence: number;
  timeToImpact: string;
  indicators: string[];
  countermeasures: string[];
  affectedCapabilities: string[];
}

export interface PartnershipOpportunity {
  opportunityId: string;
  partner: string;
  opportunityType: string;
  strategicFitScore: number;
  synergyAreas: string[];
  potentialValue: string;
  riskFactors: string[];
  recommendedApproach: string;
  timeSensitivity: string;
}

export interface Scenario {
  scenarioId: string;
  name: string;
  description: string;
  probability: number;
  impactAssessment: {
    revenueGrowth: number;
    marketShare: number;
    competitivePosition: number;
  };
  keyAssumptions: string[];
  triggerEvents: string[];
  recommendedPreparations: string[];
  opportunities: string[];
  risks: string[];
}

export interface StrategicRecommendation {
  recommendationId: string;
  title: string;
  description: string;
  priority: number;
  confidence: number;
  expectedOutcome: string;
  resourcesRequired: string[];
  timeline: string;
  successMetrics: string[];
  dependencies: string[];
}

export interface PivotOpportunity {
  pivotId: string;
  direction: string;
  description: string;
  feasibilityScore: number;
  marketPotential: string;
  capabilityGap: string[];
  timeline: string;
  risks: string[];
  successFactors: string[];
}

export interface ForesightAnalysis {
  analysisId: string;
  generatedAt: string;
  domain: string;
  trends: TrendPrediction[];
  threats: CompetitiveThreat[];
  partnerships: PartnershipOpportunity[];
  scenarios: Scenario[];
  recommendations: StrategicRecommendation[];
  executiveSummary: string;
  processingTimeMs: number;
}

export interface ForesightAnalysisInput {
  domain: string;
  focusAreas?: string[];
  competitors?: string[];
  timeHorizon?: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  scenarioCount?: number;
  includePartnerships?: boolean;
}

export interface MarketSignalInput {
  domain: string;
  indicators?: string[];
  entities?: string[];
  timeHorizon?: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
}

export interface ScenarioInput {
  baseConditions: string;
  variables: string[];
  constraints?: string[];
  timeHorizon?: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  scenarioCount?: number;
}

export interface PivotAnalysisInput {
  currentPosition: string;
  capabilities: string[];
  marketSignals: string[];
  constraints?: string[];
}

// Map TypeScript enums to Python enums
const timeHorizonMap: Record<string, string> = {
  SHORT_TERM: 'short_term',
  MEDIUM_TERM: 'medium_term',
  LONG_TERM: 'long_term',
};

const reverseTimeHorizonMap: Record<string, string> = {
  short_term: 'SHORT_TERM',
  medium_term: 'MEDIUM_TERM',
  long_term: 'LONG_TERM',
};

export class StrategicForesightClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options?: { baseUrl?: string; timeout?: number }) {
    this.baseUrl = options?.baseUrl || process.env.STRATEGIC_FORESIGHT_URL || 'http://strategic-foresight:8003';
    this.timeout = options?.timeout || 30000;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Strategic Foresight API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private transformTrend(trend: any): TrendPrediction {
    return {
      trendId: trend.trend_id,
      trendType: trend.trend_type.toUpperCase(),
      title: trend.title,
      description: trend.description,
      confidence: trend.confidence,
      impactScore: trend.impact_score,
      timeHorizon: reverseTimeHorizonMap[trend.time_horizon] as TrendPrediction['timeHorizon'],
      keyDrivers: trend.key_drivers,
      affectedSectors: trend.affected_sectors,
      recommendedActions: trend.recommended_actions,
      evidenceSources: trend.evidence_sources,
    };
  }

  private transformThreat(threat: any): CompetitiveThreat {
    return {
      threatId: threat.threat_id,
      competitor: threat.competitor,
      threatLevel: threat.threat_level.toUpperCase(),
      threatType: threat.threat_type,
      description: threat.description,
      confidence: threat.confidence,
      timeToImpact: threat.time_to_impact,
      indicators: threat.indicators,
      countermeasures: threat.countermeasures,
      affectedCapabilities: threat.affected_capabilities,
    };
  }

  private transformPartnership(opp: any): PartnershipOpportunity {
    return {
      opportunityId: opp.opportunity_id,
      partner: opp.partner,
      opportunityType: opp.opportunity_type,
      strategicFitScore: opp.strategic_fit_score,
      synergyAreas: opp.synergy_areas,
      potentialValue: opp.potential_value,
      riskFactors: opp.risk_factors,
      recommendedApproach: opp.recommended_approach,
      timeSensitivity: opp.time_sensitivity,
    };
  }

  private transformScenario(scenario: any): Scenario {
    return {
      scenarioId: scenario.scenario_id,
      name: scenario.name,
      description: scenario.description,
      probability: scenario.probability,
      impactAssessment: {
        revenueGrowth: scenario.impact_assessment.revenue_growth,
        marketShare: scenario.impact_assessment.market_share,
        competitivePosition: scenario.impact_assessment.competitive_position,
      },
      keyAssumptions: scenario.key_assumptions,
      triggerEvents: scenario.trigger_events,
      recommendedPreparations: scenario.recommended_preparations,
      opportunities: scenario.opportunities,
      risks: scenario.risks,
    };
  }

  private transformRecommendation(rec: any): StrategicRecommendation {
    return {
      recommendationId: rec.recommendation_id,
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      confidence: rec.confidence,
      expectedOutcome: rec.expected_outcome,
      resourcesRequired: rec.resources_required,
      timeline: rec.timeline,
      successMetrics: rec.success_metrics,
      dependencies: rec.dependencies,
    };
  }

  private transformPivot(pivot: any): PivotOpportunity {
    return {
      pivotId: pivot.pivot_id,
      direction: pivot.direction,
      description: pivot.description,
      feasibilityScore: pivot.feasibility_score,
      marketPotential: pivot.market_potential,
      capabilityGap: pivot.capability_gap,
      timeline: pivot.timeline,
      risks: pivot.risks,
      successFactors: pivot.success_factors,
    };
  }

  async analyze(input: ForesightAnalysisInput): Promise<ForesightAnalysis> {
    return tracer.startActiveSpan('strategicForesight.analyze', async (span) => {
      try {
        span.setAttribute('foresight.domain', input.domain);

        const response = await this.fetch<any>('/analyze', {
          method: 'POST',
          body: JSON.stringify({
            domain: input.domain,
            focus_areas: input.focusAreas || [],
            competitors: input.competitors || [],
            time_horizon: timeHorizonMap[input.timeHorizon || 'MEDIUM_TERM'],
            scenario_count: input.scenarioCount || 3,
            include_partnerships: input.includePartnerships !== false,
          }),
        });

        span.setStatus({ code: SpanStatusCode.OK });

        return {
          analysisId: response.analysis_id,
          generatedAt: response.generated_at,
          domain: response.domain,
          trends: response.trends.map((t: any) => this.transformTrend(t)),
          threats: response.threats.map((t: any) => this.transformThreat(t)),
          partnerships: response.partnerships.map((p: any) => this.transformPartnership(p)),
          scenarios: response.scenarios.map((s: any) => this.transformScenario(s)),
          recommendations: response.recommendations.map((r: any) => this.transformRecommendation(r)),
          executiveSummary: response.executive_summary,
          processingTimeMs: response.processing_time_ms,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getMarketTrends(input: MarketSignalInput): Promise<TrendPrediction[]> {
    return tracer.startActiveSpan('strategicForesight.getMarketTrends', async (span) => {
      try {
        const response = await this.fetch<any[]>('/trends', {
          method: 'POST',
          body: JSON.stringify({
            domain: input.domain,
            indicators: input.indicators || [],
            entities: input.entities || [],
            time_horizon: timeHorizonMap[input.timeHorizon || 'MEDIUM_TERM'],
          }),
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return response.map((t) => this.transformTrend(t));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getCompetitiveThreats(competitors: string[], domain: string): Promise<CompetitiveThreat[]> {
    return tracer.startActiveSpan('strategicForesight.getCompetitiveThreats', async (span) => {
      try {
        const response = await this.fetch<any[]>(`/threats?domain=${encodeURIComponent(domain)}`, {
          method: 'POST',
          body: JSON.stringify(competitors),
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return response.map((t) => this.transformThreat(t));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getPartnershipOpportunities(domain: string, capabilities: string[] = []): Promise<PartnershipOpportunity[]> {
    return tracer.startActiveSpan('strategicForesight.getPartnershipOpportunities', async (span) => {
      try {
        const params = new URLSearchParams({ domain });
        capabilities.forEach((c) => params.append('capabilities', c));

        const response = await this.fetch<any[]>(`/partnerships?${params.toString()}`, {
          method: 'POST',
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return response.map((p) => this.transformPartnership(p));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getScenarios(input: ScenarioInput): Promise<Scenario[]> {
    return tracer.startActiveSpan('strategicForesight.getScenarios', async (span) => {
      try {
        const response = await this.fetch<any[]>('/scenarios', {
          method: 'POST',
          body: JSON.stringify({
            base_conditions: JSON.parse(input.baseConditions),
            variables: input.variables,
            constraints: input.constraints || [],
            time_horizon: timeHorizonMap[input.timeHorizon || 'MEDIUM_TERM'],
            scenario_count: input.scenarioCount || 3,
          }),
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return response.map((s) => this.transformScenario(s));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getPivotOpportunities(input: PivotAnalysisInput): Promise<PivotOpportunity[]> {
    return tracer.startActiveSpan('strategicForesight.getPivotOpportunities', async (span) => {
      try {
        const response = await this.fetch<any[]>('/pivots', {
          method: 'POST',
          body: JSON.stringify({
            current_position: input.currentPosition,
            capabilities: input.capabilities,
            market_signals: input.marketSignals,
            constraints: input.constraints || [],
          }),
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return response.map((p) => this.transformPivot(p));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async health(): Promise<{ status: string; service: string; timestamp: string }> {
    return this.fetch('/health');
  }
}

export const strategicForesightClient = new StrategicForesightClient();
