export type DriftCode =
  | 'FK_REL_MISSING'
  | 'ENUM_PARITY'
  | 'CHECKSUM_MISMATCH';

export interface DriftIssue {
  code: DriftCode;
  severity: 'info' | 'warn' | 'error';
  details: Record<string, unknown>;
}

export class DriftReport {
  issues: DriftIssue[] = [];

  add(issue: DriftIssue) {
    this.issues.push(issue);
  }

  hasErrors(): boolean {
    return this.issues.some(i => i.severity === 'error');
  }
}
