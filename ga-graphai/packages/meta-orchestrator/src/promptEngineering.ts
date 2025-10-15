import { randomUUID } from 'node:crypto';

export type QualityAspect =
  | 'relevance'
  | 'clarity'
  | 'completeness'
  | 'factuality'
  | 'safety'
  | (string & {});

export interface RSIPIterationLog {
  iteration: number;
  prompt: string;
  output: string;
  aspectScores: Record<QualityAspect, number>;
  prioritizedAspects: QualityAspect[];
  aggregateScore: number;
}

export interface RSIPRunResult {
  success: boolean;
  finalOutput: string;
  iterations: number;
  logs: RSIPIterationLog[];
}

export interface RSIPOptions {
  aspects: QualityAspect[];
  generator: (prompt: string, iteration: number, history: RSIPIterationLog[]) => Promise<string> | string;
  evaluator: (
    output: string,
    aspect: QualityAspect,
    iteration: number,
    history: RSIPIterationLog[]
  ) => Promise<number> | number;
  refinePrompt?: (
    previousPrompt: string,
    output: string,
    prioritizedAspects: QualityAspect[],
    iteration: number,
    history: RSIPIterationLog[]
  ) => string;
  maxIterations?: number;
  qualityThreshold?: number;
  aspectWeights?: Partial<Record<QualityAspect, number>>;
  logger?: (log: RSIPIterationLog) => void;
  focusWindow?: number;
}

const DEFAULT_ASPECT_WEIGHTS: Record<QualityAspect, number> = {
  relevance: 0.3,
  clarity: 0.2,
  completeness: 0.25,
  factuality: 0.2,
  safety: 0.05
};

const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_THRESHOLD = 0.88;
const DEFAULT_FOCUS_WINDOW = 3;

function normalizeWeights(weights: Record<QualityAspect, number>): Record<QualityAspect, number> {
  const entries = Object.entries(weights);
  const total = entries.reduce((acc, [, value]) => acc + value, 0);
  if (total === 0) {
    const normalized: Record<QualityAspect, number> = {} as Record<QualityAspect, number>;
    for (const [aspect] of entries) {
      normalized[aspect as QualityAspect] = 1 / entries.length;
    }
    return normalized;
  }
  const normalized: Record<QualityAspect, number> = {} as Record<QualityAspect, number>;
  for (const [aspect, value] of entries) {
    normalized[aspect as QualityAspect] = value / total;
  }
  return normalized;
}

export class RecursiveSelfImprovementEngine {
  private readonly aspects: QualityAspect[];
  private readonly generator: RSIPOptions['generator'];
  private readonly evaluator: RSIPOptions['evaluator'];
  private readonly refinePrompt?: RSIPOptions['refinePrompt'];
  private readonly maxIterations: number;
  private readonly qualityThreshold: number;
  private readonly focusWindow: number;
  private readonly weights: Record<QualityAspect, number>;
  private readonly logger?: RSIPOptions['logger'];

  constructor(options: RSIPOptions) {
    if (options.aspects.length === 0) {
      throw new Error('RSIP requires at least one quality aspect.');
    }
    this.aspects = [...options.aspects];
    this.generator = options.generator;
    this.evaluator = options.evaluator;
    this.refinePrompt = options.refinePrompt;
    this.maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    this.qualityThreshold = options.qualityThreshold ?? DEFAULT_THRESHOLD;
    this.focusWindow = options.focusWindow ?? DEFAULT_FOCUS_WINDOW;
    const mergedWeights: Record<QualityAspect, number> = { ...DEFAULT_ASPECT_WEIGHTS };
    for (const aspect of this.aspects) {
      mergedWeights[aspect] = options.aspectWeights?.[aspect] ?? mergedWeights[aspect] ?? 1;
    }
    this.weights = normalizeWeights(mergedWeights);
    this.logger = options.logger;
  }

