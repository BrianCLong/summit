import type { ExplanationStep, QueryIntent } from './types.js';

export interface ModelWeights {
  bias: number;
  tokens: Record<string, number>;
}

export interface ModelPrediction {
  intent: QueryIntent;
  confidence: number;
  probabilities: Record<QueryIntent, number>;
  explanation: ExplanationStep;
}

const SOFTMAX_FLOOR = 1e-6;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildFeatures = (query: string) => {
  const tokens = normalize(query).split(' ').filter(Boolean);
  const features = new Set<string>();

  tokens.forEach((token) => features.add(token));

  for (let i = 0; i < tokens.length - 1; i += 1) {
    features.add(`${tokens[i]}_${tokens[i + 1]}`);
  }

  return { tokens, features };
};

export class LightweightIntentModel {
  private readonly weights: Record<QueryIntent, ModelWeights>;

  constructor(weights: Record<QueryIntent, ModelWeights>) {
    this.weights = weights;
  }

  public predict(query: string): ModelPrediction {
    const { features } = buildFeatures(query);

    const scores = new Map<QueryIntent, number>();
    let maxScore = Number.NEGATIVE_INFINITY;

    (Object.keys(this.weights) as QueryIntent[]).forEach((intent) => {
      const { bias, tokens } = this.weights[intent];
      let score = bias;

      features.forEach((feature) => {
        const weight = tokens[feature];
        if (weight) {
          score += weight;
        }
      });

      scores.set(intent, score);
      maxScore = Math.max(maxScore, score);
    });

    const expScores = new Map<QueryIntent, number>();
    let total = 0;

    scores.forEach((score, intent) => {
      const adjusted = Math.exp(score - maxScore);
      expScores.set(intent, adjusted);
      total += adjusted;
    });

    const probabilities: Record<QueryIntent, number> = {
      analytics: SOFTMAX_FLOOR,
      marketing: SOFTMAX_FLOOR,
      support: SOFTMAX_FLOOR,
      fraud: SOFTMAX_FLOOR,
      research: SOFTMAX_FLOOR,
      unknown: SOFTMAX_FLOOR,
    };

    expScores.forEach((value, intent) => {
      probabilities[intent] = value / Math.max(total, SOFTMAX_FLOOR);
    });

    let bestIntent: QueryIntent = 'unknown';
    let bestProbability = probabilities[bestIntent];

    (Object.keys(probabilities) as QueryIntent[]).forEach((intent) => {
      if (probabilities[intent] > bestProbability) {
        bestIntent = intent;
        bestProbability = probabilities[intent];
      }
    });

    const activeFeatures = new Set(features);

    const sortedContributions = Object.entries(this.weights[bestIntent]?.tokens ?? {})
      .filter(([feature]) => activeFeatures.has(feature))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([feature, weight]) => ({ feature, weight }));

    const explanation: ExplanationStep = {
      stage: 'model',
      intent: bestIntent,
      confidence: Number(bestProbability.toFixed(4)),
      description: `Lightweight model selected ${bestIntent} intent`,
      details: {
        scores: Object.fromEntries(scores),
        topContributors: sortedContributions,
      },
    };

    return {
      intent: bestIntent,
      confidence: bestProbability,
      probabilities,
      explanation,
    };
  }
}

export const defaultModelWeights: Record<QueryIntent, ModelWeights> = {
  analytics: {
    bias: -0.4,
    tokens: {
      metric: 1.1,
      metrics: 1.0,
      dashboard: 1.2,
      dashboards: 1.0,
      kpi: 1.05,
      kpis: 1.0,
      insight: 0.8,
      insights: 0.8,
      trend: 0.95,
      trends: 0.9,
      forecast: 0.85,
      variance: 0.7,
      report: 0.9,
      reporting: 0.85,
      'time_series': 0.8,
      'region_performance': 0.75,
    },
  },
  marketing: {
    bias: -0.5,
    tokens: {
      campaign: 1.1,
      campaigns: 1.0,
      conversion: 1.05,
      conversions: 1.05,
      ctr: 0.9,
      click: 0.8,
      clicks: 0.8,
      impression: 0.85,
      impressions: 0.85,
      retargeting: 0.95,
      acquisition: 0.9,
      funnel: 0.75,
      lead: 0.9,
      leads: 0.9,
      nurture: 0.7,
      'campaign_performance': 0.9,
    },
  },
  support: {
    bias: -0.3,
    tokens: {
      ticket: 1.1,
      tickets: 1.05,
      help: 0.9,
      helpdesk: 1.0,
      incident: 0.95,
      outage: 0.95,
      downtime: 0.9,
      troubleshoot: 0.85,
      troubleshooting: 0.85,
      bug: 0.8,
      error: 0.8,
      escalation: 0.75,
      customer: 0.6,
      'service_request': 0.9,
    },
  },
  fraud: {
    bias: -0.55,
    tokens: {
      fraud: 1.3,
      fraudulent: 1.25,
      chargeback: 1.2,
      chargebacks: 1.1,
      laundering: 1.15,
      aml: 1.05,
      suspicious: 1.05,
      alert: 0.7,
      alerts: 0.7,
      theft: 0.8,
      takeover: 0.9,
      'account_takeover': 1.1,
      'stolen_card': 1.1,
    },
  },
  research: {
    bias: -0.35,
    tokens: {
      research: 1.2,
      study: 1.1,
      studies: 1.0,
      hypothesis: 1.0,
      survey: 0.95,
      surveys: 0.95,
      experiment: 0.9,
      literature: 0.85,
      publication: 0.85,
      paper: 0.9,
      academic: 0.9,
      review: 0.7,
      'peer_review': 0.9,
      'experiment_design': 0.85,
    },
  },
  unknown: {
    bias: -0.2,
    tokens: {},
  },
};
