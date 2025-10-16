import { recordProvenance, hashObject } from '../provenance/ledger';

export interface GenerationContext<T> {
  specId: string;
  attempt: number;
  payload: T;
}

export type GeneratorFn<T, R> = (ctx: GenerationContext<T>) => Promise<R>;
export type CriticFn<R> = (
  result: R,
) => Promise<{ score: number; reasons?: string[] }>;
export type RepairFn<T, R> = (
  result: R,
  ctx: GenerationContext<T>,
) => Promise<T>;

export interface SelfRefineOptions<T, R> {
  maxLoops: number;
  scoreThreshold: number;
  critics: CriticFn<R>[];
  repair: RepairFn<T, R>;
  initial: T;
}

export async function selfRefine<T, R>(
  generator: GeneratorFn<T, R>,
  options: SelfRefineOptions<T, R>,
  specId: string,
): Promise<{ result: R; score: number; iterations: number }> {
  let payload = options.initial;
  let best: { result: R; score: number } | null = null;

  for (let attempt = 0; attempt < options.maxLoops; attempt += 1) {
    const ctx: GenerationContext<T> = { specId, attempt, payload };
    const result = await generator(ctx);
    const criticScores = await Promise.all(
      options.critics.map((critic) => critic(result)),
    );
    const score = aggregateScores(criticScores);

    recordProvenance({
      reqId: specId,
      step: 'critic',
      inputHash: hashObject(payload),
      outputHash: hashObject({ result, score }),
      policy: { retention: 'standard-365d', purpose: 'engineering' },
      time: { start: new Date().toISOString(), end: new Date().toISOString() },
      tags: ['self-refine', `attempt:${attempt}`],
    });

    if (!best || score > best.score) {
      best = { result, score };
    }
    if (
      score >= options.scoreThreshold ||
      criticScores.every((c) => (c.score ?? 0) >= options.scoreThreshold)
    ) {
      return { result, score, iterations: attempt + 1 };
    }
    payload = await options.repair(result, ctx);
  }

  if (!best) throw new Error('self refine failed to produce result');
  return {
    result: best.result,
    score: best.score,
    iterations: options.maxLoops,
  };
}

function aggregateScores(
  scores: { score: number; reasons?: string[] }[],
): number {
  const filtered = scores.map((s) => s.score).filter((s) => Number.isFinite(s));
  if (!filtered.length) return 0;
  filtered.sort((a, b) => a - b);
  const trim = filtered.length > 4 ? Math.floor(filtered.length * 0.1) : 0;
  const trimmed = filtered.slice(trim, filtered.length - trim || undefined);
  const pool = trimmed.length ? trimmed : filtered;
  const sum = pool.reduce((acc, val) => acc + val, 0);
  return sum / pool.length;
}
