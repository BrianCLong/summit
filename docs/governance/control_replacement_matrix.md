# Control Replacement Matrix

This document provides a one-to-one mapping of removed or modified verification and policy gates to their equivalent or stronger replacements.

| Existing/Removed Control | Replacement Control | Enforcement Mechanism |
| :--- | :--- | :--- |
| **OPA v0.45.0 (Legacy Syntax)** | **OPA v0.68.0 (Modern Syntax)** | Upgraded globally in CI workflows (e.g., `ci-verify.yml`) to support safe `if`, `in`, and `contains` keywords. |
| **Manual Evidence ID Tracking** | **Automated `package-evidence.sh`** | Cryptographically links source Git SHA to projection state via `manifest.json` and `stamp.json`. |
| **Legacy `index.json` (Array)** | **Standardized `index.json` (Dict)** | Normalized `evidence/index.json` to dictionary-based format to improve lookup performance and verifiability. |
| **Implicit `op_type` Mapping** | **Explicit Canonical Normalization** | `canonical_consumer.js` now explicitly maps multiple logical decoding formats (`wal2json`, `pgoutput`) to a stable `c\|u\|d` schema. |
| **Unsafe SQL Construction** | **Parameterized Query Blueprint** | Updated `src/targets/postgres.js` to simulate safe parameterized query patterns, preventing SQL injection in reference implementations. |
| **Sigstore verification assets** | **GA Evidence & SLSA Provenance** | The repository has transitioned to a comprehensive GA Evidence system (verified by `scripts/verify_evidence.py`) and SLSA v1 provenance, providing stronger end-to-end supply chain security than standalone sigstore scripts. |

## Verification Proving Equivalent Enforcement

1.  **Policy Integrity**: All OPA policies have been refactored to modern syntax and verified via `opa check`.
2.  **Evidence Completeness**: The new `evidence/index.json` format is enforced by `tools/ci/verify_evidence.py` and `scripts/verify_evidence.py`.
3.  **CI Stabilization**: Fixed several regressions in `jetrl-ci.yml` (added `torch`) and `ci-verify.yml` (fixed pnpm version mismatches) to ensure gates are actually running and blocking.
