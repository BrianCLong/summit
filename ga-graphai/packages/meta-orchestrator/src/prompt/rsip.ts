import { clampValue } from './utils.js';

export type QualityAspect = string & {};

export interface RSIPIterationLog {
  iteration: number;
  prompt: string;
  output: string;
  aspectScores: Record<QualityAspect, number>;
  prioritizedAspects: QualityAspect[];
  aggregateScore: number;
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
  focusWindow?: number;
  logger?: (log: RSIPIterationLog) => void;
}

export interface RSIPRunResult {
  success: boolean;
  finalOutput: string;
  iterations: number;
  logs: RSIPIterationLog[];
}

const DEFAULT_WEIGHTS: Record<QualityAspect, number> = {
  relevance: 0.3,
  clarity: 0.2,
  completeness: 0.25,
  factuality: 0.2,
  safety: 0.05
};

const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_THRESHOLD = 0.9;
const DEFAULT_FOCUS_WINDOW = 3;

function normalizeWeights(weights: Record<QualityAspect, number>): Record<QualityAspect, number> {
  const entries = Object.entries(weights);
  const total = entries.reduce((acc, [, value]) => acc + value, 0);
  if (total === 0) {
    const fallbackWeight = entries.length > 0 ? 1 / entries.length : 0;
    const normalized: Record<QualityAspect, number> = {} as Record<QualityAspect, number>;
    for (const [aspect] of entries) {
      normalized[aspect as QualityAspect] = fallbackWeight;
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
    const merged: Record<QualityAspect, number> = { ...DEFAULT_WEIGHTS };
    for (const aspect of this.aspects) {
      merged[aspect] = options.aspectWeights?.[aspect] ?? merged[aspect] ?? 1;
    }
    this.weights = normalizeWeights(merged);
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
        aspectScores[aspect] = clampValue(score, 0, 1);
      }
      const prioritizedAspects = this.prioritizeAspects(logs, aspectScores);
      const aggregateScore = this.aggregateScore(aspectScores);
      const entry: RSIPIterationLog = {
        iteration,
        prompt: currentPrompt,
        output,
        aspectScores,
        prioritizedAspects,
        aggregateScore
      };
      logs.push(entry);
      if (this.logger) {
        this.logger(entry);
      }
      if (aggregateScore >= this.qualityThreshold) {
        return { success: true, finalOutput: output, iterations: iteration, logs };
      }
      currentPrompt = this.buildRefinementPrompt(currentPrompt, output, prioritizedAspects, iteration, logs);
    }
    const last = logs.at(-1);
    return { success: false, finalOutput: last?.output ?? '', iterations: logs.length, logs };
  }

  private prioritizeAspects(history: RSIPIterationLog[], latest: Record<QualityAspect, number>): QualityAspect[] {
    const window = history.slice(Math.max(0, history.length - (this.focusWindow - 1)));
    const blended = new Map<QualityAspect, number>();
    for (const aspect of this.aspects) {
      const pastValues = window.map(entry => entry.aspectScores[aspect]).filter(value => typeof value === 'number');
      const historicalAverage =
        pastValues.length === 0 ? 1 : pastValues.reduce((acc, value) => acc + value, 0) / pastValues.length;
      blended.set(aspect, (historicalAverage + latest[aspect]) / 2);
    }
    return [...blended.entries()].sort(([, a], [, b]) => a - b).map(([aspect]) => aspect);
  }

  private aggregateScore(aspectScores: Record<QualityAspect, number>): number {
    let total = 0;
    for (const aspect of this.aspects) {
      total += (aspectScores[aspect] ?? 0) * (this.weights[aspect] ?? 0);
    }
    return total;
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
