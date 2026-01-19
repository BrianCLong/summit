export interface DriftIssue {
  code: 'FK_REL_MISSING'|'ENUM_PARITY'|'CHECKSUM_MISMATCH';
  severity: 'info'|'warn'|'error';
  details: Record<string, unknown>;
}

export interface DriftReport {
  issues: DriftIssue[];
  add(issue: DriftIssue): void;
  hasErrors(): boolean;
}

export class SimpleDriftReport implements DriftReport {
  issues: DriftIssue[] = [];

  add(issue: DriftIssue) {
    this.issues.push(issue);
  }

  hasErrors(): boolean {
    return this.issues.some(i => i.severity === 'error');
  }
}
