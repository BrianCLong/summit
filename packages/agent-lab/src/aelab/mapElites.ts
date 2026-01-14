import { SeededRng } from './rng';
import { BehaviorDescriptor, CandidateArtifact, EvaluationMetrics } from './types';

export interface ArchiveCell<TCandidate> {
  index: number[];
  candidate: CandidateArtifact<TCandidate>;
  metrics: EvaluationMetrics;
  descriptor: BehaviorDescriptor;
}

export class MapElitesArchive<TCandidate> {
  private cells = new Map<string, ArchiveCell<TCandidate>>();

  constructor(
    private readonly bins: number[],
    private readonly ranges: Array<[number, number]>,
  ) {
    if (bins.length !== ranges.length) {
      throw new Error('bins and ranges length mismatch');
    }
  }

  private key(index: number[]) {
    return index.join(':');
  }

  indexFor(descriptor: BehaviorDescriptor): number[] {
    return descriptor.axes.map((value, idx) => {
      const [min, max] = this.ranges[idx];
      const clamped = Math.min(Math.max(value, min), max);
      const span = max - min || 1;
      const bin = Math.min(this.bins[idx] - 1, Math.floor(((clamped - min) / span) * this.bins[idx]));
      return Math.max(0, bin);
    });
  }

  update(
    candidate: CandidateArtifact<TCandidate>,
    metrics: EvaluationMetrics,
    descriptor: BehaviorDescriptor,
  ) {
    const index = this.indexFor(descriptor);
    const key = this.key(index);
    const current = this.cells.get(key);
    if (!current || metrics.score > current.metrics.score) {
      this.cells.set(key, { index, candidate, metrics, descriptor });
      return true;
    }
    return false;
  }

  entries(): Array<ArchiveCell<TCandidate>> {
    return Array.from(this.cells.values());
  }

  bestOverall(): ArchiveCell<TCandidate> | undefined {
    let best: ArchiveCell<TCandidate> | undefined;
    for (const cell of this.cells.values()) {
      if (!best || cell.metrics.score > best.metrics.score) {
        best = cell;
      }
    }
    return best;
  }

  sample(rng: SeededRng): ArchiveCell<TCandidate> | undefined {
    const items = this.entries();
    if (items.length === 0) return undefined;
    return items[rng.int(items.length)];
  }

  replace(entries: Array<ArchiveCell<TCandidate>>) {
    this.cells = new Map(entries.map((entry) => [this.key(entry.index), entry]));
  }
}
