import { EventEmitter } from 'events';

type ChannelType =
  | 'workflow'
  | 'deployment'
  | 'incident'
  | 'cost'
  | 'experiment'
  | 'insight'
  | 'custom';

export interface KumorFMInteraction {
  entityId: string;
  timestamp: Date;
  weight?: number;
  channel?: ChannelType;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface KumorFMConfig {
  recencyHalfLifeHours: number;
  frequencyWindowDays: number;
  frequencyBaseline: number;
  magnitudeBaseline: number;
  weights: {
    recency: number;
    frequency: number;
    magnitude: number;
  };
  compositeScale: number;
}

export interface KumorFMScores {
  entityId: string;
  recency: number;
  frequency: number;
  magnitude: number;
  composite: number;
  totalInteractions: number;
  lastInteraction?: Date;
  momentum: number;
  segments: KumorFMSegment[];
  recommendedActions: string[];
}

export interface KumorFMSegment {
  id: string;
  name: string;
  description: string;
}

export interface KumorFMInsight {
  entityId: string;
  score: KumorFMScores;
  narrative: string;
}

type InternalInteraction = KumorFMInteraction & { timestamp: Date };

const DEFAULT_CONFIG: KumorFMConfig = {
  recencyHalfLifeHours: 24,
  frequencyWindowDays: 30,
  frequencyBaseline: 12,
  magnitudeBaseline: 3,
  weights: {
    recency: 0.4,
    frequency: 0.35,
    magnitude: 0.25,
  },
  compositeScale: 100,
};

/**
 * KumorFM - Knowledge Utility Matrix for Operational Relationship Frequency Modeling
 *
 * The KumorFM engine translates raw collaboration signals into an actionable RFM-like
 * score tuned for the IntelGraph delivery organization. It captures how recently
 * a partner engaged with the platform, how frequently they return, and the magnitude
 * of their impact so that product, operations, and go-to-market teams can prioritize
 * enablement.
 */
export class KumorFM extends EventEmitter {
  private readonly config: KumorFMConfig;

  private readonly interactions: Map<string, InternalInteraction[]> = new Map();

  private readonly scores: Map<string, KumorFMScores> = new Map();

