# Regulatory Regime Selection

This sprint focuses on delivering executable compliance packs for two priority regimes with high customer demand and alignment to existing controls.

## In Scope

1. **SOC 2 Type II (US)**
   - Trust Services Criteria: Security (Common Criteria), Availability, Confidentiality.
   - Evidence baseline: existing control inventory in `COMPLIANCE_CONTROLS.md`, SOC mapping in `COMPLIANCE_SOC_MAPPING.md`, and immutable audit/provenance artifacts.
   - Objective: enable regulated US deployments with auditable control-to-evidence links.

2. **ISO/IEC 27001:2022**
   - Focus areas: Annex A controls for access management, operations security, logging and monitoring, change management, and supplier relationships.
   - Evidence baseline: platform governance controls, CI/CD guardrails, and provenance ledger outputs.
   - Objective: provide a harmonized pack that can be reused for EU/UK customers without code forks.

## Out of Scope (for this sprint)

- Formal GDPR/AI Act certification claims (will rely on shared ISO/SOC controls for foundational privacy-by-design coverage).
- Region-specific forks or bespoke compliance logic; all differences must be configuration-driven via profiles.
- Physical data center controls (covered by cloud providers) and customer-managed infrastructure responsibilities.
- Legal advice or attestation letters; we provide evidence and mappings only.
