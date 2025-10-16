export type AdvisorContext = {
  modalityCount: number;
  seriesDensity: 'sparse' | 'medium' | 'dense';
  requiresCausality: boolean;
  geoSpreadKm: number;
  userIntent: 'explore' | 'explain' | 'counterfactual' | 'narrative';
  acceptedRecommendations: number;
  rejectedRecommendations: number;
};

export type VisualizationRecommendation = {
  id: string;
  label: string;
  rationale: string;
  confidence: number;
};

const VIEW_PRIORS: Record<string, VisualizationRecommendation> = {
  hypercube: {
    id: 'hypercube',
    label: 'Space-Time Hypercube',
    rationale: 'Immersive 3D slice through time and space',
    confidence: 0.6
  },
  eventField: {
    id: 'eventField',
    label: 'Uncertainty Event Field',
    rationale: 'Layered reliability and drift overlays',
    confidence: 0.55
  },
  graphCanvas: {
    id: 'graphCanvas',
    label: 'Explainability Graph Canvas',
    rationale: 'Temporal attribution trail across entities',
    confidence: 0.5
  },
  scenarioTwin: {
    id: 'scenarioTwin',
    label: 'Scenario Twin Dashboard',
    rationale: 'Counterfactual deltas and Pareto surfaces',
    confidence: 0.5
  },
  narrative: {
    id: 'narrative',
    label: 'Narrative Map Generator',
    rationale: 'Auto-generated brief with citations',
    confidence: 0.45
  }
};

export function recommendVisualization(context: AdvisorContext): VisualizationRecommendation {
  const recommendation = { ...VIEW_PRIORS.hypercube };
  let score = recommendation.confidence;

  if (context.userIntent === 'counterfactual') {
    return {
      ...VIEW_PRIORS.scenarioTwin,
      confidence: 0.75
    };
  }

  if (context.requiresCausality) {
    score += 0.15;
  }

  if (context.modalityCount > 2) {
    return {
      ...VIEW_PRIORS.eventField,
      confidence: 0.7
    };
  }

  if (context.seriesDensity === 'dense' || context.geoSpreadKm > 500) {
    score += 0.1;
  }

  const totalRecommendations = context.acceptedRecommendations + context.rejectedRecommendations;
  const acceptanceRatio = totalRecommendations === 0 ? 0.5 : context.acceptedRecommendations / totalRecommendations;
  const calibratedConfidence = Math.min(0.9, Math.max(0.2, score * (0.8 + acceptanceRatio * 0.4)));

  if (context.userIntent === 'narrative') {
    return {
      ...VIEW_PRIORS.narrative,
      confidence: calibratedConfidence
    };
  }

  if (context.requiresCausality) {
    return {
      ...VIEW_PRIORS.graphCanvas,
      confidence: calibratedConfidence
    };
  }

  return {
    ...recommendation,
    confidence: calibratedConfidence
  };
}
