# GitHub App Blueprint: SCA Auto-Remediator

This blueprint outlines a GitHub App that opens remediation PRs when the supply-chain gates discover fixable issues.

## Permissions
- Contents: read/write (for PR branches)
- Pull requests: write (post comments and labels)
- Security events: read
- Dependabot alerts: read
- Checks: write (report SCA gates)

## Event subscriptions
- `security_advisory`
- `code_scanning_alert`
- `check_suite`
- `pull_request`

## Behavior
1. When a vulnerability or license violation is detected, the app:
   - Locates the impacted manifest or package.
   - Creates a fix branch with the patch version or dependency bump.
   - Opens a PR referencing the detected issue with a checklist for dual-control review.
2. The app attaches SBOM fragment diff and links to cosign attestations.
3. License exceptions flow requires two approvers; the bot refuses to merge without both approvals recorded in the PR body.

## Implementation sketch
- Build with [Probot](https://probot.github.io/).
- Store state (open exceptions, burn-down metrics) in GitHub issue comments to avoid external storage.
- Include a lightweight rule engine mirroring `policy/policy.json`.
- Use GitHub Code Scanning SARIF uploads to annotate files with license violation locations.
