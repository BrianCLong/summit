# Security Batch 1 Playbook

This playbook defines the standard operating procedure for handling security alerts, vulnerabilities, and code scanning findings in the `BrianCLong/summit` repository. It is designed to support "Security Batch" sprints but applies to daily operations as well.

## 1. Triage Process

The goal of triage is to assess the validity, severity, and impact of a finding and determine the appropriate action.

### 1.1 Dependabot Alerts
*   **Source**: GitHub Security Tab -> Dependabot
*   **Process**:
    1.  **Review Compatibility**: Check the "Compatibility" score. If high, the update is likely safe.
    2.  **Assess Severity**:
        *   **Critical/High**: Must be addressed immediately.
        *   **Moderate/Low**: Can be grouped into a batch PR or monthly maintenance.
    3.  **Action**:
        *   If a PR exists, review the changelog and tests. Merge if passing.
        *   If no PR exists, manually trigger one or bump the version in `package.json`.
    4.  **False Positives**: If a dependency is used only in a non-production context (and not reachable/exploitable), dismiss as "Vulnerable code not actually used" or "No bandwidth to fix" (with justification).

### 1.2 Code Scanning (CodeQL)
*   **Source**: GitHub Security Tab -> Code Scanning
*   **Process**:
    1.  **Analyze Data Flow**: Trace the source (taint) to the sink. Is there a sanitizer?
    2.  **Verify Relevance**: Is the code reachable? Is it test code?
    3.  **Action**:
        *   **Fix**: Apply a patch to sanitize input or remove the vulnerability.
        *   **Dismiss**:
            *   "False positive": The tool is mistaken (e.g., flow is impossible).
            *   "Used in tests": Finding is in test code and not a risk.
            *   "Won't fix": Accepted risk (requires approval from Security Lead).

### 1.3 Secret Scanning
*   **Source**: GitHub Security Tab -> Secret Scanning
*   **Process**:
    1.  **Revoke**: Immediately revoke the exposed credential in the provider (AWS, Stripe, etc.).
    2.  **Rotate**: Generate a new secret and update GitHub Secrets / Vault.
    3.  **Remediate**: Remove the secret from history if possible (BFG Repo-Cleaner) or squash commits. **Do not just delete the file in a new commit; the history remains.**
    4.  **Dismiss**: Only if it is a verified false positive (e.g., a hash that looks like a key).

## 2. Priority Rules (SLA)

| Severity | SLA | Description |
| :--- | :--- | :--- |
| **Critical** | **24 Hours** | Immediate fix required. Blocks all releases. Hotfix if in production. |
| **High** | **Sprint** | Fix within current sprint. Blocks release if exploit is public/trivial. |
| **Medium** | **Backlog** | Schedule for next sprint or "Security Batch". |
| **Low** | **Tech Debt** | Best effort / "Good First Issue". |

## 3. PR Structure for Security Fixes

When opening a PR to fix a security issue, follow these guidelines to ensure rapid review and approval.

### 3.1 Naming Convention
*   `fix(security): <description> [CVE-XXXX-XXXX]`
*   Example: `fix(security): sanitize user input in search [CVE-2023-1234]`
*   Example: `chore(deps): bump lodash from 4.17.15 to 4.17.21`

### 3.2 Description
Use the standard PR template but ensure the following are present:
*   **Impact Analysis**: What was the risk?
*   **Verification**: How can we verify the fix? (e.g., "Run `npm audit`", "Run exploit script X").
*   **Regression Testing**: What tests were added to prevent recurrence?

### 3.3 Labels
*   `security`
*   `priority: <level>` (e.g., `priority: critical`, `priority: high`)
*   `area: <component>` (e.g., `area: auth`, `area: api`)

### 3.4 Checklist
Refer to `docs/security/PR_SECURITY_CHECKLIST.md` for the full checklist.
1.  [ ] CI passes (especially `ci-security`).
2.  [ ] No new alerts introduced.
3.  [ ] Unit/Integration test added for the specific vulnerability case.

## 4. Acceptance Criteria

A security fix is considered "Done" when:
1.  **Alert is Closed**: The finding in GitHub Security Tab is marked as "Fixed" (automatically on merge).
2.  **Tests Pass**: All CI checks pass, including the new security tests.
3.  **No Regressions**: Existing functionality remains intact.
4.  **Evidence**: A screenshot or log showing the fix is effective (for manual verification).

## 5. Automation

To assist with this playbook, the following automation is available:
*   **Daily Triage**: A scheduled workflow runs daily to report open High/Critical alerts.
*   **Labeling**: PRs touching sensitive areas are automatically labeled (via `triage-routing`).
*   **Blocking**: `ci-security.yml` blocks merges if new High/Critical vulnerabilities are introduced.

### Invoking the Batch Triage
To start a manual batch triage:
1.  Go to **Actions** -> **Security Playbook Automation**.
2.  Click **Run workflow**.
3.  Check the generated issue for a list of prioritized tasks.

**Note**: To access Dependabot and Secret Scanning alerts, the workflow requires a `SECURITY_TRIAGE_PAT` secret (Personal Access Token) with `security_events` and `repo` scopes. Without this, only Code Scanning alerts will be reported.