  constructor(config?: Partial<KumorFMConfig>) {
    super();
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_CONFIG.weights,
        ...(config?.weights ?? {}),
      },
    };
  }

  /** Record a single interaction and update the scorecard. */
  recordInteraction(interaction: KumorFMInteraction): KumorFMScores {
    const interactionWithDate: InternalInteraction = {
      ...interaction,
      timestamp: new Date(interaction.timestamp),
      weight: interaction.weight ?? 1,
    };

    const existing = this.interactions.get(interaction.entityId) ?? [];
    existing.push(interactionWithDate);
    existing.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    this.interactions.set(interaction.entityId, existing);

    const score = this.recalculateScore(interaction.entityId);
    this.emit('interaction:recorded', { interaction: interactionWithDate, score });
    return score;
  }

  /** Ingest a batch of interactions in timestamp order. */
  ingestBatch(interactions: KumorFMInteraction[]): Map<string, KumorFMScores> {
    const updatedEntities = new Set<string>();

    interactions
      .slice()
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .forEach((interaction) => {
        this.recordInteraction(interaction);
        updatedEntities.add(interaction.entityId);
      });

    return new Map(Array.from(updatedEntities).map((entityId) => [entityId, this.getScore(entityId)!]));
  }

  /** Retrieve the current KumorFM score for a given entity. */
  getScore(entityId: string): KumorFMScores | undefined {
    return this.scores.get(entityId);
  }

  /**
   * Rank entities by their composite score. Useful for surfacing the most
   * valuable customers or integrations to Sales and Customer Success.
   */
  getTopEntities(limit = 10): KumorFMScores[] {
    return Array.from(this.scores.values())
      .sort((a, b) => b.composite - a.composite)
      .slice(0, limit);
  }

  /** Segment entities into activation cohorts. */
  segmentEntities(): Record<string, KumorFMScores[]> {
    return Array.from(this.scores.values()).reduce<Record<string, KumorFMScores[]>>((segments, score) => {
      score.segments.forEach((segment) => {
        const key = segment.id;
        if (!segments[key]) {
          segments[key] = [];
        }
        segments[key].push(score);
      });
      return segments;
    }, {});
  }

  /** Provide an executive-readable narrative for the entity. */
  explainEntity(entityId: string): KumorFMInsight | undefined {
    const score = this.getScore(entityId);
    if (!score) {
      return undefined;
    }

    const [primarySegment] = score.segments;
    const recentChange = score.momentum >= 0 ? 'improved momentum' : 'decelerating engagement';
    const narrative = [
      `${entityId} sits in the ${primarySegment.name} segment with a composite KumorFM score of ${score.composite.toFixed(1)}.`,
      `Recency is ${(score.recency * 100).toFixed(0)}% of the target curve and frequency is ${(score.frequency * 100).toFixed(0)}% of our activation baseline.`,
      `We have observed ${score.totalInteractions} interactions with ${recentChange}, suggesting ${this.getActionQualifier(score)}.`,
    ].join(' ');

    return { entityId, score, narrative };
  }

  /** Serialize the current scorecard for dashboards or API responses. */
  toJSON(): KumorFMScores[] {
    return Array.from(this.scores.values());
  }

  private recalculateScore(entityId: string): KumorFMScores {
    const interactions = this.interactions.get(entityId) ?? [];
    const now = Date.now();

    const recency = this.computeRecency(interactions, now);
    const { frequency, momentum } = this.computeFrequency(interactions, now);
    const magnitude = this.computeMagnitude(interactions);

    const weights = this.config.weights;
    const compositeRaw =
      recency * weights.recency +
      frequency * weights.frequency +
      magnitude * weights.magnitude;

    const composite = Number((compositeRaw / (weights.recency + weights.frequency + weights.magnitude)) * this.config.compositeScale);

    const segments = this.deriveSegments(composite);
    const recommendedActions = this.createRecommendations(composite, momentum, interactions[interactions.length - 1]);

    const score: KumorFMScores = {
      entityId,
      recency,
      frequency,
      magnitude,
      composite,
      totalInteractions: interactions.length,
      lastInteraction: interactions[interactions.length - 1]?.timestamp,
      momentum,
      segments,
      recommendedActions,
    };

    this.scores.set(entityId, score);
    return score;
  }

  private computeRecency(interactions: InternalInteraction[], now: number): number {
    if (interactions.length === 0) {
      return 0;
    }

    const halfLife = this.config.recencyHalfLifeHours;
    const decay = interactions.map((interaction) => {
      const hoursAgo = (now - interaction.timestamp.getTime()) / 3_600_000;
      return Math.exp(-hoursAgo / halfLife) * (interaction.weight ?? 1);
    });

    const averageDecay = decay.reduce((total, value) => total + value, 0) / decay.length;
    return Math.min(1, Number(averageDecay.toFixed(4)));
  }

  private computeFrequency(interactions: InternalInteraction[], now: number): { frequency: number; momentum: number } {
    if (interactions.length === 0) {
      return { frequency: 0, momentum: 0 };
    }

    const windowMs = this.config.frequencyWindowDays * 86_400_000;
    const baseline = this.config.frequencyBaseline;

    const recent = interactions.filter((interaction) => now - interaction.timestamp.getTime() <= windowMs);
    const previous = interactions.filter(
      (interaction) =>
        now - interaction.timestamp.getTime() > windowMs && now - interaction.timestamp.getTime() <= windowMs * 2,
    );

    const recentScore = Math.min(1, recent.length / baseline);
    const previousScore = Math.min(1, previous.length / baseline);

    return {
      frequency: Number(recentScore.toFixed(4)),
      momentum: Number((recentScore - previousScore).toFixed(4)),
    };
  }

  private computeMagnitude(interactions: InternalInteraction[]): number {
    if (interactions.length === 0) {
      return 0;
    }

    const averageWeight =
      interactions.reduce((total, interaction) => total + (interaction.weight ?? 1), 0) / interactions.length;

    const normalized = Math.min(1, averageWeight / this.config.magnitudeBaseline);
    return Number(normalized.toFixed(4));
  }

  private deriveSegments(composite: number): KumorFMSegment[] {
    if (composite >= 80) {
      return [
        {
          id: 'advocate',
          name: 'Strategic Advocate',
          description: 'Consistently engaged with outsized delivery impact. Prioritize co-innovation.',
        },
      ];
    }

    if (composite >= 50) {
      return [
        {
          id: 'growth',
          name: 'Growth Opportunity',
          description: 'Healthy interaction mix trending toward advocacy. Focus on expansion plays.',
        },
      ];
    }

    if (composite >= 20) {
      return [
        {
          id: 'nurture',
          name: 'Nurture Candidate',
          description: 'Early lifecycle relationship needing targeted enablement to activate.',
        },
      ];
    }

    return [
      {
        id: 'dormant',
        name: 'Dormant',
        description: 'Minimal engagement detected. Coordinate reactivation campaign.',
      },
    ];
  }

  private createRecommendations(
    composite: number,
    momentum: number,
    latestInteraction?: InternalInteraction,
  ): string[] {
    const actions: string[] = [];

    if (composite >= 80) {
      actions.push('Schedule joint roadmap workshop with executive sponsor.');
    } else if (composite >= 50) {
      actions.push('Offer targeted accelerator package to convert into advocacy segment.');
    } else if (composite >= 20) {
      actions.push('Trigger success playbook with enablement resources and office hours.');
    } else {
      actions.push('Launch re-engagement campaign with product marketing support.');
    }

    if (momentum < 0) {
      actions.push('Investigate declining cadence and deploy retention workflow.');
    } else if (momentum > 0.2) {
      actions.push('Capture testimonial or case study while engagement is accelerating.');
    }

    if (latestInteraction?.channel === 'incident') {
      actions.push('Follow-up to confirm resolution quality and capture learnings for reliability backlog.');
    }

    return actions;
  }

  private getActionQualifier(score: KumorFMScores): string {
    if (score.composite >= 80) {
      return 'a clear path to co-innovation.';
    }

    if (score.composite >= 50) {
      return 'strong upside if we apply the activation playbook.';
    }

    if (score.composite >= 20) {
      return 'we should mobilize nurture campaigns to avoid churn.';
    }

    return 'the account is at risk of attrition without intervention.';
  }
}
