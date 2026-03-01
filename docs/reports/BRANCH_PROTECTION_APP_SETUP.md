# GitHub App Setup for Branch Protection Drift Detection

To eliminate "Insufficient permissions to read branch protection" errors and enable release-gating based on governance drift, you must configure a GitHub App.

The default `GITHUB_TOKEN` provided by Actions lacks the necessary `Administration: read` permissions required to query the branch protection API unless the workflow runs with elevated privileges on the default branch (which is an insecure anti-pattern).

## 1. Create the GitHub App

1. Go to your Organization Settings -> Developer settings -> GitHub Apps
2. Click **New GitHub App**
3. Name it appropriately (e.g., \`Summit Governance Bot\`)
4. Homepage URL can be your repo URL
5. **Disable** Webhook (not needed for this use case)

## 2. Configure Permissions

The App requires the following **Repository permissions**:

*   **Administration**: \`Read-only\` (Required to read branch protection rules)
*   **Contents**: \`Read-only\` (Required to read repository files)
*   **Issues**: \`Read & write\` (Required to create and update drift issues)
*   **Pull requests**: \`Read-only\` (Optional, useful if commenting on PRs later)

## 3. Generate and Store Credentials

1. **App ID**: Note the App ID from the General settings page.
2. **Private Key**: Scroll down and click **Generate a private key**. Download the \`.pem\` file.
3. Install the App on your target repository (\`BrianCLong/summit\`).

Add the following as **Repository Secrets** (Settings -> Secrets and variables -> Actions):

*   \`BRANCH_PROTECTION_APP_ID\`: The App ID (e.g., \`123456\`)
*   \`BRANCH_PROTECTION_APP_PRIVATE_KEY\`: The entire contents of the \`.pem\` file.

*Important format note for the private key*: Copy the *entire* content including the \`-----BEGIN RSA PRIVATE KEY-----\` and \`-----END RSA PRIVATE KEY-----\` lines.

## 4. Validation

You can validate the setup by triggering a dry-run of the drift workflow.

\`\`\`bash
gh workflow run branch-protection-drift.yml -f dry_run=true
\`\`\`

**Success criteria:**
* The workflow run should show "Using GitHub App for authentication" or similar.
* The script should successfully fetch the branch protection rules without a \`403 Forbidden\` or \`404 Not Found\` API error.
* If there is drift, it will be reported in the artifacts, but no issue will be created (due to dry-run).
