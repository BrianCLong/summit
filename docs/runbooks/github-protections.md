# GitHub Protections

## Branch Protection (main)
- Require status checks to pass: `build-test-validate`, `canary-gate`.
- Require code scanning results (SARIF upload present).
- Require linear history; dismiss stale approvals on new pushes.

## Environments
- **staging**: required reviewers = SRE, Security; wait timer 10m; secrets scoped.
- **production**: required reviewers = MC, SRE; wait timer 30m; secrets scoped; manual approval required.

## Audit
Export protection rules via the GitHub API and save to `evidence/gh-protections/<date>.json` for audits.
