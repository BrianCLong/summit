# Sprint 13 — Privacy-Safe Analytics & Control (Jun 8–19, 2026, America/Denver)

> **Theme:** “Learn across tenants without leaking across tenants.” Build a privacy-safe analytics layer, prove isolation, and ship BYOK control knobs with governance receipts.

---

## 1) Sprint Goal (SMART)

By **Jun 19, 2026**, deliver cross-tenant analytics that stay aggregate-only, ship isolation detection with a Switchboard dashboard, and enable customer-managed keys (BYOK) for evidence/object storage—each gated by policy, metered for commercialization, and producing receipts.

**Key outcomes**

- Privacy guardrails block unsafe analytics (k-anonymity thresholds, low-cardinality dimension blocks, time-bucketing) and emit receipts.
- Aggregated insights live for activation funnel, tenant health cohorts, SLO compliance, and COGS (plus “You vs. cohort” benchmarks for Enterprise).
- Analytics API (`POST /analytics/query`) accepts strict schemas and returns only aggregates.
- Isolation Health dashboard surfaces cross-tenant access attempts, denial types, and anomaly spikes with runbook links.
- BYOK encrypts evidence/object storage artifacts and receipt payloads with tenant KMS keys; rotation supported for new writes.
- Governance receipts and quarterly evidence exports (“Trust Report”) include analytics and isolation proofs.
- BYOK entitlement metered with invoice-ready line items.

---

## 2) Success Metrics & Verification

- **Privacy guardrails:** ≥ 99% of analytics requests that violate thresholds are denied with rationale; no tenant-identifying fields in responses. _Verify:_ Decision logs + sampled receipts.
- **Aggregation safety:** Minimum cohort size enforced (k ≥ 10) and low-cardinality dimensions auto-rejected. _Verify:_ Unit tests + policy evaluation traces.
- **Analytics readiness:** Activation funnel, tenant health, SLO trends, and COGS aggregates available behind API + dashboard cards. _Verify:_ API responses and dashboard snapshots.
- **Isolation detection:** 100% of policy denials and RLS/object-prefix violations logged with actor/time/IP (where available). _Verify:_ Isolation Health dashboard + alert feed.
- **BYOK encryption:** New evidence/object artifacts and receipt payloads use customer KMS keys; rotation path live for new writes. _Verify:_ Key usage logs + encryption headers/receipts.
- **Governance receipts:** Every analytics query and BYOK lifecycle action emits a receipt with schema hash and decision trail. _Verify:_ Receipt store entries + digest checks.
- **Commercialization:** BYOK add-on metered per enabled tenant; invoice line item generated. _Verify:_ Billing export sample.

---

## 3) Scope

**Must-have (commit):**

- **Privacy Guardrails:** Implement aggregation policy (k-min thresholds, low-cardinality dimension deny list, time bucketing); deny + receipt on violation.
- **Analytics Data Products:** Activation funnel, tenant health cohorts, SLO compliance trends, COGS aggregates, and Enterprise “You vs. cohort” benchmarks with safe bucketing.
- **Analytics API:** `POST /analytics/query` schema validation (measures, dimensions, time range), aggregate-only outputs, policy gating + receipts.
- **Isolation Proofing:** Instrument policy denials, datastore RLS, and object-prefix violations; correlate to actor/IP/time; alerts into Isolation Health dashboard with top denied actions and spikes.
- **BYOK v0:** Tenant-scoped KMS key references (per region) encrypt object storage artifacts and receipt payload blobs; rotation for new writes; lifecycle (configure → validate → enable → rotate → disable) with dual control and receipts.
- **Governance & Exports:** Analytics receipts include schema hash, privacy decision, and result digest; Quarterly Trust Report export bundles analytics aggregates, isolation snapshots, DR evidence pointers, and selective disclosure proofs.
- **Commercialization:** Entitlement check for BYOK add-on; metering and invoice line item generation.

**Stretch:**

- **Backfill encryption for historical artifacts** (opt-in) post-rotation.
- **Basic differential privacy noise** for select metrics where thresholds are tight.

---

## 4) Team & Capacity

- Capacity: **~40–42 pts** (stretch optional).
- Ceremonies (America/Denver):
  - **Sprint Planning:** Mon Jun 8, 09:30–11:00
  - **Stand-up:** Daily 09:15–09:30
  - **Mid-sprint Refinement:** Thu Jun 11, 14:00–14:45
  - **Sprint Review:** Fri Jun 19, 10:00–11:00
  - **Retro:** Fri Jun 19, 11:15–12:00

---

## 5) Backlog (Ready for Sprint)

