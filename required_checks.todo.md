## Required checks discovery (RDP)

1. In GitHub repo: Settings → Branches → Branch protection rules
2. Record exact check names required for merge
3. Replace placeholders in `.github/workflows/ci.yml`

Temporary checks expected:

- ci/summit-security-foundation
- ci/summit-security-gates
- ci/summit-security-deps

- Use: `gh api repos/<OWNER>/<REPO>/branches/<BRANCH>/protection/required_status_checks`
- Copy `contexts[]` into manifest.

## Temporary convention (until verified)

- Use `subsumption-bundle-verify` as the proposed check name for existing gates.
- New temporary gates: `gate:evidence-schema`, `gate:no-timestamps-outside-stamp`,
  `gate:copilot-metrics-deny-by-default`, `gate:no-signed-urls`.
- Rename plan: if mismatch found, update workflow job name + manifest + docs in a single PR.
