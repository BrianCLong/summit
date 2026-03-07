import { randomUUID } from "node:crypto";
import type {
  AuditEntry,
  CandidateRequest,
  CandidateResponse,
  CandidateScore,
  DeduplicationRequest,
  EntityRecord,
  ExtractedEntity,
  ExtractionOptions,
  ExplainResponse,
  MergePreview,
  MergePreviewRequest,
  MergeRecord,
  MergeRequest,
  PredictionExplanation,
  ResolutionCluster,
  ScoringModel,
  ScoringOptions,
  ScoreDecision,
  ScoreThresholds,
  TemporalEvent,
  TemporalPattern,
} from "./types.js";

export interface StructuredLogger {
  info?(event: string, payload?: Record<string, unknown>): void;
  warn?(event: string, payload?: Record<string, unknown>): void;
  error?(event: string, payload?: Record<string, unknown>): void;
}

export interface MetricsRecorder {
  observe?(metric: string, value: number, attributes?: Record<string, string | number>): void;
  increment?(metric: string, value?: number, attributes?: Record<string, string | number>): void;
}

export interface TraceSpan {
  end(attributes?: Record<string, unknown>): void;
  recordException?(error: unknown): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, unknown>): TraceSpan | undefined;
}

export interface ObservabilityOptions {
  logger?: StructuredLogger;
  metrics?: MetricsRecorder;
  tracer?: Tracer;
}

const DEFAULT_THRESHOLDS: ScoreThresholds = {
  autoMerge: 0.9,
  review: 0.75,
};

const DEFAULT_RULES_MODEL: ScoringModel = {
  id: "rules-v1",
  version: "1.0.0",
  hash: "rules-only",
};

const DEFAULT_ML_MODEL: ScoringModel = {
  id: "ml-lite",
  version: "0.9.0",
  hash: "ml-lite-2026-01-12",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveThresholds(input?: ScoreThresholds): ScoreThresholds {
  return {
    autoMerge: input?.autoMerge ?? DEFAULT_THRESHOLDS.autoMerge,
    review: input?.review ?? DEFAULT_THRESHOLDS.review,
  };
}

function choosePrimary(candidates: EntityRecord[]): EntityRecord {
  return candidates.reduce((best, current) => {
    if (current.confidence !== undefined && best.confidence !== undefined) {
      return current.confidence > best.confidence ? current : best;
    }
    if (current.confidence !== undefined) {
      return current;
    }
    if (best.confidence !== undefined) {
      return best;
    }
    return current.name.localeCompare(best.name) < 0 ? current : best;
  });
}

function parseDate(value: string): number {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) {
    throw new Error(`Invalid timestamp ${value}`);
  }
  return ts;
}

function resolveScoring(input?: ScoringOptions): Required<ScoringOptions> {
  const mlEnabled = input?.mlEnabled ?? false;
  return {
    mlEnabled,
    mlBlend: input?.mlBlend ?? (mlEnabled ? 0.35 : 0),
    model: input?.model ?? (mlEnabled ? DEFAULT_ML_MODEL : DEFAULT_RULES_MODEL),
  };
}

function decideScore(score: number, thresholds: ScoreThresholds): ScoreDecision {
  if (score >= thresholds.autoMerge) {
    return "auto-merge";
  }
  if (score >= thresholds.review) {
    return "review";
  }
  return "reject";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((token) => setB.has(token));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[a.length][b.length];
  return 1 - distance / Math.max(a.length, b.length, 1);
}

function phoneticSignature(text: string): string {
  const cleaned = text.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) {
    return "";
  }
  const first = cleaned[0];
  const consonants = cleaned.replace(/[aeiou]/g, "");
  return `${first}${consonants.slice(0, 3)}`;
}

function semanticSimilarity(a: EntityRecord, b: EntityRecord): number {
  const keys = new Set([...Object.keys(a.attributes), ...Object.keys(b.attributes)]);
  let matches = 0;
  for (const key of keys) {
    if (a.attributes[key] && a.attributes[key] === b.attributes[key]) {
      matches += 1;
    }
  }
  return keys.size === 0 ? 0 : matches / keys.size;
}

function propertyOverlap(a: EntityRecord, b: EntityRecord): number {
  const keysA = Object.keys(a.attributes);
  const keysB = Object.keys(b.attributes);
  const overlap = keysA.filter((key) => keysB.includes(key));
  return Math.max(overlap.length / Math.max(keysA.length, keysB.length, 1), 0);
}