  async run(initialPrompt: string): Promise<RSIPRunResult> {
    let currentPrompt = initialPrompt;
    const logs: RSIPIterationLog[] = [];
    for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
      const output = await this.generator(currentPrompt, iteration, logs);
      const aspectScores: Record<QualityAspect, number> = {} as Record<QualityAspect, number>;
      for (const aspect of this.aspects) {
        const score = await this.evaluator(output, aspect, iteration, logs);
        aspectScores[aspect] = clamp(score, 0, 1);
      }
      const prioritizedAspects = this.prioritizeAspects(logs, aspectScores);
      const aggregateScore = this.aggregateScore(aspectScores);
      const iterationLog: RSIPIterationLog = {
        iteration,
        prompt: currentPrompt,
        output,
        aspectScores,
        prioritizedAspects,
        aggregateScore
      };
      logs.push(iterationLog);
      if (this.logger) {
        this.logger(iterationLog);
      }
      if (aggregateScore >= this.qualityThreshold) {
        return {
          success: true,
          finalOutput: output,
          iterations: iteration,
          logs
        };
      }
      currentPrompt = this.buildRefinementPrompt(currentPrompt, output, prioritizedAspects, iteration, logs);
    }
    const finalLog = logs[logs.length - 1];
    return {
      success: false,
      finalOutput: finalLog?.output ?? '',
      iterations: logs.length,
      logs
    };
  }

  private prioritizeAspects(
    history: RSIPIterationLog[],
    latestScores: Record<QualityAspect, number>
  ): QualityAspect[] {
    const window = history.slice(Math.max(0, history.length - (this.focusWindow - 1)));
    const blendedScores = new Map<QualityAspect, number>();
    for (const aspect of this.aspects) {
      const historical = window.map(entry => entry.aspectScores[aspect]).filter(score => typeof score === 'number');
      const historyAverage =
        historical.length === 0
          ? 1
          : historical.reduce((acc, value) => acc + value, 0) / historical.length;
      const blended = (historyAverage + latestScores[aspect]) / 2;
      blendedScores.set(aspect, blended);
    }
    return [...blendedScores.entries()]
      .sort(([, scoreA], [, scoreB]) => scoreA - scoreB)
      .map(([aspect]) => aspect);
  }

  private aggregateScore(aspectScores: Record<QualityAspect, number>): number {
    return this.aspects.reduce((acc, aspect) => acc + (aspectScores[aspect] ?? 0) * (this.weights[aspect] ?? 0), 0);
  }

  private buildRefinementPrompt(
    previousPrompt: string,
    output: string,
    prioritizedAspects: QualityAspect[],
    iteration: number,
    history: RSIPIterationLog[]
  ): string {
    if (this.refinePrompt) {
      return this.refinePrompt(previousPrompt, output, prioritizedAspects, iteration, history);
    }
    const focus = prioritizedAspects.slice(0, 2).join(' and ') || 'overall quality';
    return [
      'You are refining a draft response. Improve it with focus on the weakest aspects.',
      `Priority aspects: ${focus}.`,
      'Original prompt:',
      previousPrompt,
      'Current draft:',
      output,
      'Return an improved version that addresses the priority aspects while keeping strengths intact.'
    ].join('\n\n');
  }
}

export interface SemanticEmbeddingFunction {
  (text: string): Promise<number[]> | number[];
}

export interface SimilarityFunction {
  (a: number[], b: number[]): number;
}

export interface ContextSegment {
  id?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ContextAwareDecompositionOptions {
  embed: SemanticEmbeddingFunction;
  similarity?: SimilarityFunction;
  saliencyThreshold?: number;
  maxSegments?: number;
  adaptiveThreshold?: boolean;
}

export interface DecomposedContext {
  selected: (ContextSegment & { saliency: number })[];
  discarded: (ContextSegment & { saliency: number })[];
  threshold: number;
}

const DEFAULT_SALIENCY_THRESHOLD = 0.55;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / Math.sqrt(normA * normB);
}

export class ContextAwareDecomposer {
  private readonly embed: SemanticEmbeddingFunction;
  private readonly similarity: SimilarityFunction;
  private readonly saliencyThreshold: number;
  private readonly adaptiveThreshold: boolean;
  private readonly maxSegments?: number;

  constructor(options: ContextAwareDecompositionOptions) {
    this.embed = options.embed;
    this.similarity = options.similarity ?? cosineSimilarity;
    this.saliencyThreshold = options.saliencyThreshold ?? DEFAULT_SALIENCY_THRESHOLD;
    this.adaptiveThreshold = options.adaptiveThreshold ?? true;
    this.maxSegments = options.maxSegments;
  }

  async decompose(task: string, segments: ContextSegment[]): Promise<DecomposedContext> {
    const taskEmbedding = await this.embed(task);
    const scoredSegments: (ContextSegment & { saliency: number })[] = [];
    for (const segment of segments) {
      const embedding = await this.embed(segment.text);
      const saliency = clamp(this.similarity(taskEmbedding, embedding), 0, 1);
      scoredSegments.push({ ...segment, saliency });
    }
    const threshold = this.computeThreshold(scoredSegments);
    const selected = scoredSegments
      .filter(segment => segment.saliency >= threshold)
      .sort((a, b) => b.saliency - a.saliency);
    const cappedSelected = this.maxSegments ? selected.slice(0, this.maxSegments) : selected;
    const selectedIds = new Set(cappedSelected.map(segment => segment.id));
    const discarded = scoredSegments.filter(segment => !selectedIds.has(segment.id));
    return {
      selected: cappedSelected,
      discarded,
      threshold
    };
  }

