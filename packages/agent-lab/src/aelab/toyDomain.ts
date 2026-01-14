import crypto from 'crypto';

import { SeededRng } from './rng';
import {
  CandidateArtifact,
  CandidateOperator,
  DomainAdapter,
  EvaluationMetrics,
} from './types';

export type ToyOpType = 'append' | 'prepend' | 'replace' | 'upper' | 'lower' | 'truncate';

export interface ToyOperation {
  type: ToyOpType;
  value?: string;
  from?: string;
  to?: string;
  length?: number;
}

export interface ToyCandidate {
  ops: ToyOperation[];
}

export interface ToyContext {
  dataset: Array<{ input: string; output: string }>;
  rng: SeededRng;
}

const dataset: Array<{ input: string; output: string }> = [
  { input: 'Alpha', output: 'alpha' },
  { input: 'Beta', output: 'beta' },
  { input: 'Gamma', output: 'gamma' },
  { input: 'Summit', output: 'summit' },
  { input: 'IntelGraph', output: 'intelgraph' },
  { input: 'lab', output: 'lab' },
  { input: 'DRQ', output: 'drq' },
  { input: 'Agent', output: 'agent' },
  { input: 'Signal', output: 'signal' },
  { input: 'Trace', output: 'trace' },
];

const applyOp = (input: string, op: ToyOperation): string => {
  switch (op.type) {
    case 'append':
      return `${input}${op.value ?? ''}`;
    case 'prepend':
      return `${op.value ?? ''}${input}`;
    case 'replace':
      return input.replace(op.from ?? '', op.to ?? '');
    case 'upper':
      return input.toUpperCase();
    case 'lower':
      return input.toLowerCase();
    case 'truncate':
      return input.slice(0, op.length ?? input.length);
    default:
      return input;
  }
};

const applyCandidate = (candidate: ToyCandidate, input: string): string => {
  return candidate.ops.reduce((acc, op) => applyOp(acc, op), input);
};

const accuracyFor = (candidate: ToyCandidate, ctx: ToyContext) => {
  let correct = 0;
  for (const item of ctx.dataset) {
    const output = applyCandidate(candidate, item.input);
    if (output === item.output) correct += 1;
  }
  return correct / ctx.dataset.length;
};

export class ToyDomain implements DomainAdapter<ToyCandidate, ToyContext> {
  readonly id = 'toy-string-transformer';

  baselines(): CandidateArtifact<ToyCandidate>[] {
    const baselineCandidates: ToyCandidate[] = [
      { ops: [{ type: 'lower' }] },
      { ops: [{ type: 'upper' }] },
      { ops: [{ type: 'truncate', length: 3 }] },
      { ops: [{ type: 'lower' }, { type: 'append', value: '!' }] },
    ];
    return baselineCandidates.map((candidate, idx) => ({
      id: `baseline-${idx}`,
      content: candidate,
      contentHash: crypto.createHash('sha256').update(JSON.stringify(candidate)).digest('hex'),
      createdAt: new Date(0).toISOString(),
      parents: [],
      metadata: { baseline: true },
    }));
  }

  validate(candidate: CandidateArtifact<ToyCandidate>) {
    const reasons: string[] = [];
    if (candidate.content.ops.length > 6) {
      reasons.push('Too many operations.');
    }
    candidate.content.ops.forEach((op) => {
      if (op.value && op.value.length > 8) reasons.push('Value too long.');
      if (op.from && op.from.length > 6) reasons.push('Replace from too long.');
      if (op.to && op.to.length > 6) reasons.push('Replace to too long.');
    });
    return { ok: reasons.length === 0, reasons };
  }

  async evaluate(
    candidate: CandidateArtifact<ToyCandidate>,
    opponents: CandidateArtifact<ToyCandidate>[],
    context: ToyContext,
  ): Promise<EvaluationMetrics> {
    const candidateAccuracy = accuracyFor(candidate.content, context);
    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const opponent of opponents) {
      const opponentAccuracy = accuracyFor(opponent.content, context);
      if (candidateAccuracy > opponentAccuracy + 0.001) {
        wins += 1;
      } else if (candidateAccuracy + 0.001 < opponentAccuracy) {
        losses += 1;
      } else {
        draws += 1;
      }
    }

    const total = opponents.length || 1;
    const winRate = (wins + 0.5 * draws) / total;
    const score = candidateAccuracy;

    return {
      wins,
      losses,
      draws,
      score,
      accuracy: candidateAccuracy,
      safetyFlags: [],
    };
  }

  describe(candidate: CandidateArtifact<ToyCandidate>, metrics: EvaluationMetrics) {
    void metrics;
    const opsCount = candidate.content.ops.length;
    const avgOutputLen =
      dataset.reduce((acc, item) => acc + applyCandidate(candidate.content, item.input).length, 0) / dataset.length;
    return { axes: [opsCount, avgOutputLen] };
  }

  context(seed: number): ToyContext {
    return { dataset, rng: new SeededRng(seed) };
  }
}

export class ToyCandidateFactory {
  newCandidate(rng: SeededRng): ToyCandidate {
    const opsCount = 1 + rng.int(3);
    return { ops: Array.from({ length: opsCount }, () => this.randomOp(rng)) };
  }

  mutate(candidate: ToyCandidate, rng: SeededRng): ToyCandidate {
    const ops = [...candidate.ops];
    if (ops.length === 0 || rng.next() < 0.4) {
      ops.push(this.randomOp(rng));
    } else {
      const idx = rng.int(ops.length);
      ops[idx] = this.randomOp(rng);
    }
    return { ops: ops.slice(0, 6) };
  }

  private randomOp(rng: SeededRng): ToyOperation {
    const types: ToyOpType[] = ['append', 'prepend', 'replace', 'upper', 'lower', 'truncate'];
    const type = types[rng.int(types.length)];
    switch (type) {
      case 'append':
      case 'prepend':
        return { type, value: this.randomToken(rng) };
      case 'replace':
        return { type, from: this.randomToken(rng), to: this.randomToken(rng) };
      case 'truncate':
        return { type, length: 2 + rng.int(5) };
      default:
        return { type };
    }
  }

  private randomToken(rng: SeededRng) {
    const tokens = ['a', 'e', 'i', 'o', 'u', 's', 't', 'r', 'n', 'g'];
    return tokens[rng.int(tokens.length)];
  }
}

export class ToyNewOperator implements CandidateOperator<ToyCandidate> {
  readonly id = 'toy-new';

  constructor(private readonly factory: ToyCandidateFactory) {}

  async generate(parent: CandidateArtifact<ToyCandidate> | undefined, rng: SeededRng): Promise<ToyCandidate> {
    return this.factory.newCandidate(rng);
  }
}

export class ToyMutateOperator implements CandidateOperator<ToyCandidate> {
  readonly id = 'toy-mutate';

  constructor(private readonly factory: ToyCandidateFactory) {}

  async generate(parent: CandidateArtifact<ToyCandidate> | undefined, rng: SeededRng): Promise<ToyCandidate> {
    if (!parent) return this.factory.newCandidate(rng);
    return this.factory.mutate(parent.content, rng);
  }
}
