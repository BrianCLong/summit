# Adaptive Tradecraft Graph (ATG) Standards Mapping

## Readiness & Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance anchors: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`

## Import Matrix

| Source | Input Type | Mapping | ESG Result |
| --- | --- | --- | --- |
| Summit KG entities/edges | Core graph | Map to ESG nodes/edges with weights and evidence IDs | ESG overlay nodes/edges |
| SaaS audit events | TECF normalized stream | Event → edge updates + time windows | `DataFlowEdge`, `CommsEdge`, `AccessEdge` |
| Identity exposure / breach intel | Exposure feed | Exposure → `ExposureEdge` + `CredentialRiskNode` | Exposure & risk surfaces |
| Optional HR abstractions | Policy-capsuled inputs | Abstracted attributes → `HumanContextNode` | Privacy-capsuled nodes |

## Export Matrix

| Output | Consumer | Purpose |
| --- | --- | --- |
| `equilibrium.state.json` | API + UI | Visualize stable campaign clusters + convergence stats |
| `mitigation.bundles.json` | Tickets/Webhooks | Defensive controls + ERI deltas |
| `narratives.md` / `campaigns.json` | SIEM enrichment | Evidence-bound narrative context (defensive only) |

## Non-Goals (v1)

- No active exploitation or offensive playbooks.
- No SOAR execution beyond tickets/hooks.
- No OT/ICS workflows in v1.

