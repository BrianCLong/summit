import type {
  IOActorActivity,
  IOActorGraphEdge,
  IOActorScore,
  IOActorScoringOptions,
} from './types';

const DEFAULT_WEIGHTS = {
  synchrony: 0.3,
  sharedUrls: 0.25,
  templateSimilarity: 0.25,
  graphCentrality: 0.2,
};

const DEFAULT_THRESHOLDS = {
  synchrony: 0.6,
  sharedUrls: 0.5,
  templateSimilarity: 0.5,
  graphCentrality: 0.5,
};

const DEFAULT_RISK = {
  medium: 0.45,
  high: 0.65,
  critical: 0.8,
};

function clamp(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function normalizeTemplate(content: string): string {
  return content
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, 'url')
    .replace(/[0-9]+/g, '0')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class IOActorScorer {
  private readonly windowMs: number;

  private readonly weights: typeof DEFAULT_WEIGHTS;

  private readonly thresholds: typeof DEFAULT_THRESHOLDS;

  private readonly risk: typeof DEFAULT_RISK;

  constructor(options?: IOActorScoringOptions) {
    this.windowMs = options?.synchronyWindowMs ?? 5 * 60 * 1000;
    this.weights = {
      ...DEFAULT_WEIGHTS,
      ...options?.weights,
    };
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...options?.evidenceThresholds,
    };
    this.risk = {
      ...DEFAULT_RISK,
      ...options?.riskThresholds,
    };
  }

  scoreActors(activities: IOActorActivity[], edges: IOActorGraphEdge[]): IOActorScore[] {
    if (activities.length === 0) {
      return [];
    }

    const actors = Array.from(new Set(activities.map((activity) => activity.actorId)));
    const synchrony = this.computeSynchronyScores(activities, actors);
    const sharedUrls = this.computeSharedUrlScores(activities, actors);
    const templates = this.computeTemplateScores(activities, actors);
    const centrality = this.computeCentralityScores(edges, actors);

    return actors
      .map((actorId) => {
        const signals = {
          synchrony: synchrony.get(actorId) ?? 0,
          sharedUrls: sharedUrls.get(actorId) ?? 0,
          templateSimilarity: templates.get(actorId) ?? 0,
          graphCentrality: centrality.get(actorId) ?? 0,
        };
        const composite = this.calculateComposite(signals);
        const evidence = this.buildEvidence(signals);
        return {
          actorId,
          signals,
          compositeScore: composite,
          riskLevel: this.riskLevel(composite),
          evidence,
        } satisfies IOActorScore;
      })
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }

  private calculateComposite(signals: IOActorScore['signals']): number {
    const weights = this.weights;
    const weightSum = weights.synchrony + weights.sharedUrls + weights.templateSimilarity + weights.graphCentrality;
    if (weightSum === 0) {
      return 0;
    }
    const weighted =
      signals.synchrony * weights.synchrony +
      signals.sharedUrls * weights.sharedUrls +
      signals.templateSimilarity * weights.templateSimilarity +
      signals.graphCentrality * weights.graphCentrality;
    return clamp(weighted / weightSum);
  }

  private riskLevel(score: number): IOActorScore['riskLevel'] {
    if (score >= this.risk.critical) {
      return 'critical';
    }
    if (score >= this.risk.high) {
      return 'high';
    }
    if (score >= this.risk.medium) {
      return 'medium';
    }
    return 'low';
  }

  private buildEvidence(signals: IOActorScore['signals']): string[] {
    const evidence: string[] = [];
    if (signals.synchrony >= this.thresholds.synchrony) {
      evidence.push('synchrony clusters detected across coordination windows');
    }
    if (signals.sharedUrls >= this.thresholds.sharedUrls) {
      evidence.push('shared URL propagation above coordination threshold');
    }
    if (signals.templateSimilarity >= this.thresholds.templateSimilarity) {
      evidence.push('template-level text reuse indicates scripted coordination');
    }
    if (signals.graphCentrality >= this.thresholds.graphCentrality) {
      evidence.push('graph centrality exceeds coordination baseline');
    }
    if (evidence.length === 0) {
      evidence.push('signals below coordination thresholds');
    }
    return evidence;
  }

  private computeSynchronyScores(
    activities: IOActorActivity[],
    actors: string[],
  ): Map<string, number> {
    const buckets = new Map<number, Set<string>>();
    for (const activity of activities) {
      const bucket = Math.floor(activity.timestamp / this.windowMs);
      const existing = buckets.get(bucket);
      if (existing) {
        existing.add(activity.actorId);
      } else {
        buckets.set(bucket, new Set([activity.actorId]));
      }
    }

    const scores = new Map<string, number>();
    const actorCount = actors.length;
    for (const actor of actors) {
      let bucketsWithActor = 0;
      let sharedActors = 0;
      for (const actorSet of buckets.values()) {
        if (actorSet.has(actor)) {
          bucketsWithActor += 1;
          sharedActors += actorSet.size - 1;
        }
      }
      const maxPossible = bucketsWithActor * Math.max(actorCount - 1, 1);
      const score = maxPossible > 0 ? sharedActors / maxPossible : 0;
      scores.set(actor, clamp(score));
    }
    return scores;
  }

  private computeSharedUrlScores(
    activities: IOActorActivity[],
    actors: string[],
  ): Map<string, number> {
    const urlActors = new Map<string, Set<string>>();
    const actorUrls = new Map<string, Set<string>>();

    for (const activity of activities) {
      const urls = activity.urls ?? [];
      if (urls.length === 0) {
        continue;
      }
      const actorSet = actorUrls.get(activity.actorId) ?? new Set<string>();
      for (const url of urls) {
        const normalized = url.trim().toLowerCase();
        if (!normalized) {
          continue;
        }
        const actorsForUrl = urlActors.get(normalized) ?? new Set<string>();
        actorsForUrl.add(activity.actorId);
        urlActors.set(normalized, actorsForUrl);
        actorSet.add(normalized);
      }
      actorUrls.set(activity.actorId, actorSet);
    }

    const scores = new Map<string, number>();
    for (const actor of actors) {
      const urls = actorUrls.get(actor) ?? new Set<string>();
      if (urls.size === 0) {
        scores.set(actor, 0);
        continue;
      }
      let sharedCount = 0;
      for (const url of urls) {
        if ((urlActors.get(url)?.size ?? 0) > 1) {
          sharedCount += 1;
        }
      }
      scores.set(actor, clamp(sharedCount / urls.size));
    }
    return scores;
  }

  private computeTemplateScores(
    activities: IOActorActivity[],
    actors: string[],
  ): Map<string, number> {
    const templateActors = new Map<string, Set<string>>();
    const actorTemplates = new Map<string, Set<string>>();

    for (const activity of activities) {
      const base = activity.templateId ?? activity.content ?? '';
      if (!base.trim()) {
        continue;
      }
      const template = activity.templateId ?? normalizeTemplate(base);
      if (!template) {
        continue;
      }
      const actorsForTemplate = templateActors.get(template) ?? new Set<string>();
      actorsForTemplate.add(activity.actorId);
      templateActors.set(template, actorsForTemplate);

      const actorSet = actorTemplates.get(activity.actorId) ?? new Set<string>();
      actorSet.add(template);
      actorTemplates.set(activity.actorId, actorSet);
    }

    const scores = new Map<string, number>();
    for (const actor of actors) {
      const templates = actorTemplates.get(actor) ?? new Set<string>();
      if (templates.size === 0) {
        scores.set(actor, 0);
        continue;
      }
      let sharedCount = 0;
      for (const template of templates) {
        if ((templateActors.get(template)?.size ?? 0) > 1) {
          sharedCount += 1;
        }
      }
      scores.set(actor, clamp(sharedCount / templates.size));
    }
    return scores;
  }

  private computeCentralityScores(edges: IOActorGraphEdge[], actors: string[]): Map<string, number> {
    const degree = new Map<string, number>();
    for (const actor of actors) {
      degree.set(actor, 0);
    }
    for (const edge of edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    const maxDegree = Math.max(...degree.values(), 0);
    const scores = new Map<string, number>();
    for (const actor of actors) {
      const value = degree.get(actor) ?? 0;
      scores.set(actor, maxDegree > 0 ? clamp(value / maxDegree) : 0);
    }
    return scores;
  }
}