  private computeThreshold(segments: (ContextSegment & { saliency: number })[]): number {
    if (!this.adaptiveThreshold || segments.length === 0) {
      return this.saliencyThreshold;
    }
    const values = segments.map(segment => segment.saliency).sort((a, b) => a - b);
    const median = values[Math.floor(values.length / 2)];
    const dynamic = Math.max(this.saliencyThreshold, (median + Math.max(...values)) / 2 - 0.1);
    return clamp(dynamic, this.saliencyThreshold, 0.95);
  }
}

export interface RetrievableDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface TokenEstimator {
  (text: string): number;
}

export interface TokenAwareRetrievalOptions {
  embed: SemanticEmbeddingFunction;
  similarity?: SimilarityFunction;
  estimateTokens?: TokenEstimator;
  tokenBudget?: number;
  minimumRelevance?: number;
}

export interface RetrievedContext {
  documents: (RetrievableDocument & { saliency: number; tokens: number })[];
  usedTokens: number;
  budget: number;
}

const DEFAULT_TOKEN_BUDGET = 1024;

function defaultTokenEstimator(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export class TokenAwareRetriever {
  private readonly embed: SemanticEmbeddingFunction;
  private readonly similarity: SimilarityFunction;
  private readonly estimateTokens: TokenEstimator;
  private readonly tokenBudget: number;
  private readonly minimumRelevance: number;

  constructor(options: TokenAwareRetrievalOptions) {
    this.embed = options.embed;
    this.similarity = options.similarity ?? cosineSimilarity;
    this.estimateTokens = options.estimateTokens ?? defaultTokenEstimator;
    this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
    this.minimumRelevance = options.minimumRelevance ?? 0.4;
  }

  async retrieve(query: string, documents: RetrievableDocument[]): Promise<RetrievedContext> {
    const queryEmbedding = await this.embed(query);
    const scoredDocuments: (RetrievableDocument & { saliency: number; tokens: number })[] = [];
    for (const document of documents) {
      const embedding = await this.embed(document.text);
      const saliency = clamp(this.similarity(queryEmbedding, embedding), 0, 1);
      const tokens = this.estimateTokens(document.text);
      if (saliency >= this.minimumRelevance) {
        scoredDocuments.push({ ...document, saliency, tokens });
      }
    }
    scoredDocuments.sort((a, b) => b.saliency - a.saliency || a.tokens - b.tokens);
    const selected: (RetrievableDocument & { saliency: number; tokens: number })[] = [];
    let usedTokens = 0;
    for (const doc of scoredDocuments) {
      if (usedTokens + doc.tokens > this.tokenBudget) {
        continue;
      }
      selected.push(doc);
      usedTokens += doc.tokens;
    }
    return {
      documents: selected,
      usedTokens,
      budget: this.tokenBudget
    };
  }
}

export interface PromptModuleContext {
  task: string;
  metadata?: Record<string, unknown>;
  complexity?: number;
}

export interface PromptModule {
  name: string;
  template: (context: PromptModuleContext) => string;
  estimatedTokens: number;
  minComplexity?: number;
  maxComplexity?: number;
  mandatory?: boolean;
}

export interface PlannerFeedback {
  module: string;
  score: number; // 0-1 quality feedback
  tokenCost?: number;
}

export interface PlannerOptions {
  modules: PromptModule[];
  tokenBudget: number;
}

export interface PlannedPrompt {
  prompt: string;
  modules: string[];
  estimatedTokens: number;
}

export class MetaPromptPlanner {
  private readonly modules: PromptModule[];
  private readonly tokenBudget: number;
  private readonly weights = new Map<string, number>();

  constructor(options: PlannerOptions) {
    this.modules = options.modules;
    this.tokenBudget = options.tokenBudget;
    for (const module of this.modules) {
      this.weights.set(module.name, 1);
    }
  }

  plan(context: PromptModuleContext): PlannedPrompt {
    const sorted = [...this.modules].sort((a, b) => {
      const weightA = this.weights.get(a.name) ?? 1;
      const weightB = this.weights.get(b.name) ?? 1;
      return weightB - weightA;
    });
    const selected: PromptModule[] = [];
    let estimatedTokens = 0;
    for (const module of sorted) {
      if (!this.isModuleEligible(module, context)) {
        continue;
      }
      if (module.mandatory || estimatedTokens + module.estimatedTokens <= this.tokenBudget) {
        selected.push(module);
        estimatedTokens += module.estimatedTokens;
      }
    }
    const promptSections = selected.map(module => module.template(context));
    return {
      prompt: promptSections.join('\n\n'),
      modules: selected.map(module => module.name),
      estimatedTokens
    };
  }

  recordFeedback(feedback: PlannerFeedback): void {
    const current = this.weights.get(feedback.module) ?? 1;
    const adjustment = feedback.score >= 0.8 ? 0.1 : feedback.score < 0.4 ? -0.2 : -0.05;
    const tokenPenalty = feedback.tokenCost ? Math.max(0, feedback.tokenCost - this.tokenBudget) / this.tokenBudget : 0;
    const next = clamp(current + adjustment - tokenPenalty, 0.1, 3);
    this.weights.set(feedback.module, next);
  }

  private isModuleEligible(module: PromptModule, context: PromptModuleContext): boolean {
    const complexity = context.complexity ?? 0.5;
    if (module.minComplexity !== undefined && complexity < module.minComplexity) {
      return false;
    }
    if (module.maxComplexity !== undefined && complexity > module.maxComplexity) {
      return false;
    }
    return true;
  }
}

export interface CandidateGenerationOptions {
  prompt: string;
  variants?: number;
  generator: (prompt: string, variant: number) => Promise<string> | string;
  embed: SemanticEmbeddingFunction;
  similarity?: SimilarityFunction;
  similarityThreshold?: number;
}

export interface ConsensusCluster {
  id: string;
  members: { variant: number; text: string; embedding: number[] }[];
  centroid: number[];
}

export interface ConsensusResult {
  consensus: string;
  clusters: ConsensusCluster[];
  candidates: { variant: number; text: string }[];
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.82;

function averageVector(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }
  const length = vectors[0].length;
  const result = new Array<number>(length).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < length; i += 1) {
      result[i] += vector[i];
    }
  }
  return result.map(value => value / vectors.length);
}

