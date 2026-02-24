# Repo Assumptions & Validation — CADDS Intake

Reference: [Summit Readiness Assertion](docs/SUMMIT_READINESS_ASSERTION.md).

## Verified (inspected in repo)

- `docs/` exists and is the primary documentation root.
- `docs/standards/` exists for standards/interop documentation.
- `docs/security/` exists for security and data-handling guidance.
- `docs/ops/runbooks/` exists for operational runbooks.
- `.github/pull_request_template.md` exists and includes the AGENT-METADATA block template.
- `docs/roadmap/STATUS.json` exists and is the execution assignment ledger.

## Assumed (deferred pending validation)

- `docs/ci/REQUIRED_CHECKS_POLICY.yml` defines authoritative branch protection check names.
- The repo’s primary test runner is `pnpm`-based with supplemental `make` targets.
- Outbound HTTP is disallowed in CI by default; fixture-driven ingestion is required.

## Must-Not-Touch Files

- None declared (list intentionally constrained; expand only with explicit governance direction).
