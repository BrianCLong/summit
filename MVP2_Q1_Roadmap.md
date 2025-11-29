# 2026 Q1 MVP2 Execution Plan

## Strategic Pivot
- **Objective:** Expand GA Core into MVP2 with 10k-node scale, federated multi-tenant support, and enterprise connectors.
- **Pilot Goal:** Achieve 5 live customer pilots by March 31, 2026, guided by the North Star of converting GA Core into enterprise-ready deployments.

## Epics and Timelines (Jan 5–Mar 31)
| Epic | Scope | Timeline | Success Metric |
| ---- | ----- | -------- | -------------- |
| Federation | Deploy 10+ Summit instances with cross-graph search | Jan 5–31 | Query p95 < 500 ms |
| Enterprise Connectors | TAXII/STIX, ELK, Splunk, Palantir ingestion | Feb 1–28 | ≥95% ingest uptime |
| Multi-Tenant | OPA ABAC enforcement and tenant isolation | Mar 1–15 | Zero cross-tenant leaks |
| Scale | Neo4j Enterprise, sharding, and 10k+ nodes | Mar 16–31 | Sustain 1M edges/sec ingest |

## Immediate Week 1 Actions (Jan 5–11)
- Run first production deploy: `make deploy-prod`.
- Execute enterprise load test: `k6 run enterprise/load.js` targeting 10k concurrent users.
- Confirm observability: validate the **Summit Golden Path** Grafana dashboard (`localhost:3001/d/summit-ga-core`) is capturing key signals.

## Priority Issues (Backlog Alignment)
| Issue | Category | Acceptance Criteria |
| ----- | -------- | ------------------- |
| **0150** | LLM Ops | Drift detection and eval UI in place |
| **#10149** | Regression Matrix | 80% coverage gates enforced |
| **0145** | Onboarding | Golden path playbook executed in <30 minutes |
| **0141** | Docs | Auto-generated knowledge base available |
| **#714** | GA Core Plan | Epic completion dashboard published |

## Production OKRs (Q1)
- **OKR1:** 5 customer pilots live by Mar 31 (0/5 starting point).
- **OKR2:** Scale to 10k nodes and sustain 1M edges/sec ingest.
- **OKR3:** Security posture: zero P1 vulnerabilities with 100% audit coverage.
- **OKR4:** Adoption: Golden path <3 minutes end-to-end.

## Execution Cadence
- **Monday 9 AM:** Sprint planning and agent dispatch.
- **Wednesday 9 AM:** PR reviews and blocker resolution.
- **Friday 9 AM:** Demo, retro, and next-sprint planning.

## Agent Workflow
- Assign copilots to LLM and test tracks: `/assign-copilot #10150 #10149`.
- Open PRs directly from epic stories: `gh pr create --fill`.
- Maintain scoped CI hygiene with label triage; prioritize P0/P1 to control tech debt.

## Risks and Mitigations
- **Tech Debt (10k issues):** Use label triage bot; enforce P0/P1 gating.
- **Team Capacity:** Leverage multi-agent pipeline (Jules/Claude/Copilot) to sustain PR velocity.
- **Customer Pull:** Prioritize features driven by pilot needs to ensure adoption.
- **Security:** Apply OPA gates and schedule weekly pen tests.

## Dependencies and Sequencing Notes
- Federation foundations (query latency) must complete before multi-tenant isolation hardening.
- Enterprise connectors require stable ingest SLAs before regression matrix gates are raised.
- Scale work depends on Neo4j Enterprise readiness and sharding strategy; ensure benchmarks align with edge throughput targets.

## Success Criteria Checkpoints
- Week 1: Production deploy and load test executed; dashboard signals validated.
- End of January: Federation p95 under 500 ms with 10+ instances online.
- End of February: Connector ingest stability at or above 95% uptime with regression gates active.
- Mid-March: OPA ABAC isolation verified with zero cross-tenant leakage findings.
- End of March: 1M edges/sec ingest benchmark sustained; at least five pilots active.
