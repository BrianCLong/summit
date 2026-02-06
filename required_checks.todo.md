# Required checks discovery

1. GitHub → Settings → Branches → Branch protection rules.
2. Record required status checks (exact names).
3. Update `.github/workflows/ci-verify-evidence.yml` job names to match.

Temporary gates:
- ci/core
- ci/security
- ci/verify-evidence
