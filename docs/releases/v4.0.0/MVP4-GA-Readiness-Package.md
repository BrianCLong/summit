# MVP-4-GA Readiness Package: "Ironclad Standard"

**Project:** Summit / IntelGraph (CompanyOS)
**Version:** v4.0.0
**Target GA:** October 2025
**Captain:** Jules
**Status:** DRAFT

---

## 1. Executive Summary

MVP-4-GA, codenamed **"Ironclad Standard"**, marks the transition of Summit from a "feature-complete MVP" (v3) to a **production-hardened Enterprise Platform**. While v3 demonstrated functional capabilities, v4 guarantees **operational determinism** and **audit-proof trust**.

**Strategic Objectives:**
1.  **Zero-Trust by Default:** Eliminate "happy path" assumptions. Every mutation requires a policy verdict; every artifact requires a provenance chain.
2.  **Immutable Audit:** Cryptographic chain of custody for all data and code changes.
3.  **Operational Resilience:** Enforced error budgets, circuit breakers, and deterministic failure modes.

**Verdict:** The system is currently **YELLOW** for GA. Critical paths in API determinism and Secrets Management must be resolved before the "Ironclad" seal can be applied.

---

## 2. Executive GA Go/No-Go Scorecard

| Criteria Area | Status | Owner | Blockers / Notes |
| :--- | :---: | :--- | :--- |
| **API Determinism** | 🔴 **RED** | Backend Lead | Global Error Handler missing. Unhandled 500s observed on malformed input. Must return typed GraphQLErrors. |
| **Policy Coverage** | 🟡 **YELLOW** | Security Lead | ~85% Mutation coverage. Missing `authz.ensure` on 8 admin resolvers. |
| **Strict Typing** | 🟡 **YELLOW** | Backend Lead | `tsconfig` strict mode enabled, but `any` usage persists in legacy connectors. |
| **Secrets Mgmt** | 🔴 **RED** | Ops Lead | Secret rotation capability not verified. Gitleaks check needed in CI. |
| **CI/CD Gates** | 🟢 **GREEN** | Release Capt | Promotion gates active. Flaky tests isolated to "Quarantine". |
| **Evidence/SBOM** | 🟢 **GREEN** | Compliance | SBOM generation and Cosign signing active for all release artifacts. |
| **Observability** | 🟢 **GREEN** | SRE Lead | SLO dashboards live. Error budget policies defined. |

**Rollback Authority:**
*   **Trigger:** Error rate > 1% for 5 mins OR P0 Security Incident.
*   **Kill-Switch Owner:** SRE Lead / Release Captain.

---

## 3. GA Readiness Checklist (Gated)

### A. Reliability (The "Must-Haves")
- [ ] **Load Test:** Sustained 10k ingest/sec for 1 hour with < 0.1% errors.
- [ ] **Circuit Breakers:** Verified open state for Neo4j and External LLM timeouts.
- [ ] **Error Budget:** Burn rate alerts configured (4h and 1h windows).
- [ ] **Recovery:** Database Point-in-Time Recovery (PITR) drilled and verified (< 15 mins RTO).

### B. Security (Zero Trust)
- [ ] **Auth:** OIDC/SAML strict mode enabled (Legacy auth disabled).
- [ ] **Governance:** OPA policies compiled to WASM and enforcing on all entry points.
- [ ] **Vuln Mgmt:** 0 Critical, 0 High CVEs in container images (Trivy scan).
- [ ] **Secrets:** All secrets injected via Vault/K8s Secrets; no env vars in Dockerfile.

### C. Data Protection
- [ ] **Schema:** All PII fields tagged `@pii` and masked in logs.
- [ ] **Migrations:** All v4 migrations tested with `down` (revert) scripts.
- [ ] **Encryption:** TLS 1.3 enforcement; Data-at-rest encryption verified.

### D. Operational Readiness
- [ ] **Runbooks:** "Red/Black Deployment" and "Secret Rotation" runbooks executable.
- [ ] **On-Call:** PagerDuty schedule populated for v4 launch window.
- [ ] **Support:** L1/L2 escalation paths defined and tested.

---

## 4. Release Plan & Rollback

