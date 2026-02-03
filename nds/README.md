# Narrative Dominance Suite (NDS)

NDS is a governed, evidence-first subsystem for narrative intelligence inside Summit. It is designed
for defensive monitoring, forecasting, and resilience planning with deny-by-default governance.
All execution remains gated by policy and audit logging.

## Authority & Alignment

- Readiness baseline: `docs/SUMMIT_READINESS_ASSERTION.md`.
- Governance sources: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`,
  and `docs/governance/AGENT_MANDATES.md`.
- Compliance: `agent-contract.json` and the Golden Path guardrails in `docs/ga/`.

## Feature Flags (Kill Switches)

Defaults are **OFF** by design.

- `NDS_ENABLED=false`
- `NDS_AGENTS_ENABLED=false`
- `NDS_SIM_ENABLED=false`

Flags live in `nds/config/flags.yaml` and are mirrored for compile-time usage in
`nds/src/index.ts`.

## Glossary (Canonical Terms)

- **NarrativeCluster**: A time-evolving cluster of narrative content with a lifecycle state.
- **LifecycleState**: The state of a NarrativeCluster (seed, propagate, peak, mutate, decline).
- **TransitionEvent**: A deterministic transition record for a NarrativeCluster.
- **PolicyDecisionRecord**: A policy evaluation output that authorizes or denies an action.
- **EvidenceBundle**: Immutable evidence artifacts with stamp-only timestamps.
- **AuditRecord**: Append-only, tamper-evident log record for governance decisions.

## Governance Posture (Deny by Default)

- No targeting of protected classes.
- No deception or automated influence execution.
- Allowed actions default to monitor/export/report modes.

## MAESTRO Alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.

**Threats Considered:** policy bypass, audit tampering, unauthorized execution, evidence
contamination.

**Mitigations:** deny-by-default flags, append-only audit trails, evidence bundles with deterministic
timestamps, policy-gated actions.
