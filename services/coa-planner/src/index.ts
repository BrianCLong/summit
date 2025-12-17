export interface COANode {
  id: string;
  action: string;
  resources: string[];
  duration: number; // hours
  riskFactor: number; // 0-1
  dependencies: string[];
}

export interface SimulationResult {
  coaId: string;
  runs: number;
  outcomes: { success: number; failure: number; delayed: number };
  avgDuration: number;
  riskBands: { low: number; medium: number; high: number };
}

export class COAPlanner {
  private coas: Map<string, COANode[]> = new Map();

  loadCOA(coaId: string, nodes: COANode[]) {
    this.coas.set(coaId, nodes);
  }

  simulate(coaId: string, runs: number = 1000, seed?: number): SimulationResult {
    const coa = this.coas.get(coaId);
    if (!coa) throw new Error('COA not found');

    let success = 0, failure = 0, delayed = 0;
    let totalDuration = 0;
    const rng = seed !== undefined ? this.seededRandom(seed) : Math.random;

    for (let i = 0; i < runs; i++) {
      let duration = 0;
      let failed = false;

      for (const node of coa) {
        duration += node.duration * (1 + (rng() - 0.5) * 0.2); // ±10% variance
        if (rng() < node.riskFactor) {
          failed = true;
          break;
        }
      }

      if (failed) failure++;
      else if (duration > coa.reduce((sum, n) => sum + n.duration, 0) * 1.2) delayed++;
      else success++;

      totalDuration += duration;
    }

    const avgDuration = totalDuration / runs;
    const successRate = success / runs;

    return {
      coaId,
      runs,
      outcomes: { success, failure, delayed },
      avgDuration,
      riskBands: {
        low: successRate > 0.7 ? successRate : 0,
        medium: successRate > 0.3 && successRate <= 0.7 ? successRate : 0,
        high: successRate <= 0.3 ? successRate : 0,
      },
    };
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }
}
