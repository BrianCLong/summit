# DRIVE Q3–Q4

## Goals
- Deliver Core GA, Prov-Ledger Beta, Predictive Alpha, Connectors v1, Ops Hardening.

## Scope
- Platform, UI, Connectors, Ledger, Predictive, SRE squads.

## Milestones
### Immediate (next 72 hours)
- Stand up command cadence and risk burn-down.
- Cut skeleton epics and guards; freeze first decisions.
- Establish environment and telemetry baseline.
- Seed fixtures and golden tests.
- Implement prov-ledger verifier stub.

### Near term (Week 1–2)
- Platform/Graph: link, path, community, centrality ops with explainability, pattern miner stub, anomaly/risk scoring.
- Copilot: NL→Cypher/SQL preview, cost/row estimates, policy reasons, RAG citations.
- UI: tri-pane shell, synchronized brushing, command palette, undo/redo, accessibility checks.
- Security/Governance: ABAC policies, step-up auth, reason for access logging.
- Connectors: ship 3 connectors (STIX/TAXII, Slack, Jira) with manifests, mappings, rate-limit policies, sample data, golden tests.
- Ops: SLO dashboards, chaos drill plan, offline kit design.
- Predictive: forecast & counterfactual API, Helm chart, UI confidence bands.
- Ledger: evidence registration slice and manifest export passing verifier.

## Acceptance
- Definitions of Ready and Done for each epic with acceptance checklists.
- Branch protection, required checks and CODEOWNERS enabled.
- End-to-end flow import → tag evidence → export → verify succeeds.
