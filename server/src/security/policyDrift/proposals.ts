import { PolicyDriftReport } from './types.js';

export interface PolicyChangeProposal {
  title: string;
  action: 'revert' | 'open_pr' | 'tighten_governance';
  description: string;
  severity: PolicyDriftReport['severity'];
}

export function generatePolicyChangeProposals(report: PolicyDriftReport): PolicyChangeProposal[] {
  if (report.diffs.length === 0) return [];

  const proposals: PolicyChangeProposal[] = [
    {
      title: 'Revert runtime drift to baseline',
      action: 'revert',
      description: 'Prepare rollback or configuration restore to align runtime with repository baseline snapshot.',
      severity: report.severity,
    },
    {
      title: 'Open PR to reconcile legitimate runtime changes',
      action: 'open_pr',
      description: 'Codify approved runtime adjustments into the repository baseline via a formal pull request.',
      severity: report.severity,
    },
    {
      title: 'Tighten governance to prevent recurrence',
      action: 'tighten_governance',
      description: 'Add approval gates, alerts, or automation to block unreviewed policy/config mutations.',
      severity: report.severity,
    },
  ];

  return proposals;
}
