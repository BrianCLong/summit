import type {
  Artifact,
  Belief,
  BeliefGapMetric,
  BeliefClaimLink,
  DivergenceMetric,
  Narrative,
  NarrativeBeliefLink,
  NarrativeClaimLink,
  RealityClaim,
} from './types';

export interface CogBattleStorage {
  putArtifacts(data: Artifact[]): Promise<void>;
  putNarratives(data: Narrative[]): Promise<void>;
  putBeliefs(data: Belief[]): Promise<void>;
  getRealityClaimsByIds(ids: string[]): Promise<RealityClaim[]>;
  putLinks(data: {
    narrativeClaim?: NarrativeClaimLink[];
    beliefClaim?: BeliefClaimLink[];
    narrativeBelief?: NarrativeBeliefLink[];
  }): Promise<void>;
  putMetrics(data: {
    divergence?: DivergenceMetric[];
    beliefGap?: BeliefGapMetric[];
  }): Promise<void>;
  listTopNarratives(limit: number): Promise<Narrative[]>;
  listBeliefs(limit: number): Promise<Belief[]>;
  listDivergence(narrativeId?: string): Promise<DivergenceMetric[]>;
}

export class InMemoryCogBattleStorage implements CogBattleStorage {
  private readonly artifacts = new Map<string, Artifact>();
  private readonly narratives = new Map<string, Narrative>();
  private readonly beliefs = new Map<string, Belief>();
  private divergence: DivergenceMetric[] = [];
  private beliefGap: BeliefGapMetric[] = [];

  async putArtifacts(data: Artifact[]): Promise<void> {
    data.forEach((item) => this.artifacts.set(item.id, item));
  }

  async putNarratives(data: Narrative[]): Promise<void> {
    data.forEach((item) => this.narratives.set(item.id, item));
  }

  async putBeliefs(data: Belief[]): Promise<void> {
    data.forEach((item) => this.beliefs.set(item.id, item));
  }

  async getRealityClaimsByIds(_ids: string[]): Promise<RealityClaim[]> {
    return [];
  }

  async putLinks(_data: {
    narrativeClaim?: NarrativeClaimLink[];
    beliefClaim?: BeliefClaimLink[];
    narrativeBelief?: NarrativeBeliefLink[];
  }): Promise<void> {
    return;
  }

  async putMetrics(data: {
    divergence?: DivergenceMetric[];
    beliefGap?: BeliefGapMetric[];
  }): Promise<void> {
    if (data.divergence) {
      this.divergence = data.divergence;
    }
    if (data.beliefGap) {
      this.beliefGap = data.beliefGap;
    }
  }

  async listTopNarratives(limit: number): Promise<Narrative[]> {
    return Array.from(this.narratives.values())
      .sort((a, b) => b.metrics.velocity - a.metrics.velocity)
      .slice(0, limit);
  }

  async listBeliefs(limit: number): Promise<Belief[]> {
    return Array.from(this.beliefs.values()).slice(0, limit);
  }

  async listDivergence(narrativeId?: string): Promise<DivergenceMetric[]> {
    if (!narrativeId) {
      return this.divergence;
    }
    return this.divergence.filter((item) => item.narrativeId === narrativeId);
  }
}
