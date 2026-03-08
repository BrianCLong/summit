"use strict";
// @ts-nocheck
/**
 * Strategic Foresight AI Suite Client
 *
 * Provides integration with the Strategic Foresight service for
 * predictive analytics, scenario planning, and strategic recommendations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategicForesightClient = exports.StrategicForesightClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const otel_js_1 = require("../otel.js");
const tracer = typeof otel_js_1.getTracer === 'function'
    ? (0, otel_js_1.getTracer)('strategic-foresight-client')
    : { startSpan: () => ({ end: () => { } }) };
// Map TypeScript enums to Python enums
const timeHorizonMap = {
    SHORT_TERM: 'short_term',
    MEDIUM_TERM: 'medium_term',
    LONG_TERM: 'long_term',
};
const reverseTimeHorizonMap = {
    short_term: 'SHORT_TERM',
    medium_term: 'MEDIUM_TERM',
    long_term: 'LONG_TERM',
};
class StrategicForesightClient {
    baseUrl;
    timeout;
    constructor(options) {
        this.baseUrl =
            options?.baseUrl ||
                process.env.STRATEGIC_FORESIGHT_URL ||
                'http://strategic-foresight:8003';
        this.timeout = options?.timeout || 30000;
    }
    async fetchWithTimeout(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}${endpoint}`, {
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
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    transformTrend(trend) {
        return {
            trendId: trend.trend_id,
            trendType: trend.trend_type.toUpperCase(),
            title: trend.title,
            description: trend.description,
            confidence: trend.confidence,
            impactScore: trend.impact_score,
            timeHorizon: reverseTimeHorizonMap[trend.time_horizon],
            keyDrivers: trend.key_drivers,
            affectedSectors: trend.affected_sectors,
            recommendedActions: trend.recommended_actions,
            evidenceSources: trend.evidence_sources,
        };
    }
    transformThreat(threat) {
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
    transformPartnership(opp) {
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
    transformScenario(scenario) {
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
    transformRecommendation(rec) {
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
    transformPivot(pivot) {
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
    async analyze(input) {
        const span = tracer.startSpan('strategicForesight.analyze');
        try {
            const response = await this.fetchWithTimeout('/analyze', {
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
            return {
                analysisId: response.analysis_id,
                generatedAt: response.generated_at,
                domain: response.domain,
                trends: response.trends.map((t) => this.transformTrend(t)),
                threats: response.threats.map((t) => this.transformThreat(t)),
                partnerships: response.partnerships.map((p) => this.transformPartnership(p)),
                scenarios: response.scenarios.map((s) => this.transformScenario(s)),
                recommendations: response.recommendations.map((r) => this.transformRecommendation(r)),
                executiveSummary: response.executive_summary,
                processingTimeMs: response.processing_time_ms,
            };
        }
        finally {
            span.end();
        }
    }
    async getMarketTrends(input) {
        const span = tracer.startSpan('strategicForesight.getMarketTrends');
        try {
            const response = await this.fetchWithTimeout('/trends', {
                method: 'POST',
                body: JSON.stringify({
                    domain: input.domain,
                    indicators: input.indicators || [],
                    entities: input.entities || [],
                    time_horizon: timeHorizonMap[input.timeHorizon || 'MEDIUM_TERM'],
                }),
            });
            return response.map((t) => this.transformTrend(t));
        }
        finally {
            span.end();
        }
    }
    async getCompetitiveThreats(competitors, domain) {
        const span = tracer.startSpan('strategicForesight.getCompetitiveThreats');
        try {
            const response = await this.fetchWithTimeout(`/threats?domain=${encodeURIComponent(domain)}`, {
                method: 'POST',
                body: JSON.stringify(competitors),
            });
            return response.map((t) => this.transformThreat(t));
        }
        finally {
            span.end();
        }
    }
    async getPartnershipOpportunities(domain, capabilities = []) {
        const span = tracer.startSpan('strategicForesight.getPartnershipOpportunities');
        try {
            const params = new URLSearchParams({ domain });
            capabilities.forEach((c) => params.append('capabilities', c));
            const response = await this.fetchWithTimeout(`/partnerships?${params.toString()}`, {
                method: 'POST',
            });
            return response.map((p) => this.transformPartnership(p));
        }
        finally {
            span.end();
        }
    }
    async getScenarios(input) {
        const span = tracer.startSpan('strategicForesight.getScenarios');
        try {
            const response = await this.fetchWithTimeout('/scenarios', {
                method: 'POST',
                body: JSON.stringify({
                    base_conditions: JSON.parse(input.baseConditions),
                    variables: input.variables,
                    constraints: input.constraints || [],
                    time_horizon: timeHorizonMap[input.timeHorizon || 'MEDIUM_TERM'],
                    scenario_count: input.scenarioCount || 3,
                }),
            });
            return response.map((s) => this.transformScenario(s));
        }
        finally {
            span.end();
        }
    }
    async getPivotOpportunities(input) {
        const span = tracer.startSpan('strategicForesight.getPivotOpportunities');
        try {
            const response = await this.fetchWithTimeout('/pivots', {
                method: 'POST',
                body: JSON.stringify({
                    current_position: input.currentPosition,
                    capabilities: input.capabilities,
                    market_signals: input.marketSignals,
                    constraints: input.constraints || [],
                }),
            });
            return response.map((p) => this.transformPivot(p));
        }
        finally {
            span.end();
        }
    }
    async health() {
        return this.fetchWithTimeout('/health');
    }
}
exports.StrategicForesightClient = StrategicForesightClient;
exports.strategicForesightClient = new StrategicForesightClient();
