import type {
  FederatedAttributionExplanation,
  FederatedAttributionExplanationFactor,
  FederatedAttributionLink,
  FederatedAttributionSummary,
  FederatedThreatScenario,
  FederatedTradeoff,
  PatentModelDesign
} from '../../common-types/src/index.js';

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

function severityWeight(severity: FederatedThreatScenario['severity']): number {
  switch (severity) {
    case 'high':
      return 1;
    case 'medium':
      return 0.7;
    case 'low':
    default:
      return 0.4;
  }
}

export interface FederatedAnalysisPayload {
  readonly tradeoff: FederatedTradeoff;
  readonly threatScenarios: readonly FederatedThreatScenario[];
  readonly modelDesign: PatentModelDesign;
}

export interface EnrichedThreatScenario extends FederatedThreatScenario {
  readonly riskLevel: number;
}

export interface AttributionFactorInsight {
  readonly label: string;
  readonly weight: number;
  readonly contribution: number;
}

export interface AttributionExplanationView {
  readonly focus: string;
  readonly domainCoverage: number;
  readonly prioritizedFactors: readonly AttributionFactorInsight[];
  readonly residualRisk: number;
  readonly supportingLinks: readonly FederatedAttributionLink[];
  readonly recommendedActions: readonly string[];
}

export interface FederatedDashboardState {
  readonly summary: FederatedAttributionSummary;
  readonly tradeoff: FederatedTradeoff;
  readonly threatScenarios: readonly EnrichedThreatScenario[];
  readonly explanation?: AttributionExplanationView;
  readonly modelDesign: PatentModelDesign;
  readonly privacyFitness: number;
}

export function enrichThreatScenario(scenario: FederatedThreatScenario): EnrichedThreatScenario {
  const severity = severityWeight(scenario.severity);
  const riskLevel = clamp((severity + scenario.detectionConfidence) / 2);
  return {
    ...scenario,
    riskLevel: Number(riskLevel.toFixed(3))
  };
}

export function computePrivacyFitness(
  summary: FederatedAttributionSummary,
  tradeoff: FederatedTradeoff
): number {
  const privacyProtection = clamp(1 - summary.privacyDelta, 0, 1);
  const combined = clamp(privacyProtection * 0.5 + tradeoff.utilityScore * 0.5, 0, 1);
  return Number(combined.toFixed(3));
}

function normalizeFactors(
  factors: readonly FederatedAttributionExplanationFactor[]
): readonly AttributionFactorInsight[] {
  if (factors.length === 0) {
    return [];
  }
  const total = factors.reduce((sum, factor) => sum + factor.weight, 0) || 1;
  return factors.map((factor) => ({
    label: factor.label,
    weight: Number(factor.weight.toFixed(3)),
    contribution: Number(clamp(factor.weight / total, 0, 1).toFixed(3))
  }));
}

function recommendedActionsFor(
  focus: string,
  scenarios: readonly EnrichedThreatScenario[]
): readonly string[] {
  const match = scenarios.find((scenario) => scenario.actor === focus);
  if (!match) {
    return [];
  }
  return [...new Set(match.recommendedActions)];
}

export function buildExplanationView(
  explanation: FederatedAttributionExplanation,
  scenarios: readonly EnrichedThreatScenario[]
): AttributionExplanationView {
  const supportingLinks = [...explanation.supportingLinks]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5) as ReadonlyArray<FederatedAttributionLink>;
  const coverage = explanation.supportingLinks.length === 0
    ? 0
    : clamp(explanation.domains.length / explanation.supportingLinks.length, 0, 1);
  return {
    focus: explanation.focus,
    domainCoverage: Number(coverage.toFixed(3)),
    prioritizedFactors: normalizeFactors(explanation.topFactors),
    residualRisk: Number(explanation.residualRisk.toFixed(3)),
    supportingLinks,
    recommendedActions: recommendedActionsFor(explanation.focus, scenarios)
  };
}

export function buildFederatedDashboard(params: {
  summary: FederatedAttributionSummary;
  analysis: FederatedAnalysisPayload;
  explanation?: FederatedAttributionExplanation;
}): FederatedDashboardState {
  const sortedLinks = [...params.summary.crossDomainLinks]
    .sort((a, b) => b.confidence - a.confidence) as ReadonlyArray<FederatedAttributionLink>;
  const summary: FederatedAttributionSummary = {
    totalEntities: params.summary.totalEntities,
    crossDomainLinks: sortedLinks,
    privacyDelta: params.summary.privacyDelta,
    pamagScore: params.summary.pamagScore
  };
  const scenarios = params.analysis.threatScenarios.map(enrichThreatScenario);
  const privacyFitness = computePrivacyFitness(summary, params.analysis.tradeoff);
  const explanation = params.explanation
    ? buildExplanationView(params.explanation, scenarios)
    : undefined;
  return {
    summary,
    tradeoff: params.analysis.tradeoff,
    threatScenarios: scenarios,
    explanation,
    modelDesign: params.analysis.modelDesign,
    privacyFitness
  };
}

export const ui = {
  buildFederatedDashboard,
  buildExplanationView,
  computePrivacyFitness,
  enrichThreatScenario
};
