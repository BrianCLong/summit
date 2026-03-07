# Weekly Upgrade Delta Report
## What Changed
- Upgraded Node.js to v22 across all CI workflows, Dockerfiles, and package configurations.
- Pinned OPA openpolicyagent/opa image to specific version 0.61.0, replacing 'latest' tags for better reproducibility and security.

## Why
- Moving to Node 22 leverages LTS features, performance improvements, and ensures long-term support.
- Pinning container image tags mitigates the risk of unexpected runtime breaks and supply chain attacks caused by unvetted 'latest' images.

## Risk Assessment
- **Risk:** Low. Changes are restricted to build environments and runtime versions; backwards compatibility in Node and OPA minor versions expected.
- **Rollback Plan:** Revert Node.js version updates to 20 and OPA tags to their previous state in case of CI/CD pipeline failures or production issues.
