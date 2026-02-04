## Discover required checks
1) GitHub UI: repo → Settings → Branches → Branch protection rules → Required status checks
2) Or API: GET /repos/{owner}/{repo}/branches/{branch}/protection
## Temporary convention
- "summit/ci-gate-shim" must pass until renamed to match real required checks.
## Rename plan
- Update `.github/workflows/ci-gate-shim.yml` job name to exact required-check string(s).
