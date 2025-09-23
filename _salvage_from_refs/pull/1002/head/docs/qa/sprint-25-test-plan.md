# Sprint 25 Test Plan

## Components
- **Static Verifier:** unit tests for DP flags, k-anon, and function allowlist.
- **Dynamic Differencing Fuzz:** simulate neighbouring datasets and assert noise bounds.
- **SLSA‑3 Attestation:** ensure attest output is deterministic for identical bundles.
- **Dual Signature:** verify CompositeSigner produces EC and PQC signatures.
- **Listing Policy:** evaluate OPA policy `publisher.rego` for allow/deny paths.
- **DSAR Workflow:** integration test for `dsar_publishers.py` receipt generation.

## Test Types
- Jest unit tests for server modules and policy parsing.
- Script invocation tests using temporary directories.
- Manual UI verification for Publisher Studio wizard.

## Exit Criteria
- All new tests pass and coverage does not regress.
- Fuzzer detects intentional leakage during negative tests.
- Attestation and signatures remain reproducible across runs.
