# P0/P1 Remediation Ledger

This ledger tracks P0/P1 security and governance remediation for Summit. Authority flows from
`docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, and
`docs/SUMMIT_READINESS_ASSERTION.md`.

## P1-SEC-001 — qs DoS advisory (GHSA-6rw7-vpxm-498p)

- **Status:** Remediated
- **Evidence:** `pnpm audit --prod` reported qs `<6.14.1` in Express/body-parser dependency chains.
- **Remediation:** Add pnpm override for `qs@6.14.1` and regenerate `pnpm-lock.yaml`.
- **Verification:** `pnpm audit --prod`; `pnpm why qs`.

## P1-GOV-001 — Summit Readiness Assertion missing

- **Status:** Remediated
- **Evidence:** `docs/SUMMIT_READINESS_ASSERTION.md` absent from repository.
- **Remediation:** Create readiness assertion anchored to GA readiness reports and governance
  authority files.
- **Verification:** `test -f docs/SUMMIT_READINESS_ASSERTION.md`.

## P1-COMP-001 — Evidence index gap for security gates

- **Status:** Remediated
- **Evidence:** `docs/compliance/EVIDENCE_INDEX.md` not present, leaving security gate evidence
  uncataloged.
- **Remediation:** Create evidence index and align control mappings to actual workflows.
- **Verification:** `test -f docs/compliance/EVIDENCE_INDEX.md`; confirm entries for security gates.

## P1-SEC-002 — Security controls documentation drift

- **Status:** Remediated
- **Evidence:** `SECURITY.md` claims `.github/workflows/ci-security.yml` runs on every PR, but it
  is invoked via `pr-quality-gate.yml`.
- **Remediation:** Update `SECURITY.md` to reflect actual gating workflows and triggers.
- **Verification:** `rg -n "ci-security|pr-quality-gate" SECURITY.md`.

## P1-SEC-003 — Explicit PR dependency review gate

- **Status:** Remediated
- **Evidence:** Dependency review only executed inside reusable GA risk gate and not as a
  standalone PR workflow.
- **Remediation:** Add `.github/workflows/dependency-review.yml` for PR dependency review with
  high/critical enforcement.
- **Verification:** `test -f .github/workflows/dependency-review.yml`.
