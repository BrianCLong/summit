# Copilot Espionage Sentinel (CES) / Executive Comms Equilibrium (ECE)

This directory hosts the foundation scaffolding for the CES/ECE program. CES models
AI-mediated communications as pseudo-identities, while ECE simulates minimal control
sets to preserve productivity while reducing espionage risk.

## Kill-switch flags

All CES/ECE runtime paths must honor the following flags (default: disabled):

- `CES_ENABLED`
- `ECE_ENABLED`
- `CES_RAW_CONTENT_ENABLED`
- `CES_ENFORCEMENT_ENABLED`
- `CES_EXPORTS_ENABLED`

## Governance posture

- Raw content ingest is disabled by default.
- Enforcement and exports are disabled by default.
- Evidence artifacts are required for privacy and canonical-format gates.

## MAESTRO security alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, tool abuse, cross-tenant leakage, goal manipulation.
- **Mitigations:** deny-by-default flags, tenant scoping, evidence gates, and narrative grounding checks.
