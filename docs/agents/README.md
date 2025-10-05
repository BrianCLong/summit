IntelGraph Agents (Safe, Defensive Scope)

This directory documents the seven defensive agents and how they integrate with Summit/IntelGraph.

- Singlaub: Field Resilience & Continuity (degraded comms, lawful logistics)
- LeMay: Strategic Overwatch & Crisis Response (escalation, rollback, comms)
- Angleton: Counter‑Deception & Data Integrity (trust scores, quarantine)
- Budanov: Adversary Mapping (OSINT/legal, ambiguity tracking)
- Wolf: Long‑Term Risk Insight (drift/novelty, stakeholder signals)
- Harel: Threat Network Disruption (protective ops, case bundles)
- Gehlen: Telemetry & Peer Capability Analysis (comparative insights)

Guardrails
- Anonymization + retention (OPA policy pack v0)
- Zero‑trust access (ABAC, SCIM+OIDC)
- Provenance bundles per decision; signatures verified
- Cost/SLO gates in rollouts; auto‑pause on breach

Feature Flags
- Enable/disable per agent via env: FEATURE_AGENT_{NAME}=true|false
  - Example: FEATURE_AGENT_ANGLETON=false

Metrics/Dashboards
- Prometheus: intelgraph_trust_score, intelgraph_risk_signals_total
- Grafana: server/grafana/trust-risk-overview.json

Runbooks
- See server/runbooks/agents for operational steps and escalation paths.

Master Prompts
- [Link Analysis Canvas Orchestrator](./link-analysis-canvas-master-prompt.md) — coordinates the tri-pane workspace, telemetry, and policy guardrails for investigative workflows.

