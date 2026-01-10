# Security Remediation Ledger

Last updated: 2026-01-09

This ledger tracks actionable security findings and remediation evidence for Summit.

## Dependency vulnerabilities

| Finding ID              | Location  | Severity | Fix plan                                                                      | Verification                                  | Status   |
| ----------------------- | --------- | -------- | ----------------------------------------------------------------------------- | --------------------------------------------- | -------- |
| DEP-AUDIT-403           | repo-wide | Unknown  | Re-run audit when registry access permits; capture output for review          | `pnpm audit --audit-level=low`                | DEFERRED |
| DEP-AUDIT-R-UNSUPPORTED | repo-wide | Unknown  | Use supported pnpm audit invocation or upgrade pnpm to enable recursive audit | `pnpm -r audit --audit-level=low`             | DEFERRED |
| DEP-INVENTORY-OOM       | repo-wide | Unknown  | Re-run dependency inventory with larger Node heap or reduced depth            | `pnpm -r list --depth 99 >/tmp/pnpm-deps.txt` | DEFERRED |

## Static analysis / code scanning

| Finding ID     | Location             | Severity | Fix plan                                                                                                                                         | Verification               | Status   |
| -------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | -------- |
| SAST-LINT-FAIL | apps/command-console | Info     | Align ESLint target globs to repository layout or adjust lint script to target files                                                             | `pnpm -r lint`             | DEFERRED |
| SAST-TEST-FAIL | server               | Info     | Resolve failing unit tests (ThreatHuntingOrchestrator logger setup, guardrails app logger, postgres pool env setup, semantic RAG perf threshold) | `pnpm -C server test:unit` | DEFERRED |

## Secrets hygiene

| Finding ID               | Location                            | Severity | Fix plan                                                                                                                          | Verification               | Status    |
| ------------------------ | ----------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------- | ---------------------------------------------------- | ------------------ | ------------- | ------- | ------ | ----------------- | -------- |
| SECRET-EXAMPLE-RESPONSE  | server/src/routes/data-residency.ts | Low      | Replace example credentials with env-placeholder strings to avoid token patterns                                                  | `rg -n "AKIA[0-9A-Z]{16}\\ | ghp\_\\   | xox[baprs]-" -S server/src/routes/data-residency.ts` | FIXED              |
| SECRET-FIXTURES-GOVERNED | repo-wide                           | Low      | Governed Exception: sample tokens/public keys in docs/tests/fixtures; maintain as synthetic data unless policy mandates redaction | `rg -n "BEGIN (RSA\\       | OPENSSH\\ | EC) PRIVATE KEY\\                                    | AKIA[0-9A-Z]{16}\\ | xox[baprs]-\\ | ghp\_\\ | AIza\\ | -----BEGIN" -S .` | DEFERRED |

## Supply chain / provenance / SBOM

| Finding ID            | Location                 | Severity | Fix plan                                                          | Verification   | Status |
| --------------------- | ------------------------ | -------- | ----------------------------------------------------------------- | -------------- | ------ | ----------- | ------ | ------------ | ------------- | -------------------------------- | ----- |
| SUPPLY-CHAIN-BASELINE | .github/workflows + docs | Info     | No changes required; SBOM/SLSA/cosign controls already referenced | `rg -n "SBOM\\ | syft\\ | cyclonedx\\ | slsa\\ | provenance\\ | attestation\\ | cosign" -S .github scripts docs` | FIXED |

## Deferred / blocked

| Finding ID              | Location  | Severity | Reason                                                | Next action                                                | Status   |
| ----------------------- | --------- | -------- | ----------------------------------------------------- | ---------------------------------------------------------- | -------- |
| DEP-AUDIT-403           | repo-wide | Unknown  | `pnpm audit` blocked by registry 403 response         | Allowlist audit endpoint or run in network-permitted CI    | DEFERRED |
| DEP-AUDIT-R-UNSUPPORTED | repo-wide | Unknown  | `pnpm -r audit` not supported by current pnpm version | Align CI/local pnpm versions or use workspace audit script | DEFERRED |
| DEP-INVENTORY-OOM       | repo-wide | Unknown  | `pnpm -r list --depth 99` exhausted Node heap         | Re-run with increased heap or reduced depth                | DEFERRED |
