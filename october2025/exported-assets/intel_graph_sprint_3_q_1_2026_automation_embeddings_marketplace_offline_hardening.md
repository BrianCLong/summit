# 🗡️ Council of Spies & Strategists — Sprint 3 Plan (Q1 2026)

> Opening: “From craft to system—teach the machine our etiquette, bind it to policy, and scale the hunt.”

## Sprint Goal (14–21 days)
Operationalize intelligence at scale with **policy‑bound automation**, **graph embeddings for recall & blocking**, an initial **Runbook/Connector Marketplace**, and **Offline Kit hardening**. Maintain strict **provenance, audit integrity, and budget governance**.

---
## Scope & Deliverables

### 1) Alert Automation & Orchestration (v1)
- **Policy‑bound actions:** allow only explicitly permitted automations (notify, tag, case create, snapshot, export); **no external calls** without signed connector.
- **Playbook runner:** schedule or trigger by conditions (pattern/anomaly thresholds, label changes); dry‑run w/ impact report.
- **Human‑in‑the‑loop gates:** approvals with reason + OPA check; every step emits artifacts to immutable audit.

### 2) Graph Embeddings & Similarity Services (v1)
- **Embeddings job:** node/edge embeddings (GraphSAGE/Node2Vec) with windowed retrain; feature parity for Persons/Orgs/Assets/Docs.
- **Similarity APIs:** nearest‑neighbor service with policy‑filtered results; batch candidate generation for ER blocking.
- **Quality harness:** recall@k on link‑prediction tasks; search uplift vs. baseline keyword and motif miner.

### 3) Offline Kit Hardening (v2)
- **Delta snapshots:** compact diffs signed and chained; resumable sync with partial verification.
- **Tamper‑evidence UX:** clear status banners; local integrity self‑check; operator repair flows.
- **Air‑gap tooling:** CLI utilities for manifest verify, access‑log inspection, and red‑team simulation scripts.

### 4) Marketplace Foundations (v1)
- **Runbook gallery:** signed packages with metadata (publisher, version, required privileges, data labels touched), rating + provenance.
- **Connector registry:** allowlist of signed connectors; install/enable workflow with OPA policy mapping preview.
- **Sandboxing:** per‑connector execution sandbox + budget caps; egress rules declared and enforced.

### 5) Case Management & Collaboration (v1)
- **Case graph snapshots:** point‑in‑time, diffable; link artifacts (queries, evidence, decisions) with hash anchors.
- **Tasking & annotations:** assign, due dates, inline comments tied to nodes/edges with policy labels visible.
- **Disclosure evolution:** multi‑export history with signature roll‑forward; change‑log explains deltas.

### 6) Scale & Resilience (v1)
- **Sharding/partitioning plan:** dataset knobs (by tenant, jurisdiction, or case) with cross‑shard query broker.
- **HA/DR:** multi‑AZ posture; RPO/RTO targets; signed backup/restore with manifest validation.
- **Hot path performance:** p95 4‑hop < 1.8s on reference graph; queue latencies SLOs upheld.

### 7) Governance, Risk, Compliance (v2)
- **Model Risk Management (MRM):** model cards (embeddings, ER), version pinning, rollback; approval workflow.
- **PII & secrecy tooling:** selective redaction in exports; warrant/legal‑basis tags enforced end‑to‑end, including automation.
- **Audit analytics:** auditor view with filters (actor, label, data class); outlier detection on access behavior.

---
## Acceptance Criteria
1. **Automation**
   - Playbooks execute only allowed actions; every step has an audit artifact; dry‑run impact report includes forecasted budget & policy check.
   - Approval gates block on OPA; denial explains which policy was violated and how to request exception.
2. **Embeddings**
   - ER blocking recall improves ≥ 25% at fixed precision on golden set; link‑prediction AUC ≥ baseline +0.08.
   - Similarity search returns only policy‑permitted items; top‑k results cite evidence/provenance where applicable.
3. **Offline v2**
   - Delta snapshots sync successfully with signature verification; tamper scenario is detected and surfaced in UI & CLI.
4. **Marketplace**
   - Runbook install shows provenance and required privileges; unsigned packages are rejected with reason.
   - Connector sandbox enforces egress and budget caps; policy mapping preview shows affected labels.