function buildCandidateScore(
  entity: EntityRecord,
  candidate: EntityRecord,
  scoring: ScoringOptions,
  thresholds: ScoreThresholds
): CandidateScore {
  const nameTokensA = tokenize(entity.name);
  const nameTokensB = tokenize(candidate.name);
  const jaccard = jaccardSimilarity(nameTokensA, nameTokensB);
  const editDistance = normalizedLevenshtein(
    entity.name.toLowerCase(),
    candidate.name.toLowerCase()
  );
  const nameSimilarity = Math.max(jaccard, editDistance);
  const features = {
    nameSimilarity,
    typeMatch: entity.type === candidate.type,
    propertyOverlap: propertyOverlap(entity, candidate),
    semanticSimilarity: semanticSimilarity(entity, candidate),
    phoneticSimilarity:
      phoneticSignature(entity.name) === phoneticSignature(candidate.name) ? 1 : 0,
    editDistance,
  };
  const ruleScore =
    features.nameSimilarity * 0.35 +
    (features.typeMatch ? 0.2 : 0) +
    features.propertyOverlap * 0.15 +
    features.semanticSimilarity * 0.2 +
    features.phoneticSimilarity * 0.05 +
    features.editDistance * 0.05;
  let mlScore: number | undefined;
  if (scoring.mlEnabled) {
    const raw =
      features.nameSimilarity * 0.32 +
      (features.typeMatch ? 0.15 : 0) +
      features.propertyOverlap * 0.18 +
      features.semanticSimilarity * 0.2 +
      features.phoneticSimilarity * 0.05 +
      features.editDistance * 0.1;
    mlScore = clamp(raw, 0, 1);
  }
  const finalScore =
    scoring.mlEnabled && mlScore !== undefined
      ? clamp(ruleScore * (1 - scoring.mlBlend) + mlScore * scoring.mlBlend, 0, 1)
      : clamp(ruleScore, 0, 1);
  const decision = decideScore(finalScore, thresholds);
  const contributions: Record<string, number> = {
    nameSimilarity: Number((features.nameSimilarity * 0.35).toFixed(3)),
    typeMatch: Number(((features.typeMatch ? 1 : 0) * 0.2).toFixed(3)),
    propertyOverlap: Number((features.propertyOverlap * 0.15).toFixed(3)),
    semanticSimilarity: Number((features.semanticSimilarity * 0.2).toFixed(3)),
    phoneticSimilarity: Number((features.phoneticSimilarity * 0.05).toFixed(3)),
    editDistance: Number((features.editDistance * 0.05).toFixed(3)),
  };
  if (mlScore !== undefined) {
    contributions.mlScore = Number((mlScore * scoring.mlBlend).toFixed(3));
  }
  const rationale = [
    `Name similarity ${(features.nameSimilarity * 100).toFixed(1)}%`,
    `Type ${features.typeMatch ? "matches" : "differs"}`,
    `Property overlap ${(features.propertyOverlap * 100).toFixed(1)}%`,
    `Rule score ${(ruleScore * 100).toFixed(1)}%`,
  ];
  if (features.semanticSimilarity > 0) {
    rationale.push(`Semantic match ${(features.semanticSimilarity * 100).toFixed(1)}%`);
  }
  if (features.phoneticSimilarity === 1) {
    rationale.push("Phonetic signature aligned");
  }
  if (mlScore !== undefined) {
    rationale.push(`ML score ${(mlScore * 100).toFixed(1)}%`);
  }
  return {
    entityId: candidate.id,
    score: Number(finalScore.toFixed(3)),
    features: {
      ...features,
      ruleScore: Number(ruleScore.toFixed(3)),
      mlScore: mlScore !== undefined ? Number(mlScore.toFixed(3)) : undefined,
      finalScore: Number(finalScore.toFixed(3)),
    },
    rationale,
    explanation: {
      decision,
      contributions,
      rationale: [...rationale, `Weighted blend ${(finalScore * 100).toFixed(1)}% (${decision})`],
    },
    decision,
  };
}

export class EntityResolutionService {
  private readonly merges = new Map<string, MergeRecord>();
  private readonly explanations = new Map<string, ExplainResponse>();
  private readonly auditLog: AuditEntry[] = [];

  private readonly observability: ObservabilityOptions;

  constructor(
    private readonly clock: () => Date = () => new Date(),
    observability: ObservabilityOptions = {}
  ) {
    this.observability = observability;
  }

  getAuditLog(): readonly AuditEntry[] {
    return this.auditLog;
  }

  getMerge(mergeId: string): MergeRecord | undefined {
    return this.merges.get(mergeId);
  }

