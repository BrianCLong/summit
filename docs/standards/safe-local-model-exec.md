# Standard: Safe Local Model Execution

## Overview
This standard defines the security requirements and operational procedures for running AI models locally or in self-hosted environments within the Summit ecosystem.

## Core Requirements (ITEM:CLAIM-01 to ITEM:CLAIM-10)

1. **Isolation (ITEM:CLAIM-01)**
   - Models must run in dedicated containers or VMs.
   - Use non-root users (`UID/GID 10001:10001`).
   - Root filesystem must be read-only.
   - Seccomp/AppArmor profiles must be enforced.
   - Resource limits (CPU/RAM/PIDs) must be applied.

2. **Egress Control (ITEM:CLAIM-02)**
   - Default deny-all egress.
   - Explicit allowlist required for any external connections.
   - Offline inference is preferred.

3. **Secrets Hygiene (ITEM:CLAIM-03)**
   - Never bake secrets into images.
   - Use ephemeral credentials mounted as read-only volumes.
   - Disable core dumps.

4. **Weight Integrity (ITEM:CLAIM-04)**
   - All model weights must have a verified SHA256 digest.
   - Weights must be allowlisted in `.github/policies/model-sandbox/model-allowlist.yml`.

5. **Deterministic Receipts (ITEM:CLAIM-05)**
   - Every run must produce a `run.json` receipt.
   - Receipts must be deterministic (no timestamps inside).
   - Temporal metadata must reside in `stamp.json`.

6. **Data Boundaries (ITEM:CLAIM-06)**
   - Data must be classified (`public`, `internal`, `restricted`).
   - Restricted data is blocked by default from standard sandboxes.

7. **Audit & Telemetry (ITEM:CLAIM-07)**
   - Capture stdout/stderr to immutable logs.
   - Log all egress attempts.
   - Redact secrets from all outputs.

## Compliance
Failure to adhere to this standard will block execution via the `model-sandbox` runner and fail CI gates.

## Evidence Summary
- Runner enforcement logic verified via `pnpm model:sandbox:run --dry-run`.
- Policy checker validated against positive/negative fixtures in `tools/model-sandbox/fixtures/`.
- CI guardrails implemented in `.github/workflows/model-sandbox-guardrails.yml`.

## Assumption Ledger
- Docker is the primary container runtime for development.
- `js-yaml` is available for Node.js scripts.

## Success Criteria
- [x] Weight SHA256 pinning enforced.
- [x] Non-root + read-only rootfs enforced.
- [x] Egress deny-by-default enforced.
- [x] Deterministic run receipts produced.

## Diff Budget
- New directory: `.github/policies/model-sandbox/`
- New directory: `.github/scripts/model-sandbox/`
- New directory: `tools/model-sandbox/`
- Documentation: `docs/standards/`, `docs/security/`, `docs/ops/` updates.
- CI: `.github/workflows/model-sandbox-*`
