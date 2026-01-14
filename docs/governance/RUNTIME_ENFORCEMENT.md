# Runtime Governance Enforcement

## Overview

Runtime Governance Enforcement ensures that the deployed environment matches the declared policy and state. This includes verifying tenant isolation, evidence integrity, and operational health.

## Evidence ID Consistency Gate

**Status:** Active (Strict Mode)

The "Evidence ID Consistency" gate ensures that all generated artifacts in the Evidence Bundle follow the canonical naming convention defined in the [Ops Evidence Retention Policy](OPS_EVIDENCE_RETENTION_POLICY.md).

### Enforcement Logic

1.  **Strict Naming:** All files in the evidence bundle must match the regex `^(ops|release)-evidence-[a-zA-Z0-9\-\.]+-[0-9]+\.tar\.gz$`.
2.  **Manifest Integrity:** The `manifest.json` must exactly match the artifacts on disk.
3.  **Determinism:** Manifest generation must be deterministic (sorted keys).

### Validation Schema

See [Evidence ID Schema](evidence_schema.json) for the formal definition.

### CI/CD Integration

This gate runs as part of the `ga-gate` workflow.
*   **Command:** `pnpm evidence:check --strict`
*   **Failure Behavior:** Fails the build if any non-compliant artifact is found.

## Tenant Isolation

(See `server/src/tenancy/TenantIsolationGuard.ts`)
