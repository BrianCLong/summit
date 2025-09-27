import type { ActionRecord, PropagationDomain } from './types';

const DOMAINS: PropagationDomain[] = ['caches', 'indexes', 'features', 'exports'];

export class ActionLog {
  private readonly records: ActionRecord[] = [];

  record(entry: ActionRecord): void {
    this.records.push(entry);
  }

  recordsForPlan(planId: string): ActionRecord[] {
    return this.records.filter((record) => record.planId === planId);
  }

  hasRecord(planId: string, domain: PropagationDomain, target: string): boolean {
    return this.records.some(
      (record) =>
        record.planId === planId &&
        record.domain === domain &&
        record.target === target &&
        record.status === 'purged'
    );
  }

  static domains(): PropagationDomain[] {
    return DOMAINS;
  }
}
