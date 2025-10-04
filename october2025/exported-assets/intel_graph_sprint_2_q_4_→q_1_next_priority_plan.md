# 🗡️ Council of Spies & Strategists — Sprint 2 Plan (Q4 2025 → Q1 2026)

> Opening: “The first cut has drawn blood; now sharpen the blade.”

## Sprint Goal (14–21 days)
Elevate the vertical slice with **probabilistic Entity Resolution + adjudication**, **pattern mining & anomaly scoring**, and the first **operational runbooks** — all **policy‑aware**, **auditable**, and **cost‑governed**. Ship **Offline Kit v1** and expand connectors to support at‑speed situational awareness.

---
## Scope & Deliverables

### 1) Probabilistic ER + Adjudication (v1)
- **Pairwise matcher:** gradient‑boosted/transformer hybrid on blocking keys (name‑phonetic, email, phone, geodistance, doc checksum).
- **Calibrated scoring:** Platt or isotonic calibration; thresholds {auto‑merge, queue, auto‑split} by class of entity.
- **Clerical Review Queues:** worklists with **Explain** (feature diffs, SHAPish attributions), **policy labels visible**, and **reversible decisions** with full lineage.
- **Golden set + eval harness:** precision/recall/PR‑AUC; daily drift report on top features.

### 2) Pattern Miner & Anomaly Scoring (v1)
- **Co‑presence miner:** frequent subgraph discovery over time windows (e.g., person‑account‑device‑location motifs), with provenance fan‑out preserved.
- **Anomaly scoring:** basic unsupervised scores (degree/temporal burst/transactional deviation), **no automatic actions**; surface to analysts with rationale and links to evidence.
- **Watchlists & Cases integration:** promote patterns to **Case** with snapshot + disclosure payload.

### 3) Runbook Library (v1) — Operable Intelligence
- **R11: Campaign Graph Builder** (ingest → resolve → pattern → case).
- **R16: High‑Fidelity Alert Triage** (anomaly → hypothesis → evidence check → disposition).
- **Runbook Studio:** parameterize steps; export as signed YAML with version + required privileges.

### 4) Cost Guard — Enforcement (v1)
- **Budgets:** per user/role/project; **deny or pre‑flight prompt** when forecast exceeds budget.
- **Query governor:** timebox + hop limits per label; **explain why** when blocked.
- **Economy tips:** inline hints (sample, time‑slice, rank‑by) before execution.

### 5) Offline Kit (v1)
- **Local‑only tri‑pane** (read‑only snapshots) with signed access logs; no network required.
- **Sync daemon:** resumable, manifest‑verified sync; conflict policy = additive only.
- **Key mgmt:** per‑device keys, revocation list import.

### 6) Connectors Expansion (v1)
- **RSS/Atom**, **STIX/TAXII**, **IMAP read‑only**, and **GDrive/OneDrive** doc pull (metadata + checksums); all with license/source capture and OPA label mapping.

### 7) Governance, Audit & Observability (continued)
- **OPA write‑path hooks** for ER adjudications and case promotions.
- **Audit diff views** (who changed what, evidence before/after); exportable.
- **SLOs:** add ER queue latency, pattern miner runtime; alert policies with on‑call rota.

---
## Acceptance Criteria
1. **Prob. ER**
   - PR‑AUC ≥ 0.92 on golden set; auto‑merge precision ≥ 0.98 at chosen threshold; all merges/declines reversible with single click.
   - Review queue shows explanations + policy labels; actions recorded in immutable audit with reason.
2. **Pattern & Anomaly**
   - Co‑presence miner returns top‑k motifs within timebox on seeded dataset; every surfaced pattern cites underlying evidence nodes/edges.
   - Anomaly panel shows score, rationale, and quick actions → create hypothesis or case; **no hidden features**.
3. **Runbooks**
   - R11 and R16 run end‑to‑end on demo data; each step emits artifacts (queries, results, decisions) into the audit trail; YAML exports verify signatures.
4. **Cost Guard**
   - Budget breach → pre‑flight prompt with alternatives; governed queries respect hop/time caps; denial events show human‑readable reason and appeal path.
