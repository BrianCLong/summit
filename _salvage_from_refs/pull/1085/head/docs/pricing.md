# Pricing & Packages (Draft)

This draft outlines SKUs, unit economics, and feature gates to support margins and clear positioning. Targets: ≥35% blended margin at WAU=40 tenants.

## Packages

- Team
  - Users: up to 25
  - Features: core routing, dashboards, bronze/silver QoS, basic audit (30d)
  - Security: shared keys, no BYOK
  - Support: community + next-business-day

- Business
  - Users: up to 250
  - Features: all Team + policy versioning, signed runbooks, silver/gold QoS
  - Security: CMEK (AWS/Azure), PHI/PII masking, export controls
  - Support: 8x5, 99.9% uptime SLA

- Enterprise
  - Users: unlimited
  - Features: all Business + HSM path, lineage export, tenant isolation options
  - Security: BYOK/HSM, air-gapped ingest option, advanced approvals
  - Support: 24x7, 99.95% uptime SLA, TAM

## Unit Economics (illustrative)

- Per task: $X.XXXX base + model passthrough + overhead (target ≤ $0.02 graph_ops, ≤ $0.05 rag_retrieval, ≤ $0.08 osint_analysis)
- Per minute (compute-bound): $Y.YY
- Data egress: $Z.ZZ / GB
- Storage: $S.SS / GB-month (audit evidence, logs)

Assumptions and cost model belong in a spreadsheet; see `project_management/pricing-model.xlsx` (to be added) for levers and margin checks.

## Feature Gates

- BYOK/CMEK/HSM: Business+ (CMEK), Enterprise (HSM)
- QoS lanes: bronze (Team), silver (Business), gold (Enterprise)
- Compliance: DSAR/RTBF workflows (Business+), attestation logs 1y (Enterprise)
- Export controls: allowed domains/IPs, throttles (Business+)

## Acceptance Criteria

- 2–3 repeatable differentiators are clear on the pricing page
- Unit economics model shows ≥35% blended margin at WAU=40 tenants
- Feature gates align with vertical playbooks (FinServ/Gov, Healthcare)

