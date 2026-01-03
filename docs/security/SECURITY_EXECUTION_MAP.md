# Security Execution Map

This document maps security and control artifacts to their verification commands, evidence locations, and failure routing. It serves as the source of truth for the `security-exec-bridge` system.

## Governance

| Artifact | Verification Command | Evidence Location | Failure Routing |
| :--- | :--- | :--- | :--- |
| `docs/compliance/README.md` | `pnpm verify:governance` | `evidence/governance/` | Jules |
| `docs/governance/agent-change-policy.md` | `pnpm check:governance` | `evidence/governance/` | Jules |
| `docs/risk/RISK_LEDGER.md` | `pnpm pr:risk` (during PR) | `docs/risk/` | Jules |

## Compliance

| Artifact | Verification Command | Evidence Location | Failure Routing |
| :--- | :--- | :--- | :--- |
| `docs/compliance/SOC_MAPPING.md` | `pnpm verify:compliance` | `evidence/compliance/` | Jules |
| `docs/compliance/CONTROL_CROSSWALK.md` | `pnpm verify:compliance` | `evidence/compliance/` | Jules |
| `docs/compliance/CONTROL_REGISTRY.md` | `pnpm verify:compliance` | `evidence/compliance/` | Jules |

## Supply Chain Security

| Artifact | Verification Command | Evidence Location | Failure Routing |
| :--- | :--- | :--- | :--- |
| `docs/SUPPLY_CHAIN_SECURITY.md` | `pnpm generate:sbom` | `evidence/sbom/` | Jules |
| `docs/compliance/generate_provenance.ts` | `pnpm generate:provenance` | `evidence/provenance/` | Jules |
| `package.json` | `pnpm audit` | `evidence/audit/` | Jules |

## Policy & Access Control

| Artifact | Verification Command | Evidence Location | Failure Routing |
| :--- | :--- | :--- | :--- |
| `policy/` | `pnpm verify` | `evidence/policy/` | Jules |
| `docs/policy/abac-model.md` | `pnpm verify` | `evidence/policy/` | Jules |

## Operations & Incident Response

| Artifact | Verification Command | Evidence Location | Failure Routing |
| :--- | :--- | :--- | :--- |
| `docs/ops/INCIDENT_RESPONSE.md` | `pnpm verify:living-documents` | `evidence/ops/` | Jules |
| `docs/ops/dr-bcp-playbook.md` | `pnpm health` | `evidence/health/` | Jules |

## How to Extend

1.  **Add the Artifact**: Ensure the documentation or policy file exists in the repo.
2.  **Add Verification**: Create or identify a script that verifies the artifact (e.g., checks against code, runs a linter, verifies signatures).
3.  **Update this Map**: Add a row to the appropriate section above.
4.  **Ensure Determinism**: Verification scripts must output deterministic results for the same input state. Avoid timestamps in key output fields unless strictly necessary for audit trails (and separate them from content hashes).