5. **Case & Collab**
   - Case snapshots are diffable; comments and tasks reference graph elements and appear in audit trail.
6. **Scale & Resilience**
   - DR test meets RPO/RTO; cross‑shard query broker returns consistent results across two partitions.
7. **GRC v2**
   - Model cards published; version pin/rollback works; export redaction obeys label rules.

---
## Backlog (Epics → Stories)
### EPIC O — Automation & Playbooks
- O1. Policy‑bound action catalog
- O2. Trigger engine + scheduler
- O3. Dry‑run + impact report
- O4. Approval gates + audit

### EPIC P — Embeddings & Similarity
- P1. Offline training pipeline
- P2. ANN service (HNSW/FAISS)
- P3. ER blocking integration
- P4. Quality harness + dashboards

### EPIC Q — Offline Hardening
- Q1. Delta snapshot format + signer
- Q2. Resumable sync + verify
- Q3. Tamper UX + operator flows
- Q4. Air‑gap CLI toolkit

### EPIC R — Marketplace Foundations
- R1. Runbook gallery + signing
- R2. Connector registry + allowlist
- R3. Sandbox + budget + egress rules

### EPIC S — Case & Collaboration
- S1. Case snapshots + diffs
- S2. Tasks/annotations API + UI
- S3. Disclosure history + roll‑forward

### EPIC T — Scale & Resilience
- T1. Sharding plan + broker
- T2. HA/DR runbook + tests
- T3. Hot‑path perf goals

### EPIC U — GRC v2
- U1. Model cards + approvals
- U2. Export redaction rules
- U3. Audit analytics + access outliers

---
## Definition of Done (Sprint 3)
- All ACs pass on reference & real‑world dataset; no critical security issues; DR drill completed; documentation updated (automation safety case, embedding model card, marketplace publishing guide, offline ops runbook); demo executes end‑to‑end.

---
## Demo Script
1. Analyst promotes an anomaly to a **policy‑bound playbook**; dry‑run shows expected actions, budget impact, and policy gates; after approval, runner tags entities, snapshots the case, and notifies watch channel.
2. ER blocking switches on **embeddings candidates**; adjudication queue density drops while recall@k increases; metrics dashboard shows uplift.
3. **Offline delta** applied on air‑gapped machine; tamper test triggers banner; CLI verifies chains and logs.
4. Install a signed **Runbook** and **Connector** from Marketplace; preview policy mapping and egress; an unsigned sample is rejected with a clear reason.
5. Case diff view shows added evidence and decision trail; disclosure history exports with redactions per label.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** automation safety case, marketplace trust model.
- **ML Eng (1):** embeddings pipeline, eval.
- **Backend (2):** playbook engine, sync, ANN service.
- **Frontend (2):** automation UI, case diffs, marketplace.
- **Platform (1):** sharding/broker, HA/DR, perf.
- **Security/Ombuds (0.5):** policy mapping, export redaction, audit analytics.

---
## Risks & Mitigations
- **Automation misfires** → policy‑bound actions only; always human‑in‑the‑loop; dry‑run mandatory.
- **Embedding drift** → schedule retrains; version pin & rollback; drift monitors.
- **Marketplace supply‑chain** → signature verification, sandboxing, allowlist; provenance shown at install.
- **Offline integrity gaps** → signed deltas + visible status; operator repair tools; fail‑closed on verify.

---
## Metrics
- Automation: ≥ 95% successful approved runs; 0 unauthorized actions.
- Embeddings: +25% ER‑blocking recall at fixed precision; link‑prediction AUC uplift ≥ 0.08.
- Offline: 100% delta verify, 0 undetected tamper events.
- Marketplace: 100% signed packages; sandbox violations blocked; time‑to‑install < 2 min.
- Resilience: DR drill pass; p95 4‑hop < 1.8s.

---
## Stretch (pull if we run hot)
- **Counterfactual “what‑if” runner** for playbooks.
- **Graph‑RAG** prototype for long‑form evidence Q&A (read‑only, citation‑only answers).
- **Slack/Teams signed webhooks** for notifications under budget guard.

*Closing:* “Automate the routine, sanctify the exceptions, and let the audit remember everything.”

