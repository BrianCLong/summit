import { CandidateRecord } from './types';

export type ArchiveCellKey = string;

export interface ArchiveDimensions {
  riskBins: number[];
  diffSizeBins: number[];
  testImpactBins: number[];
}

export class MapElitesArchive {
  private readonly cells = new Map<ArchiveCellKey, CandidateRecord>();
  private readonly dimensions: ArchiveDimensions;

  constructor(dimensions: ArchiveDimensions) {
    this.dimensions = dimensions;
  }

  insert(candidate: CandidateRecord): { key: ArchiveCellKey; promoted: boolean } {
    const key = this.cellKey(candidate);
    const existing = this.cells.get(key);
    if (!existing || this.isBetter(candidate, existing)) {
      this.cells.set(key, candidate);
      return { key, promoted: true };
    }
    return { key, promoted: false };
  }

  list(): CandidateRecord[] {
    return Array.from(this.cells.values());
  }

  getCell(key: ArchiveCellKey): CandidateRecord | undefined {
    return this.cells.get(key);
  }

  cellKey(candidate: CandidateRecord): ArchiveCellKey {
    const risk = this.bucket(candidate.metadata.risk, this.dimensions.riskBins);
    const diff = this.bucket(
      candidate.metadata.diffSize,
      this.dimensions.diffSizeBins,
    );
    const test = this.bucket(
      candidate.metadata.testImpact,
      this.dimensions.testImpactBins,
    );
    return `risk:${risk}|diff:${diff}|test:${test}`;
  }

  private bucket(value: number, bins: number[]): string {
    for (let index = 0; index < bins.length; index += 1) {
      if (value <= bins[index]) {
        return `<=${bins[index]}`;
      }
    }
    return `>${bins[bins.length - 1]}`;
  }

  private isBetter(candidate: CandidateRecord, existing: CandidateRecord): boolean {
    if (!candidate.evaluation || !existing.evaluation) {
      return Boolean(candidate.evaluation) && !existing.evaluation;
    }
    if (candidate.evaluation.score !== existing.evaluation.score) {
      return candidate.evaluation.score > existing.evaluation.score;
    }
    return candidate.noveltyScore > existing.noveltyScore;
  }
}