| ID        | Title                                             | Owner       | Est | Dependencies | Acceptance Criteria (summary)                          |
| --------- | ------------------------------------------------- | ----------- | --: | ------------ | ------------------------------------------------------ |
| ANA-201   | Privacy Guardrails & Receipts                     | BE+Policy   |   5 | —            | k-min + low-cardinality rules; time buckets; receipts  |
| ANA-211   | Analytics Data Products (Funnel/Health/SLO/COGS)  | Data+BE     |   5 | ANA-201      | Aggregates only; cohort thresholds; benchmark buckets  |
| ANA-221   | Analytics API (`POST /analytics/query`)           | BE+API      |   5 | ANA-201      | Schema validation; policy gating; aggregated output    |
| ISO-231   | Isolation Detection & Correlation                 | BE+SecOps   |   5 | —            | Denial/RLS/object violations logged with actor/IP/time |
| ISO-241   | Isolation Health Dashboard                        | FE+SecOps   |   5 | ISO-231      | Rates, top denied actions, spikes, runbook links       |
| BYOK-251  | KMS Integration for Evidence & Receipts           | BE+Platform |   5 | —            | Encrypt new artifacts/payloads with tenant keys        |
| BYOK-261  | BYOK Lifecycle (Enable/Rotate/Disable) + Receipts | BE+Platform |   5 | BYOK-251     | Validate, dual-control, rotation for new writes        |
| GOV-271   | Governance Receipts & Trust Report Export         | BE+Docs     |   4 | ANA-221      | Schema hash; privacy decisions; quarterly bundle       |
| COM-281   | BYOK Entitlement, Metering, Invoice Line Item     | BE+Finance  |   3 | BYOK-251     | Entitlement gate; metering; invoice sample             |
| ANA-291\* | Stretch: Opt-in Backfill Encryption/DP            | BE+Data     |   3 | BYOK-251     | Backfill tooling or DP noise flag with guardrails      |

> **Planned:** 42 pts with stretch optional.

---

## 6) Dependencies & Assumptions

- KMS access in staging with test keys; per-region key references stored securely.
- Policy engine available for analytics guardrails and entitlement checks.
- Isolation logging hooks in policy layer, datastore RLS, and object storage gateway.
- Synthetic datasets for benchmarks and leak testing; cohort sizes that meet k-min.
- Feature flags: `analyticsGuardrails`, `analyticsApi`, `isolationHealth`, `byokV0`, `trustReport`, `byokMetering`, `analyticsDP` (stretch).

---

## 7) QA Plan

**Functional:**

- Validate guardrail denials for sub-threshold cohorts, low-cardinality dimensions, and non-bucketed time ranges (receipt generated with rationale).
- Verify aggregates for funnel/health/SLO/COGS and Enterprise benchmark buckets return no tenant identifiers.
- API contract tests for `POST /analytics/query` (schema validation, policy gating, aggregate-only response).
- Isolation detection emits correlated events; dashboard shows rates/top actions/anomalies with links.
- BYOK encrypts new evidence objects and receipt payloads; rotation paths succeed; lifecycle emits receipts.
- Entitlement blocks BYOK without add-on; metering records enabled tenants; invoice export contains line item.
- Trust Report export bundles analytics aggregates, isolation snapshots, DR evidence pointers, and proofs.

**E2E:** Enterprise tenant with BYOK enabled → upload evidence/export receipt encrypted with tenant key → run safe analytics query (activation funnel by week) → denied unsafe query (small cohort) with rationale → Isolation Health dashboard shows attempted violations → export Trust Report bundle.

**Non-functional:**

- Guardrail and receipt paths add <50ms median overhead to analytics requests.
- BYOK encryption/rotation does not exceed storage SLA; alert noise tolerable on isolation signals.

---

## 8) Risks & Mitigations

- **Re-identification risk** if thresholds misconfigured → enforce defaults, block overrides without approval, add policy tests.
- **Performance regression** from guardrails/encryption → cache policy decisions; parallelize receipt writes; profile hot paths.
- **Key misconfiguration** → validation step with dry-run encrypt + dual-control approval; fallback to platform key with alert.
- **False positives in isolation alerts** → rate-limit noisy actors; tunable severity; weekly review.
- **Commercialization gaps** → finance sign-off on metering schema and invoice sample before GA.

---

## 9) Reporting Artifacts (produce this sprint)

- Privacy guardrail policy doc + receipt examples
- Analytics API schema + sample queries/responses
- Isolation Health dashboard snapshot + alert playbook
- BYOK lifecycle runbook + key usage logs
- Sample invoice export showing BYOK add-on
- Quarterly Trust Report bundle (aggregates + isolation + DR evidence pointers)

---

## 10) Demo Script (review)

1. Enable BYOK for a tenant (dual control) and show receipt.
2. Export an evidence bundle and verify encryption with the tenant key.
3. Run analytics query: “Activation funnel by week” → allowed; show receipt with schema hash.
4. Attempt unsafe query with too-small cohort → denied with privacy rationale.
5. Show Isolation Health dashboard (attempt rates, top denied actions, anomaly spike) with runbook link.
6. Export Quarterly Trust Report bundle with analytics + isolation snapshots.

---

## 11) Outcome of this sprint

Platform delivers privacy-safe analytics without tenant leakage, surfaces and curbs cross-tenant attempts, and gives enterprises BYOK control with receipts and billing hooks—laying the foundation for safer benchmarks and enterprise-grade trust.
