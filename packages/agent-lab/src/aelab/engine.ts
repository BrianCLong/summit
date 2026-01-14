import crypto from 'crypto';
import fs from 'fs';

import { EvidenceBundle } from './evidence';
import { MapElitesArchive } from './mapElites';
import { selectOpponents } from './opponents';
import { SeededRng } from './rng';
import { LocalWorkerPool, WorkerPool } from './workerPool';
import {
  AELabRunConfig,
  CandidateArtifact,
  CandidateOperator,
  ChampionRecord,
  CheckpointState,
  DomainAdapter,
  SafetyGate,
} from './types';

export interface RedQueenEngineOptions<TCandidate, TContext> {
  config: AELabRunConfig;
  domain: DomainAdapter<TCandidate, TContext>;
  safetyGate: SafetyGate<TCandidate, TContext>;
  newOperator: CandidateOperator<TCandidate>;
  mutateOperator: CandidateOperator<TCandidate>;
  evidenceDir: string;
  workerPool?: WorkerPool;
}

const stableStringify = (input: unknown): string => {
  const normalize = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(normalize);
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, any>>((acc, key) => {
          acc[key] = normalize(value[key]);
          return acc;
        }, {});
    }
    return value;
  };
  return JSON.stringify(normalize(input));
};

export class RedQueenEngine<TCandidate, TContext> {
  private readonly evidence: EvidenceBundle;
  private readonly workerPool: WorkerPool;
  private rng: SeededRng;
  private champions: ChampionRecord<TCandidate>[] = [];

  constructor(private readonly options: RedQueenEngineOptions<TCandidate, TContext>) {
    this.evidence = new EvidenceBundle(options.evidenceDir, options.config);
    this.workerPool = options.workerPool ?? new LocalWorkerPool(options.config.maxParallel);
    this.rng = new SeededRng(options.config.seed);
  }

  private buildCandidate(content: TCandidate, parents: string[], operatorId: string): CandidateArtifact<TCandidate> {
    const rngSnapshot = this.rng.stateSnapshot();
    const createdAt = new Date(rngSnapshot.calls * 1000).toISOString();
    const contentHash = crypto.createHash('sha256').update(stableStringify(content)).digest('hex');
    const id = crypto
      .createHash('sha256')
      .update(stableStringify({ contentHash, parents, operatorId, rng: rngSnapshot }))
      .digest('hex');
    return {
      id,
      content,
      contentHash,
      createdAt,
      parents,
      metadata: {
        operatorId,
        seed: rngSnapshot,
      },
    };
  }

  private buildCheckpoint(
    config: AELabRunConfig,
    round: number,
    iteration: number,
    archive: MapElitesArchive<TCandidate>,
  ): CheckpointState<TCandidate> {
    return {
      config,
      rng: this.rng.stateSnapshot(),
      round,
      iteration,
      champions: this.champions,
      archive: archive.entries().map((entry) => ({
        cell: entry.index,
        candidate: entry.candidate,
        metrics: entry.metrics,
        descriptor: entry.descriptor,
      })),
    };
  }

  private restoreCheckpoint(checkpoint: CheckpointState<TCandidate>) {
    this.rng = new SeededRng(checkpoint.rng.seed, checkpoint.rng.calls);
    this.champions = checkpoint.champions ?? [];
  }