export class SelfConsensusEngine {
  private readonly similarity: SimilarityFunction;

  constructor(similarity?: SimilarityFunction) {
    this.similarity = similarity ?? cosineSimilarity;
  }

  async generateConsensus(options: CandidateGenerationOptions): Promise<ConsensusResult> {
    const totalVariants = options.variants ?? 3;
    const candidates: { variant: number; text: string; embedding: number[] }[] = [];
    for (let variant = 0; variant < totalVariants; variant += 1) {
      const text = await options.generator(options.prompt, variant);
      const embedding = await options.embed(text);
      candidates.push({ variant, text, embedding });
    }
    const clusters = this.clusterCandidates(candidates, options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD);
    const consensus = this.selectConsensus(clusters, candidates);
    return {
      consensus,
      clusters,
      candidates: candidates.map(candidate => ({ variant: candidate.variant, text: candidate.text }))
    };
  }

  private clusterCandidates(
    candidates: { variant: number; text: string; embedding: number[] }[],
    threshold: number
  ): ConsensusCluster[] {
    const clusters: ConsensusCluster[] = [];
    for (const candidate of candidates) {
      let added = false;
      for (const cluster of clusters) {
        const similarity = this.similarity(cluster.centroid, candidate.embedding);
        if (similarity >= threshold) {
          cluster.members.push(candidate);
          cluster.centroid = averageVector(cluster.members.map(member => member.embedding));
          added = true;
          break;
        }
      }
      if (!added) {
        clusters.push({
          id: randomUUID(),
          members: [candidate],
          centroid: [...candidate.embedding]
        });
      }
    }
    return clusters;
  }

  private selectConsensus(
    clusters: ConsensusCluster[],
    candidates: { variant: number; text: string; embedding: number[] }[]
  ): string {
    if (clusters.length === 0) {
      return '';
    }
    const sortedClusters = [...clusters].sort((a, b) => b.members.length - a.members.length);
    const primary = sortedClusters[0];
    if (primary.members.length === 1 && sortedClusters.length > 1) {
      const byCentrality = [...candidates].sort((a, b) => {
        const avgSimA = this.averageSimilarity(a, candidates);
        const avgSimB = this.averageSimilarity(b, candidates);
        return avgSimB - avgSimA;
      });
      return byCentrality[0]?.text ?? primary.members[0].text;
    }
    return primary.members[0].text;
  }

  private averageSimilarity(
    candidate: { embedding: number[] },
    candidates: { embedding: number[] }[]
  ): number {
    if (candidates.length <= 1) {
      return 1;
    }
    const total = candidates.reduce((acc, other) => acc + (other === candidate ? 0 : this.similarity(candidate.embedding, other.embedding)), 0);
    return total / (candidates.length - 1);
  }
}

