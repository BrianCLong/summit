# Vulnerability Triage Runbook

## Phase 1: Intake
1.  **Receive Report**: Check `security@summit.com`.
2.  **Ack**: Reply to researcher within 48h. "We have received your report and are investigating."
3.  **Log**: Create a private issue in `summit-security-private` repo (or internal Jira). Label `vulnerability`.

## Phase 2: Analysis (Triage)
1.  **Reproduce**: Can you replicate the issue?
2.  **Severity**: Assign CVSS score.
    *   Critical (9.0+): P0
    *   High (7.0-8.9): P1
    *   Medium (4.0-6.9): P2
    *   Low: P3
3.  **Determine Fix**: Identify the code owner.

## Phase 3: Remediation
1.  **Develop Fix**: Create a branch.
2.  **Test**: Verify fix and ensure no regressions.
3.  **Review**: Security Team must review the PR.
4.  **Merge & Deploy**:
    *   Critical: Hotfix immediately.
    *   High: Next scheduled release or hotfix.

## Phase 4: Disclosure
1.  **Notify Researcher**: Confirm fix is deployed.
2.  **Publish Advisory**: If applicable (Github Security Advisory).
3.  **Credit**: Add researcher to Hall of Fame (if accepted).
