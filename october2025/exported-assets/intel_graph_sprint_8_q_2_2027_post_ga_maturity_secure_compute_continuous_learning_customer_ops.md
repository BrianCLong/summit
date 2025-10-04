# 🗡️ Council of Spies & Strategists — Sprint 8 Plan (Q2 2027)

> Opening: “After the banners come the ledgers—tighten the discipline and teach the system to learn safely.”

## Sprint Goal (14–21 days)
Post‑GA maturation across **secure compute (enclaves)**, **continuous learning loops** (label → model → policy), **tenant‑level analytics & billing**, and **customer operations** (SRE + support runbooks). Strengthen **Zero‑Trust posture** and **data lifecycle hygiene**.

---
## Scope & Deliverables

### 1) Secure Compute & Confidential Analytics (v1)
- **Enclave jobs (TEE):** enclave‑backed execution for sensitive transforms (ER training, embeddings, OCR/ASR batches); remote attestation with evidence.
- **Sealed secrets:** per‑job key derivation; results signed and bound to manifest.
- **Policy‑aware scheduling:** only allow enclave jobs for datasets with labels requiring secure compute.

### 2) Continuous Learning System (v1)
- **Feedback capture:** thumbs‑up/down + rationale on Graph‑RAG answers, ER decisions, alert dispositions.
- **Data contracts for training:** curate “OK‑to‑learn” datasets from labeled evidence; exclude “no‑learn” by contract; lineage preserved.
- **Auto‑propose retrains:** thresholds on drift/quality trigger proposals with cost & policy impact; approval gates + audit artifacts.

### 3) Customer Analytics, Billing & Quotas (v1)
- **Tenant analytics:** usage by feature, query cost, storage, connectors; export as signed reports.
- **Billing integration:** metering → invoices (stub); prepaid budget tokens for Gov/air‑gap; overage alerts.
- **Quotas:** soft then hard limits by edition; explain‑when‑blocked UX.

### 4) Zero‑Trust Hardening (v2)
- **Fine‑grained scopes:** per‑feature API tokens; short‑lived credentials; device posture checks.
- **PEP expansion:** policy enforcement points on webhooks, connectors, and CLI.
- **Session recording & review:** optional, policy‑gated capture of high‑risk admin sessions with immutable storage.

### 5) Data Lifecycle Hygiene (v2)
- **Cold storage tier:** signed, cheaper tier for stale snapshots with fast re‑hydrate; retention honored.
- **PII minimization jobs:** scheduled truncation/anonymization on non‑critical fields per policy.
- **Evidence rot checks:** broken links, orphaned manifests, hash mismatches → repair queue.

### 6) Customer Ops & Supportability (v1)
- **Runbooks:** install/upgrade, backup/restore, index repair, federation troubleshooting.
- **Support toolkit:** redaction diff extractor, manifest verifier, policy simulator, cost‑guard explainer.
- **Telemetry opt‑in:** privacy‑preserving product telemetry with data contracts and clear dashboards.

---
## Acceptance Criteria
1. **Secure Compute**
   - Enclave jobs attest successfully; outputs signed; policy scheduler routes labeled datasets into TEEs only.
2. **Continuous Learning**
   - Feedback captured across three surfaces; “OK‑to‑learn” contracts enforced; one retrain proposal generated with cost/policy impact and routed for approval.
3. **Analytics & Billing**
   - Tenant analytics dashboard live; invoice stubs generated from metering; quotas enforced with human‑readable reasons.
4. **Zero‑Trust**
   - Short‑lived tokens required for admin APIs; device posture enforced on two paths; PEPs added to webhook & CLI.
5. **Lifecycle Hygiene**
   - Cold tier operational; rot checker identifies and repairs issues; PII minimization runs per schedule with audit artifacts.
6. **Customer Ops**
   - Runbooks validated in a fire‑drill; support toolkit solves three scripted incidents; telemetry dashboards display opt‑in stats.

---
## Backlog (Epics → Stories)
### EPIC AV — Secure Compute
- AV1. Enclave executor + attestation
- AV2. Sealed secret mgmt
- AV3. Policy‑aware scheduler

### EPIC AW — Continuous Learning
- AW1. Feedback capture + rationale
- AW2. OK‑to‑learn data contracts
- AW3. Drift monitors + retrain proposals

### EPIC AX — Analytics & Billing
- AX1. Tenant analytics dashboards
- AX2. Billing stubs + tokens
- AX3. Quotas + explain UX

### EPIC AY — Zero‑Trust v2
- AY1. Fine‑grained tokens
- AY2. Device posture checks
- AY3. PEPs for webhook/CLI

### EPIC AZ — Lifecycle Hygiene v2
- AZ1. Cold storage tier
- AZ2. PII minimization jobs
- AZ3. Rot checks + repair queue

### EPIC BA — Customer Ops
- BA1. Ops runbooks set
- BA2. Support toolkit
- BA3. Telemetry opt‑in + dashboards

---
## Definition of Done (Sprint 8)
- All ACs pass on staging + one production tenant; security review clears (no criticals); docs updated (TEE guide, learning contracts, billing/quotas, ZT playbook, lifecycle SOPs); demo succeeds E2E.

---
## Demo Script
1. Dataset labeled “secure‑compute” runs an **enclave job**; attestation verified; outputs signed and tied to manifest.
2. Analysts provide feedback on Graph‑RAG and ER; a **retrain proposal** is generated with cost & policy impact; approved and executed.
3. Tenant **analytics/invoice stub** generated; a quota limit blocks an operation with a clear explanation.
4. A high‑risk admin session uses **short‑lived tokens** and passes device posture; webhook call denied by new PEP with reason.
5. A stale snapshot moves to **cold tier**; rot checker repairs a broken evidence link; PII minimization job logs redactions.
6. Support engineer resolves an incident using the **toolkit**; telemetry dashboard shows anonymized product metrics.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** secure compute, learning contracts.
- **Backend (2):** enclaves, scheduler, analytics/billing.
- **Frontend (2):** feedback UI, analytics dashboards, quotas UX.
- **Platform (1):** cold tier, rot checks, telemetry pipeline.
- **Security/Ombuds (0.5):** ZT tokens/PEPs, data contracts.

---
## Risks & Mitigations
- **TEE complexity & perf** → start with batch jobs; cache attestation; perf budget per job type.
- **Feedback noise** → require rationale; weight by analyst trust; review loops.
- **Quota backlash** → clear comms, override path with audit; previews in analytics.

---
## Metrics
- Secure compute: 100% enclave jobs attested; 0 unsigned outputs.
- Learning: ≥ 60% surfaces with feedback; ≥ 1 approved retrain; no “no‑learn” violations.
- Billing: invoices generated for 100% paid tenants; <1% quota false‑positive complaints.
- Zero‑Trust: 100% admin API calls with short‑lived tokens; 0 bypasses of PEPs.
- Hygiene: ≥ 95% rot issues auto‑repaired; cold tier saves ≥ 30% storage cost for eligible data.

---
## Stretch (pull if we run hot)
- **TEE for live queries** (read‑only proof‑of‑concept).
- **Active‑learn loop** for adjudication queues.
- **Customer success playbooks** with outcome dashboards.

*Closing:* “Secure the compute, teach the system, and mind the ledgers.”