5. **Offline Kit**
   - Tri‑pane operates on a signed snapshot; all local reads write signed access logs; sync verifier rejects tampered manifests.
6. **Connectors**
   - Each new connector captures license/source and maps to policy labels; ingest wizard supports field mapping with suggestions; lineage recorded.
7. **Gov/Audit/Obs**
   - OPA enforces write decisions; audit diff view export matches manifest; SLO dashboards display ER queue p95 and miner runtime.

---
## Backlog (Epics → Stories)
### EPIC H — Probabilistic ER & Adjudication
- H1. Feature store + blockers
- H2. Pairwise model + calibration
- H3. Threshold policy + auto‑merge/queue
- H4. Adjudication UI + Explain
- H5. Reversible ops + lineage
- H6. Eval harness + drift report

### EPIC I — Pattern & Anomaly
- I1. Motif mining engine (windowed)
- I2. Evidence‑linking & provenance
- I3. Anomaly scorers (burst/degree/tx)
- I4. Analyst panel + promote‑to‑case

### EPIC J — Runbooks
- J1. Runbook Studio (signed YAML)
- J2. R11 implementation
- J3. R16 implementation
- J4. Audit artifact emitter

### EPIC K — Cost Guard Enforcement
- K1. Budget model + UI
- K2. Query governor + caps
- K3. Pre‑flight prompts + hints
- K4. Appeals & exception workflow (read‑only)

### EPIC L — Offline Kit
- L1. Snapshot packager + signer
- L2. Local tri‑pane + access logs
- L3. Sync daemon + verifier
- L4. Device key mgmt + revocation

### EPIC M — Connectors v1
- M1. RSS/Atom
- M2. STIX/TAXII
- M3. IMAP (read‑only)
- M4. GDrive/OneDrive metadata pull

### EPIC N — Governance & Observability
- N1. OPA write‑path hooks
- N2. Audit diff views
- N3. New SLOs + alerts

---
## Definition of Done (Sprint 2)
- All AC above pass on seeded + one real‑world dataset; security review clears **no criticals**; docs updated (model cards for ER/anomaly, runbook specs, operator runbooks); demo script executes end‑to‑end.

---
## Demo Script
1. Ingest mixed feeds (RSS + STIX) → canonical with provenance.
2. Prob. ER auto‑merges high‑confidence pairs; queues edge cases; analyst adjudicates with Explain.
3. Miner surfaces a recurring P‑A‑D‑L motif; analyst promotes to Case; anomaly panel highlights a temporal burst.
4. Cost guard intercepts an expensive path query; analyst applies suggested time‑slice; query executes under budget.
5. Offline Kit: open the signed snapshot on an air‑gapped laptop; verify logs; resync to main and verify manifest.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** ER architecture, cost guard, OPA write hooks.
- **ML Eng (1):** matcher, calibration, eval harness.
- **Backend (2):** miner, connectors, offline sync.
- **Frontend (2):** adjudication UI, anomaly panel, runbook studio.
- **Platform (1):** SLOs, alerts, packaging, signing.
- **Security/Ombuds (0.5):** policy mapping, audit reviews.

---
## Risks & Mitigations
- **Labeling debt** for ER → bootstrap golden set; add active‑learn sampling from queues.
- **False‑positive motifs** → require evidence links + analyst confirmation; never auto‑act.
- **Cost guard friction** → provide actionable alternatives; owner‑approved overrides with audit.
- **Offline data integrity** → mandate signed manifests and per‑device keys; reject unsigned snapshots.

---
## Metrics
- ER: PR‑AUC ≥ 0.92; auto‑merge precision ≥ 0.98; queue latency p95 < 2h.
- Miner: top‑k motifs in < 45s on demo graph; anomaly panel adoption rate ≥ 60% of sessions.
- Cost guard: ≥ 30% reduction in >95th‑pctile query cost.
- Offline: 100% signed‑snapshot acceptance; 0 integrity violations.

---
## Stretch (pull if we run hot)
- Graph embeddings for candidate blocking.
- Additional connectors: MISP, Slack read‑only.
- Runbook marketplace scaffold with signature verification.

*Closing:* “Let findings stand on evidence; let power bow to policy.”

