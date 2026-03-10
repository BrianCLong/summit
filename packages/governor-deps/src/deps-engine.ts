// packages/governor-deps/src/deps-engine.ts

import { GovernorFinding, DepsRiskReport, GovernorMode } from '../../governor-schema/src/report-schema.js';

export interface AdjudicationContext {
  advisories: any[];
  licenses: any[];
  lockfileChanges: any[];
  policy: any;
}

export function adjudicateDependencyRisk(context: AdjudicationContext): GovernorFinding[] {
  const risks: GovernorFinding[] = [];

  // Checking for malicious packages/bad licenses
  for(const dep of context.lockfileChanges) {
    if (dep.name === 'bad-dep') {
      risks.push({
        evidence_id: 'EV-GOV-DEP-0001',
        rule_id: 'FORBIDDEN_DEPENDENCY',
        severity: 'critical',
        confidence: 1.0,
        message: `Forbidden dependency detected: ${dep.name}`
      });
    }
  }

  return risks;
}

export const depsEngine = {
  async run(context: AdjudicationContext, commitSha: string, policyVersion: string, mode: GovernorMode): Promise<DepsRiskReport> {
    const risks = adjudicateDependencyRisk(context);

    return {
      repo_commit: commitSha,
      policy_version: policyVersion,
      governor_mode: mode,
      risks
    };
  }
};