  candidates(request: CandidateRequest): CandidateResponse {
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.entities.candidates", {
      tenantId: request.tenantId,
      entityId: request.entity.id,
    });
    const thresholds = resolveThresholds(request.thresholds);
    const scoring = resolveScoring(request.scoring);
    const topK = request.topK ?? 5;
    const population = request.population.filter(
      (candidate) => candidate.tenantId === request.tenantId
    );
    const scored = population
      .filter((candidate) => candidate.id !== request.entity.id)
      .map((candidate) => buildCandidateScore(request.entity, candidate, scoring, thresholds))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.entities.candidates", {
      tenantId: request.tenantId,
      entityId: request.entity.id,
      durationMs,
      candidates: scored.length,
      topScore: scored[0]?.score,
    });
    this.metricsObserve("intelgraph_er_candidates_ms", durationMs, {
      tenantId: request.tenantId,
    });
    this.metricsIncrement("intelgraph_er_candidates_total", 1, {
      tenantId: request.tenantId,
    });
    span?.end({
      durationMs,
      candidateCount: scored.length,
      topScore: scored[0]?.score,
      model: scoring.model.id,
    });
    return {
      requestId: randomUUID(),
      candidates: scored,
      thresholds,
      model: scoring.model,
    };
  }

  resolveDuplicates(request: DeduplicationRequest): ResolutionCluster[] {
    const startedAt = Date.now();
    const thresholds = resolveThresholds(request.thresholds);
    const scoring = resolveScoring(request.scoring);
    const span = this.startSpan("intelgraph.entities.resolve", {
      tenantId: request.tenantId,
      population: request.population.length,
    });
    const population = request.population.filter(
      (candidate) => candidate.tenantId === request.tenantId
    );
    const byId = new Map(population.map((record) => [record.id, record]));
    const visited = new Set<string>();
    const clusters: ResolutionCluster[] = [];

    for (const entity of population) {
      if (visited.has(entity.id)) {
        continue;
      }
      const candidates = population.filter(
        (candidate) =>
          candidate.id !== entity.id && candidate.type === entity.type && !visited.has(candidate.id)
      );
      const scores = candidates
        .map((candidate) => buildCandidateScore(entity, candidate, scoring, thresholds))
        .filter((score) => score.decision === "auto-merge");
      if (scores.length === 0) {
        visited.add(entity.id);
        continue;
      }
      const duplicates = scores.sort((a, b) => b.score - a.score);
      duplicates.forEach((dup) => visited.add(dup.entityId));
      visited.add(entity.id);
      const primary = choosePrimary([entity, ...duplicates.map((dup) => byId.get(dup.entityId)!)]);
      const rationale = [
        `Clustered ${duplicates.length} duplicates for ${entity.type}`,
        `Primary selected: ${primary.name}`,
      ];
      const cluster: ResolutionCluster = {
        clusterId: randomUUID(),
        primary,
        duplicates,
        model: scoring.model,
        rationale,
        createdAt: this.clock().toISOString(),
      };
      clusters.push(cluster);
    }

    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.entities.resolve", {
      tenantId: request.tenantId,
      clusters: clusters.length,
      durationMs,
      model: scoring.model.id,
    });
    this.metricsObserve("intelgraph_er_resolution_ms", durationMs, {
      tenantId: request.tenantId,
    });
    span?.end({ durationMs, clusters: clusters.length });
    return clusters;
  }

  merge(request: MergeRequest, featureSource: CandidateScore): MergeRecord {
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.entities.merge", {
      tenantId: request.tenantId,
      primaryId: request.primaryId,
      duplicateId: request.duplicateId,
    });
    const model =
      request.model ?? (featureSource.features.mlScore ? DEFAULT_ML_MODEL : DEFAULT_RULES_MODEL);
    const decision = featureSource.decision ?? decideScore(featureSource.score, DEFAULT_THRESHOLDS);
    const mergeId = randomUUID();
    const record: MergeRecord = {
      mergeId,
      tenantId: request.tenantId,
      primaryId: request.primaryId,
      duplicateId: request.duplicateId,
      actor: request.actor,
      reason: request.reason,
      policyTags: request.policyTags,
      mergedAt: this.clock().toISOString(),
      reversible: true,
      score: featureSource.score,
      decision,
      modelHash: model.hash,
    };
    this.merges.set(mergeId, record);
    this.auditLog.push({
      id: randomUUID(),
      tenantId: request.tenantId,
      actor: request.actor,
      event: "merge",
      target: mergeId,
      reason: request.reason,
      createdAt: record.mergedAt,
      modelHash: model.hash,
      decision,
      score: featureSource.score,
    });
    this.explanations.set(mergeId, {
      mergeId,
      features: featureSource.features,
      rationale: [...featureSource.rationale, `Final score ${featureSource.score}`],
      policyTags: request.policyTags,
      createdAt: record.mergedAt,
      modelHash: model.hash,
    });
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.entities.merge", {
      tenantId: request.tenantId,
      mergeId,
      durationMs,
      policyTags: request.policyTags,
      decision,
    });
    this.metricsIncrement("intelgraph_er_merges_total", 1, {
      tenantId: request.tenantId,
    });
    this.metricsObserve("intelgraph_er_merge_ms", durationMs, {
      tenantId: request.tenantId,
    });
    span?.end({ durationMs, mergeId });
    return record;
  }

  revertMerge(mergeId: string, actor: string, reason: string): void {
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.entities.merge.revert", {
      mergeId,
      actor,
    });
    const record = this.merges.get(mergeId);
    if (!record) {
      span?.recordException?.(`Merge ${mergeId} not found`);
      throw new Error(`Merge ${mergeId} not found`);
    }
    if (!record.reversible) {
      span?.recordException?.(`Merge ${mergeId} is locked`);
      throw new Error(`Merge ${mergeId} is locked`);
    }
    this.merges.delete(mergeId);
    this.auditLog.push({
      id: randomUUID(),
      tenantId: record.tenantId,
      actor,
      event: "revert",
      target: mergeId,
      reason,
      createdAt: this.clock().toISOString(),
    });
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.entities.merge.revert", {
      mergeId,
      actor,
      durationMs,
    });
    this.metricsIncrement("intelgraph_er_reverts_total");
    this.metricsObserve("intelgraph_er_revert_ms", durationMs);
    span?.end({ durationMs });
  }

  previewMerge(request: MergePreviewRequest): MergePreview {
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.entities.merge.preview", {
      tenantId: request.tenantId,
      primaryId: request.primary.id,
      duplicateId: request.duplicate.id,
    });
    const thresholds = resolveThresholds(request.thresholds);
    const scoring = resolveScoring(request.scoring);
    const score = buildCandidateScore(request.primary, request.duplicate, scoring, thresholds);
    const keys = new Set([
      ...Object.keys(request.primary.attributes),
      ...Object.keys(request.duplicate.attributes),
    ]);
    let sharedAttributes = 0;
    keys.forEach((key) => {
      if (
        request.primary.attributes[key] &&
        request.primary.attributes[key] === request.duplicate.attributes[key]
      ) {
        sharedAttributes += 1;
      }
    });
    const impact = {
      attributesChanged: Math.max(keys.size - sharedAttributes, 0),
      sharedAttributes,
      totalPopulation: request.population.length,
    };
    const preview: MergePreview = {
      previewId: randomUUID(),
      score,
      decision: score.decision ?? decideScore(score.score, thresholds),
      impact,
      sandboxId: randomUUID(),
      createdAt: this.clock().toISOString(),
    };
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.entities.merge.preview", {
      tenantId: request.tenantId,
      durationMs,
      decision: preview.decision,
      attributesChanged: impact.attributesChanged,
    });
    this.metricsObserve("intelgraph_er_preview_ms", durationMs, {
      tenantId: request.tenantId,
    });
    span?.end({ durationMs, decision: preview.decision });
    return preview;
  }

  explain(mergeId: string): ExplainResponse {
    const explanation = this.explanations.get(mergeId);
    if (!explanation) {
      throw new Error(`Explanation for merge ${mergeId} not found`);
    }
    this.logInfo("intelgraph.entities.merge.explain", {
      mergeId,
      featureCount: Object.keys(explanation.features).length,
    });
    return explanation;
  }

  explainPrediction(
    entity: EntityRecord,
    candidate: EntityRecord,
    thresholds?: ScoreThresholds,
    scoring?: ScoringOptions
  ): PredictionExplanation {
    const resolvedThresholds = resolveThresholds(thresholds);
    const resolvedScoring = resolveScoring(scoring);
    const score = buildCandidateScore(entity, candidate, resolvedScoring, resolvedThresholds);
    this.logInfo("intelgraph.entities.predict.explain", {
      entityId: entity.id,
      candidateId: candidate.id,
      decision: score.decision,
      model: resolvedScoring.model.id,
    });
    return (
      score.explanation ?? {
        decision: score.decision ?? decideScore(score.score, resolvedThresholds),
        contributions: {},
        rationale: score.rationale,
      }
    );
  }

  analyzeTemporalPatterns(
    events: TemporalEvent[],
    windowDays = 30,
    minSupport = 2
  ): TemporalPattern[] {
    const now = Date.now();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const grouped = new Map<string, TemporalEvent[]>();
    events.forEach((event) => {
      if (!grouped.has(event.entityId)) {
        grouped.set(event.entityId, []);
      }
      grouped.get(event.entityId)!.push(event);
    });

    const patterns: TemporalPattern[] = [];
    grouped.forEach((entityEvents, entityId) => {
      const normalized = entityEvents.map((event) => ({
        ...event,
        ts: parseDate(event.timestamp),
      }));
      const recent = normalized.filter((event) => event.ts >= now - windowMs);
      const previous = normalized.filter(
        (event) => event.ts < now - windowMs && event.ts >= now - windowMs * 2
      );
      const recentCount = recent.length;
      const previousCount = previous.length;
      let trend: TemporalPattern["trend"] = "stable";
      if (recentCount >= minSupport && recentCount >= previousCount * 1.5) {
        trend = "spike";
      } else if (recentCount > previousCount && recentCount >= minSupport) {
        trend = "increasing";
      }
      const confidence =
        recentCount === 0
          ? 0
          : Number((recentCount / Math.max(recentCount + previousCount, 1)).toFixed(3));
      patterns.push({
        entityId,
        trend,
        support: recentCount,
        windowDays,
        confidence,
        evidence: [`Recent events: ${recentCount}`, `Previous window: ${previousCount}`],
      });
    });

    this.logInfo("intelgraph.entities.temporal", {
      patterns: patterns.length,
      windowDays,
      minSupport,
    });
    this.metricsIncrement("intelgraph_er_temporal_total", patterns.length);
    return patterns;
  }

  extractEntitiesFromText(text: string, options: ExtractionOptions): ExtractedEntity[] {
    const defaultType = options.defaultType ?? "unstructured";
    const source = options.source ?? "unstructured";
    const tenantId = options.tenantId;
    const seen = new Set<string>();
    const entities: ExtractedEntity[] = [];
    const addEntity = (
      value: string,
      type: string,
      start: number,
      end: number,
      label: string
    ): void => {
      const key = `${type}:${value}:${start}-${end}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      entities.push({
        record: {
          id: randomUUID(),
          type: type || defaultType,
          name: value,
          tenantId,
          attributes: { source },
          source,
        },
        offsets: [{ start, end, label }],
      });
    };

    const personRegex = /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
    let match: RegExpExecArray | null;
    while ((match = personRegex.exec(text)) !== null) {
      addEntity(match[1], "person", match.index, personRegex.lastIndex, "person");
    }

    const orgRegex = /\b([A-Z][A-Za-z0-9&]+\s(?:Inc|Corp|LLC|Agency|Council|Bureau))\b/g;
    while ((match = orgRegex.exec(text)) !== null) {
      addEntity(match[1], "organization", match.index, orgRegex.lastIndex, "org");
    }

    const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b/g;
    while ((match = dateRegex.exec(text)) !== null) {
      addEntity(match[1], "date", match.index, dateRegex.lastIndex, "date");
    }

    const locationRegex = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s(City|Province|State|Region)\b/g;
    while ((match = locationRegex.exec(text)) !== null) {
      addEntity(
        `${match[1]} ${match[2]}`,
        "location",
        match.index,
        locationRegex.lastIndex,
        "location"
      );
    }

    this.logInfo("intelgraph.entities.extract", {
      source,
      tenantId,
      extracted: entities.length,
    });
    this.metricsIncrement("intelgraph_er_extract_total", entities.length, {
      tenantId,
      source,
    });
    return entities;
  }

  private logInfo(event: string, payload: Record<string, unknown>): void {
    this.observability.logger?.info?.(event, payload);
  }

  private metricsObserve(
    metric: string,
    value: number,
    attributes?: Record<string, string | number>
  ): void {
    this.observability.metrics?.observe?.(metric, value, attributes);
  }

  private metricsIncrement(
    metric: string,
    value = 1,
    attributes?: Record<string, string | number>
  ): void {
    this.observability.metrics?.increment?.(metric, value, attributes);
  }

  private startSpan(name: string, attributes?: Record<string, unknown>): TraceSpan | undefined {
    return this.observability.tracer?.startSpan?.(name, attributes);
  }
}

export type {
  AuditEntry,
  CandidateRequest,
  CandidateResponse,
  CandidateScore,
  DeduplicationRequest,
  EntityRecord,
  ExtractedEntity,
  ExtractionOptions,
  ExplainResponse,
  MergePreview,
  MergePreviewRequest,
  MergeRecord,
  MergeRequest,
  PredictionExplanation,
  ResolutionCluster,
  ScoringModel,
  ScoringOptions,
  ScoreDecision,
  ScoreThresholds,
  TemporalEvent,
  TemporalPattern,
} from "./types.js";
