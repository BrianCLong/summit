# Required Status Checks (GA Branches)

Add these checks to branch protection for `main` and `release/*`:

- validate-gates-and-promql / validate-gates
- validate-gates-and-promql / promtool-check
- validate-gates-and-promql / alertmanager-config
- opa-test / opa-unit-tests
- hygiene / actionlint
- hygiene / shellcheck

Optional (if present):
- validate-gates-and-promql / promtool-config (if split from rules job)

Notes
- Ensure `Require branches to be up to date` is on.
- Require reviews from CODEOWNERS for paths under ops/**, tools/igctl/**, .github/workflows/**.
