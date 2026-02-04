import { DriftPair, ReconciliationRun, newIdentifier } from './types.js';

export class ReconciliationEngine {
  private pairs = new Map<string, DriftPair>();
  private runs: ReconciliationRun[] = [];

  registerPair(pair: DriftPair) {
    this.pairs.set(pair.id, pair);
  }

  listPairs(): DriftPair[] {
    return Array.from(this.pairs.values());
  }

  listRuns(): ReconciliationRun[] {
    return [...this.runs];
  }

  async runPair(pairId: string) {
    const pair = this.pairs.get(pairId);
    if (!pair) throw new Error(`Unknown drift pair ${pairId}`);

    const startedAt = new Date();
    const source = await pair.loadSource();
    const target = await pair.loadTarget();
    const drift = pair.diff(source, target);
    const autoFixes: string[] = [];

    if (drift.length > 0 && pair.autoFix && pair.riskTier !== 'high') {
      const fixes = await pair.autoFix(drift);
      autoFixes.push(...fixes);
    }

    const run: ReconciliationRun = {
      id: newIdentifier(),
      pairId,
      startedAt,
      completedAt: new Date(),
      driftDetected: drift,
      autoFixesApplied: autoFixes,
      requiresReview: drift.length > autoFixes.length,
    };

    this.runs.push(run);
    return run;
  }

  metrics() {
    const totalRuns = this.runs.length;
    const totalDrift = this.runs.reduce((sum, run) => sum + run.driftDetected.length, 0);
    const totalAutoFixes = this.runs.reduce((sum, run) => sum + run.autoFixesApplied.length, 0);
    const avgDrift = totalRuns === 0 ? 0 : totalDrift / totalRuns;
    const recurrence = this.runs.filter((run) => run.driftDetected.length > 0).length;

    return {
      totalRuns,
      avgDrift,
      totalAutoFixes,
      recurrence,
    };
  }
}
