# Safe Local / Self-Hosted Model Execution (Summit Standard)

## Required Invariants
- **Deny-by-default egress**: No network access unless explicitly allowlisted.
- **Verified model digests**: All model weights must match a pinned SHA256 hash.
- **Least-privilege runtime**: Non-root user, read-only root filesystem, restricted capabilities.
- **Deterministic run receipt**: Immutable record of the execution environment and inputs.
- **Audit Logging**: Mandatory capture of stderr, resource usage, and egress attempts.

## Audit Mappings
- **SOC2 CC6.1/CC7.2**: Logical access, least privilege, and continuous monitoring of model execution.
- **ISO 27001 A.8.1/A.12.4**: Asset management and logging/monitoring.
- **SSDF/SLSA**: Pinned digests for weights and container images; provenance artifacts.

## Control Mapping

| ITEM Claim | Implementation | Verification |
| :--- | :--- | :--- |
| CLAIM-01 (Isolation) | Docker `--read-only`, `--user`, seccomp | `runtime/run_policy_check.mjs` |
| CLAIM-02 (Egress) | `--network none` or egress allowlist | `runtime/run_policy_check.mjs` |
| CLAIM-04 (Signed) | SHA256 Model Digest Allowlist | `policies/model-allowlist.json` |
| CLAIM-05 (Receipt) | `runtime/receipts/<id>.json` | `runtime/run.sh` |
| CLAIM-07 (Audit) | `runtime/audit/<id>.jsonl` | `runtime/run.sh` |

## Import/Export Matrix

### Inputs
- **Model Weights**: Local path (verified against digest).
- **Policy Files**: JSON files in `policies/`.
- **Data Mounts**: Explicit paths (subject to dangerous path scan).

### Outputs
- **Run Receipt**: `runtime/receipts/<run_id>.json` (Stable fields only).
- **Run Stamp**: `runtime/receipts/<run_id>.stamp.json` (Timestamps).
- **Audit Log**: `runtime/audit/<run_id>.jsonl` (Append-only).

## Non-Goals
- Automatic weight downloads from remote repositories (MWS).
- GPU-specific driver isolation (Layered later).
- Real-time secret scanning of model outputs (Use `redaction_scan.sh` post-run).