export interface SummarizationLayer {
  maxTokens: number;
  summarizer: (text: string, layer: number) => Promise<string> | string;
}

export interface HierarchicalSummarizerOptions {
  layers: SummarizationLayer[];
  tokenEstimator?: TokenEstimator;
}

export interface HierarchicalSummaryResult {
  layers: { layer: number; summary: string; tokens: number }[];
  finalSummary: string;
}

export class HierarchicalSummarizer {
  private readonly layers: SummarizationLayer[];
  private readonly estimateTokens: TokenEstimator;

  constructor(options: HierarchicalSummarizerOptions) {
    if (options.layers.length === 0) {
      throw new Error('Hierarchical summarizer requires at least one layer.');
    }
    this.layers = options.layers;
    this.estimateTokens = options.tokenEstimator ?? defaultTokenEstimator;
  }

  async summarize(text: string): Promise<HierarchicalSummaryResult> {
    const results: { layer: number; summary: string; tokens: number }[] = [];
    let current = text;
    for (let index = 0; index < this.layers.length; index += 1) {
      const layer = this.layers[index];
      const tokens = this.estimateTokens(current);
      if (tokens <= layer.maxTokens) {
        results.push({ layer: index, summary: current, tokens });
        return { layers: results, finalSummary: current };
      }
      const summary = await layer.summarizer(current, index);
      const summaryTokens = this.estimateTokens(summary);
      results.push({ layer: index, summary, tokens: summaryTokens });
      current = summary;
    }
    return { layers: results, finalSummary: current };
  }
}

export interface ContextState {
  id: string;
  content: string;
  updatedAt: number;
  relevance?: number;
  metadata?: Record<string, unknown>;
}

export interface ContextDiff {
  id: string;
  content: string;
  tokens: number;
  relevance: number;
}

export interface ContextBrokerOptions {
  tokenBudget: number;
  tokenEstimator?: TokenEstimator;
  relevanceDecay?: number;
}

export interface AgentAssignment {
  agent: string;
  prompt: string;
  contextIds: string[];
}

const DEFAULT_DECAY = 0.92;

export class CollaborativeContextBroker {
  private readonly tokenBudget: number;
  private readonly estimateTokens: TokenEstimator;
  private readonly decay: number;
  private readonly states = new Map<string, ContextState>();

  constructor(options: ContextBrokerOptions) {
    this.tokenBudget = options.tokenBudget;
    this.estimateTokens = options.tokenEstimator ?? defaultTokenEstimator;
    this.decay = options.relevanceDecay ?? DEFAULT_DECAY;
  }

  upsert(state: ContextState): void {
    const existing = this.states.get(state.id);
    const blendedRelevance = existing
      ? existing.relevance !== undefined && state.relevance !== undefined
        ? clamp(existing.relevance * this.decay + state.relevance * (1 - this.decay), 0, 1)
        : state.relevance ?? existing.relevance
      : state.relevance;
    this.states.set(state.id, {
      ...state,
      relevance: blendedRelevance
    });
  }

  diffSince(timestamp: number): ContextDiff[] {
    const diffs: ContextDiff[] = [];
    for (const state of this.states.values()) {
      if (state.updatedAt <= timestamp) {
        continue;
      }
      const tokens = this.estimateTokens(state.content);
      const relevance = state.relevance ?? 0.5;
      diffs.push({ id: state.id, content: state.content, tokens, relevance });
    }
    diffs.sort((a, b) => b.relevance - a.relevance || a.tokens - b.tokens);
    const selected: ContextDiff[] = [];
    let usedTokens = 0;
    for (const diff of diffs) {
      if (usedTokens + diff.tokens > this.tokenBudget) {
        continue;
      }
      selected.push(diff);
      usedTokens += diff.tokens;
    }
    return selected;
  }

  assignContext(
    agents: string[],
    basePrompt: string,
    timestamp: number
  ): AgentAssignment[] {
    const diffs = this.diffSince(timestamp);
    const assignments: AgentAssignment[] = [];
    let diffIndex = 0;
    for (const agent of agents) {
      const contextIds: string[] = [];
      const sections: string[] = [basePrompt];
      while (diffIndex < diffs.length) {
        const diff = diffs[diffIndex];
        diffIndex += 1;
        contextIds.push(diff.id);
        sections.push(`Context(${diff.id}):\n${diff.content}`);
        if (contextIds.length >= 2) {
          break;
        }
      }
      assignments.push({
        agent,
        prompt: sections.join('\n\n'),
        contextIds
      });
    }
    return assignments;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export {
  clamp as clampValue,
  cosineSimilarity
};
