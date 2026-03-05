# Influence Ops Threat Model

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.

## Threats Considered

- Collection abuse or ToS violations.
- Analyst overconfidence in attribution.
- Privacy violations from entity resolution.
- Model supply-chain poisoning.
- Cross-tenant data leakage.
- Prompt injection or tool abuse within orchestration.

## Mitigations

- Policy-as-code gates for collection, attribution, and identity resolution.
- Provenance stamps on every edge and derived claim.
- HITL approvals required for attribution and identity resolution exports.
- Signed artifacts (playbooks, rules, models) with SBOM tracking.
- Deterministic evidence bundles per job; replay required in CI.
- Tenant isolation enforced across storage, compute, and cache layers.
- Observability hooks for anomaly detection on coordination and export events.

## Residual Risk

- API-less collection remains blocked unless explicitly approved by legal and DPIA processes.
- Entity resolution precision drift is monitored; exports are gated when drift thresholds exceed
  policy caps.

## Go/No-Go Criteria

- Determinism replay must be hash-identical.
- Privacy lints must pass with safe defaults.
- Policy enforcement must block unreviewed attribution exports.
- Tenant isolation suite must pass including negative tests.
