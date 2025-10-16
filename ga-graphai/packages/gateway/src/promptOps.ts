import {
  CooperationArtifact,
  EvaluatorScore,
  TaskInputReference,
  TaskSpec,
} from '@ga-graphai/common-types';

interface PlanResult {
  selected: TaskInputReference[];
  totalTokens: number;
  estimatedLatencyMs: number;
}

export class ContextPlanner {
  plan(task: TaskSpec): PlanResult {
    const budgetTokens = task.constraints.contextTokensMax;
    const sorted = [...task.inputs].sort(
      (a, b) => (a.estimatedTokens ?? 0) - (b.estimatedTokens ?? 0),
    );
    const selected: TaskInputReference[] = [];
    let tokenSum = 0;
    let latency = 0;
    for (const input of sorted) {
      const tokens = input.estimatedTokens ?? 1000;
      if (tokenSum + tokens > budgetTokens) {
        continue;
      }
      tokenSum += tokens;
      latency += input.latencyMs ?? 50;
      selected.push(input);
    }
    return {
      selected,
      totalTokens: tokenSum,
      estimatedLatencyMs: latency,
    };
  }
}

export interface CompiledInstruction {
  system: string;
  developer: string;
  user: string;
}

export class InstructionCompiler {
  compile(
    task: TaskSpec,
    plan: PlanResult,
    clarifications: string[] = [],
  ): CompiledInstruction {
    const system = [
      'You are an IntelGraph orchestration agent.',
      'Respect policy tags and guardrails.',
      `Do not exceed ${task.constraints.contextTokensMax} tokens of context.`,
    ].join(' ');
    const developer = [
      `Goal: ${task.goal}.`,
      `Acceptance Criteria: ${task.acceptanceCriteria.map((ac) => `${ac.id}=>${ac.statement}`).join(' | ')}`,
      `Inputs: ${plan.selected.map((input) => `${input.type}:${input.uri}`).join(', ')}`,
      clarifications.length > 0
        ? `Clarifications: ${clarifications.join('; ')}`
        : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    const user = `Deliver artifacts that satisfy ${task.acceptanceCriteria.length} acceptance criteria with provenance.`;
    return { system, developer, user };
  }
}

export interface CritiqueResult {
  axis: EvaluatorScore['axis'];
  score: number;
  notes: string;
}

export type GeneratorFn = (
  draft: string,
  feedback: CritiqueResult[],
) => Promise<string> | string;
export type CriticFn = (
  draft: string,
) => Promise<CritiqueResult> | CritiqueResult;

export class SelfRefineLoop {
  constructor(
    private readonly maxIterations = 3,
    private readonly threshold = 0.85,
  ) {}

  async refine(
    initialDraft: string,
    generator: GeneratorFn,
    critics: CriticFn[],
  ): Promise<{ output: string; scores: EvaluatorScore[] }> {
    let draft = initialDraft;
    const history: EvaluatorScore[] = [];
    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const critiques = await Promise.all(
        critics.map((critic) => critic(draft)),
      );
      critiques.forEach((critique) => {
        history.push({
          axis: critique.axis,
          score: critique.score,
          rationale: critique.notes,
        });
      });
      const minScore = Math.min(...critiques.map((critique) => critique.score));
      if (minScore >= this.threshold) {
        break;
      }
      draft = await generator(draft, critiques);
    }
    return { output: draft, scores: history };
  }
}

export interface GuardResult {
  artifact: CooperationArtifact;
  redactions: string[];
}

const SECRET_PATTERNS = [
  /aws[_-]?secret/i,
  /password/i,
  /api[_-]?key/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
];

export class GuardedGenerator {
  guard(content: string): { sanitized: string; redactions: string[] } {
    let sanitized = content;
    const redactions: string[] = [];
    SECRET_PATTERNS.forEach((pattern) => {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
        redactions.push(pattern.source);
      }
    });
    return { sanitized, redactions };
  }

  enforce(
    mode: CooperationArtifact['mode'],
    content: string,
    scores: EvaluatorScore[] = [],
    evidence = [],
  ): GuardResult {
    const { sanitized, redactions } = this.guard(content);
    const artifact: CooperationArtifact = {
      mode,
      content: sanitized,
      supportingEvidence: evidence,
      acceptanceCriteriaSatisfied: scores
        .filter((score) => score.score >= 0.9)
        .map((score) => score.axis),
      residualRisks: redactions,
    };
    return { artifact, redactions };
  }
}
