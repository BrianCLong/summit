// packages/governor-remediation/src/remediation-engine.ts

import { GovernorFinding, RemediationPlan, GovernorMode } from '../../governor-schema/src/report-schema.js';

export function isAllowlisted(finding: GovernorFinding): boolean {
  // Only remediate low risk known issues automatically
  return finding.rule_id === 'ALLOWED_BUMP_CLASS' || finding.rule_id === 'TRIVIAL_LINT';
}

export const remediationEngine = {
  async planPatch(finding: GovernorFinding) {
    return {
      finding_evidence_id: finding.evidence_id,
      patch: `// Fix applied for ${finding.rule_id}`
    };
  },

  async run(findings: GovernorFinding[], commitSha: string, policyVersion: string, mode: GovernorMode, flags: { AUTO_REMEDIATION_ENABLED: boolean }): Promise<RemediationPlan> {
    const plans = [];

    for (const finding of findings) {
      if (flags.AUTO_REMEDIATION_ENABLED && isAllowlisted(finding)) {
        const patch = await this.planPatch(finding);
        plans.push(patch);
      }
    }

    return {
      repo_commit: commitSha,
      policy_version: policyVersion,
      governor_mode: mode,
      patches: plans
    };
  }
};