  private loadCheckpoint(path: string): CheckpointState<TCandidate> | null {
    if (!fs.existsSync(path)) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(path, 'utf-8')) as CheckpointState<TCandidate>;
      if (!raw?.config) return null;
      return raw;
    } catch (err) {
      return null;
    }
  }

  async run() {
    const { config, domain, safetyGate, newOperator, mutateOperator } = this.options;
    this.evidence.init();
    this.evidence.appendEvent({ type: 'run_start', time: new Date().toISOString(), runId: config.runId });

    const checkpointPath = `${this.evidence.runRoot}/checkpoint.json`;
    let startRound = 0;
    let startIteration = 0;
    const checkpoint = config.resume ? this.loadCheckpoint(checkpointPath) : null;
    let archive: MapElitesArchive<TCandidate> | null = null;

    if (checkpoint) {
      this.restoreCheckpoint(checkpoint);
      archive = new MapElitesArchive<TCandidate>(config.gridBins, config.descriptorRanges);
      archive.replace(
        checkpoint.archive.map((entry) => ({
          index: entry.cell,
          candidate: entry.candidate,
          metrics: entry.metrics,
          descriptor: entry.descriptor,
        })),
      );
      startRound = checkpoint.round;
      startIteration = checkpoint.iteration;
    }

    for (let round = startRound; round < config.rounds; round += 1) {
      const context = domain.context(config.seed + round);
      const baselines = domain.baselines();
      const opponents = selectOpponents(this.champions, baselines, config.lastKOpponents, config.includeBaselines);
      const roundStartIteration = round === startRound ? startIteration : 0;
      const roundArchive =
        round === startRound && roundStartIteration > 0 && archive
          ? archive
          : new MapElitesArchive<TCandidate>(config.gridBins, config.descriptorRanges);

      this.evidence.appendEvent({ type: 'round_start', time: new Date().toISOString(), round, opponents: opponents.length });

      if (roundStartIteration === 0 && baselines.length > 0) {
        const baselineResults = await this.workerPool.run(baselines, async (baseline) => {
          const validation = domain.validate(baseline);
          if (!validation.ok) {
            return { baseline, metrics: null, reasons: validation.reasons };
          }
          const preGate = safetyGate.preEval(baseline, context);
          if (!preGate.ok) {
            return { baseline, metrics: null, reasons: preGate.reasons };
          }
          const baselineOpponents = opponents.filter((opp) => opp.id !== baseline.id);
          const metrics = await domain.evaluate(baseline, baselineOpponents, context);
          const postGate = safetyGate.postEval(baseline, metrics, context);
          if (!postGate.ok) {
            return { baseline, metrics: null, reasons: postGate.reasons };
          }
          return { baseline, metrics, reasons: [] };
        });

        baselineResults.forEach((result) => {
          if (!result.metrics) {
            this.evidence.appendEvent({
              type: 'baseline_rejected',
              time: new Date().toISOString(),
              round,
              reasons: result.reasons,
              baseline: result.baseline.id,
            });
            return;
          }
          const descriptor = domain.describe(result.baseline, result.metrics);
          roundArchive.update(result.baseline, result.metrics, descriptor);
          this.evidence.appendEvent({
            type: 'baseline_seeded',
            time: new Date().toISOString(),
            round,
            baseline: result.baseline.id,
            score: result.metrics.score,
          });
        });
      }

      for (let iteration = roundStartIteration; iteration < config.iters; iteration += 1) {
        const useNew =
          iteration < config.nInit
            ? true
            : iteration < config.nInit + config.nMutate
              ? false
              : this.rng.next() < config.sampleNewPercent;
        const parentCell = useNew ? undefined : roundArchive.sample(this.rng);
        const parent = parentCell?.candidate;
        const operator = useNew ? newOperator : mutateOperator;
        const candidateContent = await operator.generate(parent, this.rng);
        const candidate = this.buildCandidate(candidateContent, parent ? [parent.id] : [], operator.id);

        const validation = domain.validate(candidate);
        if (!validation.ok) {
          this.evidence.appendEvent({
            type: 'candidate_rejected',
            time: new Date().toISOString(),
            round,
            iteration,
            reasons: validation.reasons,
          });
          continue;
        }
        const preGate = safetyGate.preEval(candidate, context);
        if (!preGate.ok) {
          this.evidence.appendEvent({
            type: 'candidate_blocked',
            time: new Date().toISOString(),
            round,
            iteration,
            reasons: preGate.reasons,
          });
          continue;
        }

        const metrics = await this.workerPool
          .run([candidate], (item) => domain.evaluate(item, opponents, context))
          .then((results) => results[0]);

        const postGate = safetyGate.postEval(candidate, metrics, context);
        if (!postGate.ok) {
          this.evidence.appendEvent({
            type: 'candidate_filtered',
            time: new Date().toISOString(),
            round,
            iteration,
            reasons: postGate.reasons,
          });
          continue;
        }

        const descriptor = domain.describe(candidate, metrics);
        const updated = roundArchive.update(candidate, metrics, descriptor);

        this.evidence.appendEvent({
          type: 'candidate_evaluated',
          time: new Date().toISOString(),
          round,
          iteration,
          candidate: candidate.id,
          score: metrics.score,
          updated,
        });

        const checkpointState = this.buildCheckpoint(config, round, iteration + 1, roundArchive);
        this.evidence.writeCheckpoint(checkpointState);
      }

      const best = roundArchive.bestOverall();
      if (!best) {
        throw new Error(`No valid candidates in round ${round}`);
      }

      const champion: ChampionRecord<TCandidate> = {
        round,
        candidate: best.candidate,
        metrics: best.metrics,
        descriptor: best.descriptor,
      };
      this.champions.push(champion);
      this.evidence.appendChampion(champion);
      this.evidence.writeArchiveSnapshot(round, roundArchive.entries());
      this.evidence.appendEvent({
        type: 'round_end',
        time: new Date().toISOString(),
        round,
        champion: best.candidate.id,
        score: best.metrics.score,
      });
      const roundCheckpoint = this.buildCheckpoint(config, round + 1, 0, roundArchive);
      this.evidence.writeCheckpoint(roundCheckpoint);
    }

    this.evidence.appendEvent({ type: 'run_end', time: new Date().toISOString() });
    this.evidence.writeManifest(new Date().toISOString());
    return this.champions;
  }
}
