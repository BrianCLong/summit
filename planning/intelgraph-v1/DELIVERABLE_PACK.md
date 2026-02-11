# IntelGraph Deliverable Pack v1.0

## 1. Consolidated Cross-Epic Dependency Matrix
| Epic | Depends On | Rationale |
|---|---|---|
| Epic 2 (Data) | Epic 1 (Arch) | Arch defines the storage topology. |
| Epic 3 (Ingest) | Epic 2 (Data) | Schema must be defined before ingest. |
| Epic 4 (API) | Epic 2 (Data) | API requires schema for resolvers. |
| Epic 5 (AI) | Epic 2, 3 | AI needs data and ingest pipelines. |
| Epic 6 (UX) | Epic 4 (API) | UI depends on API gateway. |
| Epic 7 (Sec) | Epic 1 (Arch) | Security integrated into core arch. |
| Epic 8 (Obs) | All Epics | Monitoring covers all services. |
| Epic 9 (CI/CD) | Epic 1 (Arch) | Infrastructure follows arch patterns. |
| Epic 10 (Prov) | Epic 2, 3 | Provenance requires data/ingest hooks. |
| Epic 11 (Cost) | All Epics | Cost tracking for all resources. |

## 2. Multi-Epic Risk Consolidation Table
| Category | Primary Risk | Mitigation |
|---|---|---|
| Technical | Topology mismatch between SaaS and Air-Gapped. | Universal ADR and abstraction layer. |
| Operational | SLO breaches due to Neo4j/LLM latency. | Edge caching and aggressive circuit breakers. |
| Compliance | Tenant data leakage in shared graph. | OPA-enforced ABAC and field-level encryption. |
| Financial | LLM cost spiraling out of control. | Real-time metering and hard per-tenant caps. |

## 3. Global Acceptance Criteria Checklist
- [ ] 100% of P0 tasks completed across all 11 epics.
- [ ] Unit test coverage >= 85% globally.
- [ ] Zero critical or high security vulnerabilities in SBOM.
- [ ] All mTLS and OIDC/JWT auth checks passing.
- [ ] p95 Latency < 200ms for core API paths.
- [ ] Provenance chain intact for 100% of ingested data.

## 4. Release Readiness Gate Checklist
- [ ] ADRs signed off by Architecture Agent.
- [ ] Load tests verified at 2x peak capacity.
- [ ] Disaster Recovery (DR) drill completed and signed off.
- [ ] SOC2/Compliance alignment audit passed.
- [ ] Evidence bundle generated and cryptographically signed.

## 5. SLO Compliance Validation Plan
- **Metric**: Availability (99.9%) -> Verified via Synthetic probes.
- **Metric**: Latency (p95 < 200ms) -> Verified via OTel traces.
- **Metric**: Error Rate (< 0.1%) -> Verified via Prometheus alerts.
- **Metric**: Cost (< $50/tenant) -> Verified via FinOps metering.

## 6. Budget Impact Summary
- **Infra (EKS/RDS)**: $2,500/month baseline.
- **LLM Usage**: $5,000/month (estimated).
- **Monitoring/Ops**: $1,000/month.
- **Total Est. OpEx**: $8,500/month for initial 10 tenants.

## 7. Evidence Bundle Specification
- **Format**: Signed JSON/JSONL.
- **Fields**: Timestamp, Evidence ID, Originating Agent, SHA-256 Hash, Policy Verdict.
- **Storage**: Immutable WORM storage (S3 Object Lock).
- **Verification**: `summit-verify-evidence` CLI utility.
