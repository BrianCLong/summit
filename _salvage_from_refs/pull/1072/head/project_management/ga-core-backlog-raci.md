# GA Core Backlog & RACI

This document captures the minimal strike list for shipping the GA Core slice, broken down into an executable backlog and a one‑page RACI.

## Backlog

### 1. GA Core Slice
- **Epic:** Minimal ingest → graph core → analytics → Copilot → governance
  - **Story:** Implement ingest pipeline skeleton  
    - *Acceptance:* Can ingest sample docs via CLI; ingesting 10k docs ≤5 min.
  - **Story:** Stand up graph core with analytics hooks  
    - *Acceptance:* p95 query time <1.5 s on benchmark neighborhood.
  - **Story:** Enable Copilot scaffolding with “explain this view”  
    - *Acceptance:* Copilot can cite source nodes/edges for each suggestion.
  - **Story:** Add baseline governance (policy enforcement & audit trail)  
    - *Acceptance:* Policy denials return reason; immutable audit log created.

### 2. Tri‑Pane UI Baseline
- **Epic:** Timeline + Map + Graph shell
  - **Story:** Render tri‑pane layout with sample data  
    - *Acceptance:* All panes sync on entity selection.
  - **Story:** Add “Explain this view” button  
    - *Acceptance:* Clicking shows provenance entries for current pane.

### 3. AuthZ, SSO & Audit
- **Epic:** ABAC/RBAC via OPA; OIDC/JWKS SSO; step‑up auth
  - **Story:** Integrate OPA for policy checks  
    - *Acceptance:* All API calls evaluated through OPA.
  - **Story:** Add OIDC login w/ JWKS key rotation  
    - *Acceptance:* Successful login w/ Google & Keycloak.
  - **Story:** Implement step‑up auth + reason‑for‑access prompt  
    - *Acceptance:* Sensitive queries require MFA and capture justification.
  - **Story:** Immutable audit log for all privileged actions  
    - *Acceptance:* Audit entries cannot be altered; queryable by admin.

### 4. Trusted Data Intake
- **Epic:** First 10+ connectors & wizard
  - **Story:** Ship four OSINT/CTI connectors w/ manifest, mapping & golden IO tests  
    - *Acceptance:* Each connector passes golden IO tests in CI.
  - **Story:** Ingest Wizard MVP (file drop + schema inference)  
    - *Acceptance:* Users can upload CSV/JSON and map fields via UI.
  - **Story:** Streaming ETL enrichers (PII classifier, AI schema mapper, GeoIP/OCR/EXIF scrub)  
    - *Acceptance:* Enrichers run inline and surface confidence scores.

### 5. Identity & Truth Layer v1
- **Epic:** Entity Resolution v1 + Provenance/Claim Ledger
  - **Story:** ER service with explainable scorecards & reversible merges  
    - *Acceptance:* ≥100 merges/s; each merge shows scored attributes and undo option.
  - **Story:** Beta Provenance/Claim Ledger with verifiable export bundles  
    - *Acceptance:* Exports contain proof bundle validating lineage.

### 6. Copilot with Citations
- **Epic:** NL → Cypher, case‑aware RAG, narrative builder, guardrails
  - **Story:** NL→Cypher sandbox  
    - *Acceptance:* Users can preview generated Cypher before execution.
  - **Story:** Case‑aware RAG with inline citations  
    - *Acceptance:* All answers display source doc IDs/links.
  - **Story:** Narrative builder for reports  
    - *Acceptance:* Generated narrative retains citations.
  - **Story:** Enforcement of guardrails (no PII exfil, policy checks)  
    - *Acceptance:* Violating prompts return blocked response with rationale.

### 7. Ops, Cost & Resilience
- **Epic:** SLO dashboards, cost guardrails, chaos drills, offline kit
  - **Story:** Implement SLO dashboards (latency, ingest throughput)  
    - *Acceptance:* Dashboards show live metrics and alert on violations.
  - **Story:** Cost guardrails (per‑tenant budgets, alerting)  
    - *Acceptance:* Over‑budget queries blocked with warning.
  - **Story:** Chaos drills automation  
    - *Acceptance:* Monthly chaos run produces recovery report.
  - **Story:** Offline kit v1 (subset of features runnable disconnected)  
    - *Acceptance:* Kit deploys on laptop and handles local ingest/query.

### 8. Predictive Suite (Behind Flag)
- **Epic:** Timeline stub + counterfactuals alpha
  - **Story:** Enable feature flag for Predictive Suite  
    - *Acceptance:* Only flagged users see predictive timeline.
  - **Story:** Counterfactual query prototype  
    - *Acceptance:* User can run “what‑if” on a sample dataset.

### 9. Performance & Acceptance Targets
- **Epic:** Benchmarks & acceptance patterns
  - **Story:** Graph query benchmark harness  
    - *Acceptance:* CI fails if p95 ≥1.5 s.
  - **Story:** ER performance bench  
    - *Acceptance:* Test proves ≥100 merges/s.
  - **Story:** Policy denial tests with reason messages  
    - *Acceptance:* Negative tests confirm default‑deny + reason string.
  - **Story:** Export provenance verification test  
    - *Acceptance:* Sample export validates against ledger hash.

## RACI (One‑Pager)

| Capability / Deliverable                            | R (Responsible)      | A (Accountable) | C (Consulted)             | I (Informed)             |
|-----------------------------------------------------|----------------------|-----------------|---------------------------|--------------------------|
| Ingest pipeline & connectors                        | Data Eng Lead        | Platform PM     | Security, Infra           | Support, Sales           |
| Graph core & analytics services                     | Graph Eng Lead       | CTO             | Data Science, Infra       | Product, Support         |
| Tri‑pane UI & Copilot shell                         | Frontend Lead        | Product Design  | Graph Eng, UX Research    | Sales, Support           |
| AuthZ/SSO/Audit stack                               | Security Eng Lead    | CISO            | Platform PM, Infra        | All teams                |
| Entity Resolution & Provenance ledger               | Data Science Lead    | CTO             | Backend Eng, Legal        | Product, Support         |
| Copilot NL→Cypher & narrative builder               | AI/ML Lead           | CTO             | Product Design, Security  | Support, Sales           |
| SLO dashboards & cost guardrails                    | DevOps Lead          | CTO             | Finance, Product          | All teams                |
| Chaos drills & offline kit                          | Infra Lead           | DevOps Lead     | Security, Product         | All teams                |
| Predictive Suite alpha                              | AI/ML Lead           | CTO             | Product, Data Science     | Support, Sales           |
| Performance benchmarks & acceptance tests           | QA Lead              | Platform PM     | Eng Leads, DevOps         | All teams                |

