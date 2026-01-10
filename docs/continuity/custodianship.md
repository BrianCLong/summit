# Custodianship Register

Institutional memory requires owned accountability. The Custodianship Register defines who safeguards each invariant and how succession is handled.

## Roles

- **Purpose Custodian:** Owns the Purpose Lock, red-lines, and amendment process.
- **Policy Custodian:** Owns Rego policy bundles, drift monitoring, and enforcement pathways.
- **Evidence Custodian:** Owns provenance ledger integrity, signing, and audit traceability.
- **Identity Custodian:** Owns RBAC/ABAC mappings, authority transitions, and access hygiene.

## Register Fields

- Custodian name and contact
- Invariant scope (purpose, policy, evidence, identity)
- Authority basis (governance decision ID)
- Delegates and backups
- Review cadence
- Last reaffirmation date and evidence links

## Operating Cadence

- **Quarterly reaffirmation:** Custodians attest to invariants, review waivers, and document drift findings.
- **Succession drill:** Annually exercise a mock handoff including credential rotation, policy hash validation, and audit logging.
- **Crisis protocol:** If a custodian becomes unavailable, the governance chair designates an interim custodian with dual-control limits until formal appointment.

## Evidence & Logging

- Store signed register entries in the provenance ledger and `artifacts/agent-runs/` with checksum references.
- Attach register updates to governance meeting minutes and incident reviews when relevant.

## Integration Points

- Authority Transition Protocol relies on the register to identify outgoing and incoming custodians.
- Drift Sentinel reports list custodian owners for each invariant to speed mitigation.
- Merger Safety Checklist requires confirmation that custodians remain empowered post-transaction.
