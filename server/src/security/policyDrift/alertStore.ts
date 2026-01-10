import { PolicyDriftReport } from './types.js';
import { PolicyChangeProposal } from './proposals.js';

export interface DriftAlert {
  id: string;
  severity: PolicyDriftReport['severity'];
  report: PolicyDriftReport;
  proposals: PolicyChangeProposal[];
  createdAt: string;
}

export class DriftAlertStore {
  private alerts: DriftAlert[] = [];

  add(alert: DriftAlert) {
    this.alerts.push(alert);
  }

  all(): DriftAlert[] {
    return [...this.alerts];
  }

  clear(): void {
    this.alerts = [];
  }
}

export const driftAlertStore = new DriftAlertStore();
