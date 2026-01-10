# Security Remediation Ledger

Status values: `OPEN | FIXED | DEFERRED`.

## SEC-LEDGER-0001

- **Severity:** Low
- **Location:** docs/security/SECURITY_REMEDIATION_LEDGER.md
- **Fix Plan:** Create remediation ledger and track findings per GA gate.
- **Verification Command:** `test -f docs/security/SECURITY_REMEDIATION_LEDGER.md`
- **Status:** FIXED

## SEC-SECRETS-0001

- **Severity:** Medium
- **Location:** server/src/routes/data-residency.ts
- **Fix Plan:** Replace example AWS credential strings with non-secret placeholders to avoid secret-pattern matches in runtime responses.
- **Verification Command:** `rg -n "accessKey: '<aws-access-key-id>'" server/src/routes/data-residency.ts`
- **Status:** FIXED

## SEC-SECRETS-0002

- **Severity:** Medium
- **Location:** Repo-wide examples and test fixtures
- **Fix Plan:** Review remaining secret-pattern matches from the secret hygiene scan; classify governed exceptions, redact docs where feasible, and update allowlists if needed.
- **Verification Command:** `rg -n "BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|AKIA[0-9A-Z]{16}|xox[baprs]-|ghp_|AIza|-----BEGIN" -S .`
- **Status:** DEFERRED

## SEC-DEPS-0001

- **Severity:** Medium
- **Location:** Monorepo dependencies
- **Fix Plan:** Run pnpm workspace install and audit with network access, then record findings and fixes.
- **Verification Command:** `pnpm -r install && pnpm -r audit --audit-level=low`
- **Status:** DEFERRED

## SEC-SAST-0001

- **Severity:** Medium
- **Location:** Monorepo linters/tests
- **Fix Plan:** Run workspace lint/test sweeps to confirm no security regressions.
- **Verification Command:** `pnpm -r lint && pnpm -r test`
- **Status:** DEFERRED
