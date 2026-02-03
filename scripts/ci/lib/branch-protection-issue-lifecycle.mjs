/**
 * Branch Protection Issue Lifecycle Controller
 * Manages GitHub issues for branch protection drift detection.
 */

const DRIFT_MARKER = '<!-- summit:branch-protection-drift -->';
const GOVERNANCE_LABEL = 'governance';

export const IssueAction = {
  NOOP: 'NOOP',
  UPSERT_DRIFT_ISSUE: 'UPSERT_DRIFT_ISSUE',
  CLOSE_DRIFT_ISSUE: 'CLOSE_DRIFT_ISSUE',
};

export function computeIssueActions({ state, diff, existingDriftIssue, branch, policySource }) {
  const actions = [];
  switch (state) {
    case 'VERIFIED_DRIFT':
      actions.push({
        type: IssueAction.UPSERT_DRIFT_ISSUE,
        title: '[Governance] Branch protection required checks drift',
        body: buildDriftIssueBody({ branch, policySource, diff }),
        labels: [GOVERNANCE_LABEL],
        marker: DRIFT_MARKER,
        existingIssue: existingDriftIssue,
      });
      break;
    case 'VERIFIED_MATCH':
      if (existingDriftIssue) {
        actions.push({ type: IssueAction.CLOSE_DRIFT_ISSUE, issueNumber: existingDriftIssue.number, comment: 'Resolved: branch protection matches policy.' });
      } else {
        actions.push({ type: IssueAction.NOOP, reason: 'No drift issue to close' });
      }
      break;
    default:
      actions.push({ type: IssueAction.NOOP, reason: `Unverifiable state (${state}) - no issue action` });
  }
  return actions;
}

function buildDriftIssueBody({ branch, policySource, diff }) {
  const lines = [DRIFT_MARKER, '', '## Branch Protection Drift Detected', '', `**Branch:** \`${branch}\``, `**Policy Source:** \`${policySource}\``, ''];
  if (diff?.missing_in_github?.length > 0) {
    lines.push('### Missing in GitHub');
    for (const check of diff.missing_in_github.sort()) lines.push(`- \`${check}\``);
    lines.push('');
  }
  if (diff?.extra_in_github?.length > 0) {
    lines.push('### Extra in GitHub');
    for (const check of diff.extra_in_github.sort()) lines.push(`- \`${check}\``);
    lines.push('');
  }
  lines.push('## Remediation', '', '1. Review the policy file and GitHub branch protection settings', '2. Update either the policy or GitHub to match', '3. This issue will auto-close when drift is resolved');
  return lines.join('\n');
}

export { DRIFT_MARKER, GOVERNANCE_LABEL };
