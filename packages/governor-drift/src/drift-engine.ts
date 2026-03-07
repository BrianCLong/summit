// packages/governor-drift/src/drift-engine.ts

import { GovernorFinding, DriftReport, GovernorMode } from '../../governor-schema/src/report-schema.js';

export function crossesForbiddenBoundary(change: string, boundaryRules: any[]): boolean {
  // Real implementation would verify if module A tries to import module B directly, bypassing the established interfaces.
  return change.includes('import * from "../private"');
}

export function makeDriftFinding(type: string, change: string): GovernorFinding {
  return {
    evidence_id: `EV-GOV-DRF-0001`,
    rule_id: type,
    severity: 'high',
    confidence: 1.0,
    message: `Boundary violation detected: ${change}`
  };
}

export const driftEngine = {
  async run(changes: string[], boundaryRules: any[], commitSha: string, policyVersion: string, mode: GovernorMode): Promise<DriftReport> {
    const findings: GovernorFinding[] = [];

    for (const change of changes) {
      if (crossesForbiddenBoundary(change, boundaryRules)) {
        findings.push(makeDriftFinding("architecture_violation", change));
      }
    }

    return {
      repo_commit: commitSha,
      policy_version: policyVersion,
      governor_mode: mode,
      violations: findings
    };
  }
};
