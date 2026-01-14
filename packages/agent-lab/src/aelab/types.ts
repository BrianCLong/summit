export interface CandidateArtifact<T> {
  id: string;
  content: T;
  contentHash: string;
  createdAt: string;
  parents: string[];
  metadata: Record<string, unknown>;
}

export interface EvaluationMetrics {
  wins: number;
  losses: number;
  draws: number;
  score: number;
  accuracy?: number;
  failures?: string[];
  safetyFlags?: string[];
}

export interface BehaviorDescriptor {
  axes: number[];
}

export interface DomainAdapter<TCandidate, TContext> {
  id: string;
  baselines(): CandidateArtifact<TCandidate>[];
  validate(candidate: CandidateArtifact<TCandidate>): { ok: boolean; reasons: string[] };
  evaluate(
    candidate: CandidateArtifact<TCandidate>,
    opponents: CandidateArtifact<TCandidate>[],
    context: TContext,
  ): Promise<EvaluationMetrics>;
  describe(candidate: CandidateArtifact<TCandidate>, metrics: EvaluationMetrics): BehaviorDescriptor;
  context(seed: number): TContext;
}

export interface SafetyGate<TCandidate, TContext> {
  preEval(
    candidate: CandidateArtifact<TCandidate>,
    context: TContext,
  ): { ok: boolean; reasons: string[] };
  postEval(
    candidate: CandidateArtifact<TCandidate>,
    metrics: EvaluationMetrics,
    context: TContext,
  ): { ok: boolean; reasons: string[] };
}

export interface CandidateOperator<TCandidate> {
  id: string;
  generate(parent: CandidateArtifact<TCandidate> | undefined, rng: SeededRng): Promise<TCandidate>;
}

export interface PromptMetadata {
  id: string;
  version: string;
  path: string;
}

export interface AELabRunConfig {
  runId: string;
  seed: number;
  rounds: number;
  iters: number;
  nInit: number;
  nMutate: number;
  sampleNewPercent: number;
  gridBins: number[];
  descriptorRanges: Array<[number, number]>;
  lastKOpponents: number;
  includeBaselines: boolean;
  resume: boolean;
  maxParallel: number;
  promptTemplates: {
    system: PromptMetadata;
    create: PromptMetadata;
    mutate: PromptMetadata;
  };
  safety: {
    offline: boolean;
    allowedTools: string[];
    policyVersion: string;
  };
}

export interface ChampionRecord<TCandidate> {
  round: number;
  candidate: CandidateArtifact<TCandidate>;
  metrics: EvaluationMetrics;
  descriptor: BehaviorDescriptor;
}

export interface CheckpointState<TCandidate> {
  config: AELabRunConfig;
  rng: { seed: number; calls: number };
  round: number;
  iteration: number;
  champions: ChampionRecord<TCandidate>[];
  archive: Array<{
    cell: number[];
    candidate: CandidateArtifact<TCandidate>;
    metrics: EvaluationMetrics;
    descriptor: BehaviorDescriptor;
  }>;
}
import { SeededRng } from './rng';
