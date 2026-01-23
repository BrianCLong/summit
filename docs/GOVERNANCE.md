# Repository Protection Standards

To ensure the stability of the Production environment, the following Branch Protection Rules **MUST** be configured in the GitHub Repository Settings.

## 1. Branch Protection Rule: `main`

*   **Require a pull request before merging:** Enabled.
*   **Require approvals:** 1 (minimum).
*   **Dismiss stale pull request approvals when new commits are pushed:** Enabled.
*   **Require status checks to pass before merging:** Enabled.
    *   `build-and-push (maestro)`
    *   `build-and-push (prov-ledger)`
    *   `Security Scan (Trivy)`
*   **Require linear history:** Enabled (prevents merge commits, keeps history clean).
*   **Include administrators:** Enabled (prevents "cowboy coding" by admins).

## 2. Environment Protection: `prod`

Go to **Settings -> Environments -> prod**:
*   **Required Reviewers:** Add the Tech Lead or DevOps team.
*   **Wait Timer:** 0 minutes (or set 10m to allow for cancellation).
*   **Deployment Branches:** Only `tags` (e.g., `v*`) or specific release branches.

## 3. Secret Security

*   Ensure `AWS_ACCOUNT_ID` is defined at the **Repository** or **Organization** level, not Environment level (unless you have separate AWS accounts per env).
*   Rotate the IAM Role (`github-actions-deploy-role`) credentials every 90 days.