# DFARS 252.204-7012 Mapping

This mapping aligns incident reporting, preservation, and CUI handling requirements with IntelGraph evidence artifacts and policy checks.

## Clause-to-System Mapping

| Requirement                 | System Capability                                     | Evidence Artifacts                                 | Policy-as-Code Gate                              | Owner      |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ | ---------- |
| Safeguard CDI/CUI           | Scope tokens enforce classification and release scope | Scope token issuance logs, policy decisions        | `intelgraph.policy.contracting` scope validation | Security   |
| Cyber incident reporting    | Incident packet with timeline and asset impact        | Incident packet, reporting checklist, replay token | `intelgraph.policy.contracting` incident rules   | IR         |
| Preservation actions        | Forensic artifact hashing and chain                   | Preservation ledger, artifact hashes               | `intelgraph.policy.contracting` incident rules   | IR         |
| Access certificate metadata | Reporting checklist includes certificate requirement  | Incident binder appendix                           | `intelgraph.policy.contracting` incident rules   | Compliance |

## Required Evidence Bundle

- Incident packet JSON (timeline, assets, CUI impact)
- Preservation chain manifest + hashes
- Transparency log digest entry
- Reporting checklist with DFARS clause mapping

## Operational Controls

- Incident packet generation requires scope token and attestation.
- Preservation chain must be completed before report export.
- Reporting window defaults to 72 hours and is enforced by policy.
