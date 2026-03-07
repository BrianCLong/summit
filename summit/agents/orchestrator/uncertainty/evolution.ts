import { globalRegistry, type UncertaintyRegistry } from './registry.js';
import type { UncertaintyRecord, UncertaintyState } from './models.js';

export class UncertaintyEvolutionWorker {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly registry: UncertaintyRegistry = globalRegistry,
    private readonly checkIntervalMs: number = 60000,
    private readonly expirationMs: number = 7 * 24 * 60 * 60 * 1000, // 7 days
  ) {}

  start(): void {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.evolveAll(), this.checkIntervalMs);
      console.log('UncertaintyEvolution worker started.');
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('UncertaintyEvolution worker stopped.');
    }
  }

  evolveAll(): void {
    const records = this.registry.getAll();
    const now = new Date().getTime();

    for (const record of records) {
      const updatedAt = new Date(record.meta.updated_at).getTime();

      // Check for expiration
      if (now - updatedAt > this.expirationMs) {
        this.registry.updateRecord(record.id, undefined, 'Expired' as UncertaintyState);
        continue;
      }

      // Apply state transition rules
      this.applyRules(record);
    }
  }

  private applyRules(record: UncertaintyRecord): void {
    const state = record.state;
    const scores = record.scores;

    // Detected -> Characterized happens in sensors usually

    // Characterized -> Mitigated
    if (state === 'Characterized') {
      if (
        scores.epistemic_score < 0.4 &&
        scores.disagreement_index < 0.2 &&
        scores.evidence_coverage > 0.6
      ) {
        this.registry.updateRecord(record.id, undefined, 'Mitigated' as UncertaintyState);
      }
    }
    // Mitigated -> Resolved
    else if (state === 'Mitigated') {
      if (
        scores.epistemic_score < 0.2 &&
        scores.aleatoric_score < 0.2 &&
        scores.disagreement_index < 0.1 &&
        scores.evidence_coverage > 0.8
      ) {
        this.registry.updateRecord(record.id, undefined, 'Resolved' as UncertaintyState);
      }
    }

    // Any -> Escalated
    if (state !== 'Escalated' && state !== 'Resolved' && state !== 'Expired') {
      if (
        scores.epistemic_score > 0.8 ||
        scores.disagreement_index > 0.6 ||
        scores.evidence_coverage < 0.2
      ) {
        if (state === 'Characterized' || state === 'Mitigated') {
          this.registry.updateRecord(record.id, undefined, 'Escalated' as UncertaintyState);
        }
      }
    }
  }
}
