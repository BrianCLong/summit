import { CandidateRecord } from './types';

export interface IslandState {
  id: string;
  queue: CandidateRecord[];
  history: CandidateRecord[];
}

export class IslandModel {
  private readonly islands: IslandState[];
  private readonly migrationInterval: number;
  private generationCount = 0;

  constructor(islandCount: number, migrationInterval: number) {
    this.islands = Array.from({ length: islandCount }, (_, index) => ({
      id: `island-${index + 1}`,
      queue: [],
      history: [],
    }));
    this.migrationInterval = migrationInterval;
  }

  seed(islandId: string, candidates: CandidateRecord[]): void {
    const island = this.requireIsland(islandId);
    island.queue.push(...candidates);
  }

  nextCandidate(): { islandId: string; candidate: CandidateRecord } | undefined {
    const island = this.islands.find((state) => state.queue.length > 0);
    if (!island) {
      return undefined;
    }
    const candidate = island.queue.shift()!;
    island.history.push(candidate);
    return { islandId: island.id, candidate };
  }

  recordResult(islandId: string, candidate: CandidateRecord): void {
    const island = this.requireIsland(islandId);
    island.history.push(candidate);
  }

  migrate(topCandidates: CandidateRecord[]): void {
    if (this.islands.length < 2) {
      return;
    }
    topCandidates.forEach((candidate, index) => {
      const target = this.islands[index % this.islands.length];
      const alreadySeen =
        target.queue.some((item) => item.id === candidate.id) ||
        target.history.some((item) => item.id === candidate.id);
      if (!alreadySeen) {
        target.queue.push({ ...candidate, status: 'queued' });
      }
    });
  }

  tickGeneration(topCandidates: CandidateRecord[]): void {
    this.generationCount += 1;
    if (this.generationCount % this.migrationInterval === 0) {
      this.migrate(topCandidates);
    }
  }

  listIslands(): IslandState[] {
    return this.islands.map((island) => ({
      ...island,
      queue: [...island.queue],
      history: [...island.history],
    }));
  }

  private requireIsland(islandId: string): IslandState {
    const island = this.islands.find((state) => state.id === islandId);
    if (!island) {
      throw new Error(`Island ${islandId} not found`);
    }
    return island;
  }
}
