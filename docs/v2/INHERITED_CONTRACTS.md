# Inherited Contracts (V2 Freeze Line)

The following documents and artifacts represent the **V1 Guarantee**. They are considered **Immutable** for the purposes of V2 development unless explicitly modified through a **Class C (Contract-Affecting)** change process.

## 1. Governance & Compliance

*   **Governance Framework:** `docs/GOVERNANCE.md`
    *   *Constraint:* The Policy-as-Code structure (OPA, Schemas) must remain the primary enforcement mechanism.
*   **Provenance Schema:** `docs/PROVENANCE_SCHEMA.md` (or equivalent in `schemas/`)
    *   *Constraint:* All mutations must generate provenance events compatible with the V1 schema.

## 2. Security & Trust

*   **Security Policy:** `SECURITY.md`
    *   *Constraint:* Supply chain security (SBOM, Signing) and vulnerability management SLAs cannot be relaxed.
*   **Authorization Policy:** `policy/summit/access` (OPA)
    *   *Constraint:* Access control logic must default to "Deny".

## 3. Architecture & Operations

*   **Traceability:** `TRACEABILITY.md` (if exists) / `docs/v2/CHARTER.md` section 3.
    *   *Constraint:* Requirements to Code traceability must be maintained.
*   **Operational SLOs:** Existing `slo-config.yaml` or equivalent.
    *   *Constraint:* V2 features must not degrade V1 performance below established baselines.

## 4. Machine-Readable Allowlist

For automated verification, the following file patterns are "Frozen":

```yaml
frozen_paths:
  - "docs/GOVERNANCE.md"
  - "SECURITY.md"
  - "schemas/provenance-event.schema.json"
  - "policy/summit/deploy/"
  - "policy/summit/access/"
```