### Release Sequence
1.  **Stage 0: Internal (Now)** - Deploy to `dev` cluster. Run integration suite.
2.  **Stage 1: Staging (T-2 Weeks)** - Deploy to `staging`. Run Load Tests and Chaos Drills.
3.  **Stage 2: Canary (T-2 Days)** - Deploy to Production (5% traffic). Monitor "Version Health".
4.  **Stage 3: Full GA (T-0)** - Promote to 100%. Enable "Ironclad" feature flags.

### Feature Flags (LaunchDarkly / Env)
| Flag | Default | Description |
| :--- | :--- | :--- |
| `ENABLE_STRICT_SCHEMA` | `true` | Enforces Zod validation on all inputs. |
| `ENABLE_DUAL_WRITE` | `true` | Writes to both Neo4j and Postgres for lineage. |
| `USE_MOCK_LLM` | `false` | Disables mocks, connects to production models. |

### Rollback Protocol
**Command:** `make rollback target=v3.5.0`
**Verification:**
1.  Execute rollback command.
2.  Verify `version` endpoint returns `3.5.0`.
3.  Verify basic login and search flow (Smoke Test).
4.  Notify `#war-room` channel.

---

## 5. Observability Pack

**Dashboards (Grafana):**
1.  **Executive View:** Global Availability, Error Budget Remaining, Active Incidents.
2.  **API Health:** GraphQL Latency (p95, p99), Error Rate by Operation, Request Volume.
3.  **Ingestion Pipeline:** Events/sec, Lag (ms), Dead Letter Queue size.
4.  **Governance:** Policy Decisions (Allow/Deny ratio), Auth Failures.

**Key Alerts:**
*   **Sev-1:** Availability < 99.9% (5m window).
*   **Sev-2:** p95 Latency > 1.5s (15m window).
*   **Sev-2:** Ingestion Lag > 5 minutes.
*   **Sev-3:** Error Budget Burn > 5%/hour.

---

## 6. Risk Ledger (Top 5)

| ID | Risk | Likelihood | Impact | Mitigation Strategy | Owner |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **R-01** | **API Determinism Failure**<br>System throws untyped 500s, confusing clients. | High | Med | **Control:** Global Error Interceptor + Zod Schema Validation on all inputs. | Backend |
| **R-02** | **Policy Bypass**<br>New mutations added without AuthZ checks. | Med | High | **Control:** CI Linter (`authz-check`) failing build if `ensure()` is missing. | Security |
| **R-03** | **Dual-Write Drift**<br>Neo4j and Postgres get out of sync. | Med | High | **Control:** Reconciliation job (midnight) + "Compensating Transaction" logic. | Data |
| **R-04** | **Secret Leakage**<br>Dev secrets used in Prod. | Low | Critical | **Control:** `git-leaks` in CI + ephemeral credentials via OIDC. | Ops |
| **R-05** | **LLM Hallucination**<br>Analyst trusts incorrect AI summary. | High | Med | **Control:** Mandatory Citations UI + "Confidence Score" display. | AI |

---

## 7. Proof-Carrying Analysis (PCA)

### Assumptions
*   Staging environment parity with Production (Data volume scaled 10%).
*   External LLM providers maintain their SLAs.
*   No new "Black Swan" zero-day vulnerabilities in core dependencies (Node/Neo4j).

### Evidence Collection
*   **Provenance:** `provenance.json` generated for RC build [Link].
*   **SLO Compliance:** `slo-results.json` from Staging Load Test [Link].
*   **Security Scan:** Trivy Report `vuln-report-v4.json` (Clean) [Link].
*   **Policy Audit:** OPA Coverage Report (95%) [Link].

### Caveats & Unknowns
*   **Unknown:** Performance impact of full policy enforcement on high-volume ingest.
    *   *Action:* Run specific "Ingest + Policy" load test scenario.
*   **Unknown:** Latency of dual-write consistency checks.
    *   *Action:* Instrument `DualWriteSession` with high-resolution histograms.

### Regression Risks
*   **Strict Typing:** May cause runtime crashes for edge-case data that was previously ignored/passed as `any`.
    *   *Watch:* Monitor "Schema Validation Error" rate closely during Canary.

---

**Signed By:**
*   [ ] Engineering Lead
*   [ ] Security Lead
*   [ ] Operations Lead
