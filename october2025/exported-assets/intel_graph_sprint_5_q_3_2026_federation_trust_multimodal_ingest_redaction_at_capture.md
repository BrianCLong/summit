# 🗡️ Council of Spies & Strategists — Sprint 5 Plan (Q3 2026)

> Opening: “Trust is a bridge made of signatures, policies, and proofs.”

## Sprint Goal (14–21 days)
Enable **inter‑org federation and artifact exchange** with cryptographic trust, expand **multimodal ingest** (images, audio, video, chat), and implement **redaction‑at‑capture** so sensitive content is controlled at ingress. Reinforce **supply‑chain security** for connectors/runbooks and mature **partner compliance**.

---
## Scope & Deliverables

### 1) Federated Sharing & Exchange (v1)
- **Trust fabric:** org identities (OIDC + hardware‑backed keys), signed artifacts (disclosure bundles, case snapshots), revocation lists.
- **Exchange protocol:** asynchronous, store‑and‑forward **Air‑Gap Mail** (AGM) with manifest validation; policy contracts attached (purpose, retention, redistribution).
- **Consent & warrants:** explicit legal‑basis tags required; audit trails link sender/receiver with immutable chain.

### 2) Partner Spaces & Access Mediation (v1)
- **Partner Spaces:** scoped sandboxes with curated datasets; read‑only by default; export gated by policy.
- **Mediated queries:** pre‑approved saved queries runnable by partners; results redacted per contract; budgets per partner enforced.
- **Disclosure watermarking:** robust, per‑recipient watermarks on exports (text/image/pdf) with leak forensics.

### 3) Multimodal Ingest (v1)
- **Images:** EXIF strip, perceptual hash, OCR pipeline (toggleable); face detection only for redaction boxes (no face ID).
- **Audio:** diarization/light ASR (on‑prem models); PII scrubber; provenance for transforms.
- **Video:** key‑frame extraction + OCR; optional voice→text track; redaction boxes applied to frames before storage.
- **Chat/Comms:** Slack/Teams read‑only connectors (metadata + message text); license/source capture; retention labels.

### 4) Redaction‑at‑Capture (v1)
- **Policy engine at ingress:** field‑level, region‑level (image/video) and token‑level (text/audio) redaction with reversible vaulting.
- **Just‑in‑time reveal:** gated reveals by warrant/legal‑basis + role; access emits audit artifacts.
- **Operator tools:** redaction review queue; before/after diff; batch re‑processing.

### 5) Supply‑Chain Security for Extensions (v2)
- **Sigstore‑style signing:** attestations for connectors/runbooks (build provenance, hash of deps).
- **SBOM & CVE watch:** per‑package SBOM with CVE alerts; auto‑quarantine on high‑severity.
- **Repro builds:** deterministic build pipeline for official packages; public verification instructions.

### 6) Compliance, Legal & Policy (v3)
- **Cross‑border policies:** data residency constraints enforced on ingest/export; partner contracts encode residency & purpose.
- **Retention harmonizer:** per‑label retention across tenants and partner spaces; crypto‑erasure proofs shared with partners.
- **DPIA/PIA templates:** one‑click export of processing assessments populated from ROPA and policy logs.

### 7) Operability & SLOs
- **Federation SLOs:** delivery latency, signature‑verify rate, rejection rate; alerting on trust failures.
- **Media pipeline SLOs:** OCR/ASR throughput/latency; redaction queue p95.
- **Cost guard for media:** pre‑flight estimates for OCR/ASR; budgets per project.

---
## Acceptance Criteria
1. **Federation**
   - Exchange of a signed case snapshot succeeds E2E; receiver verifies signatures, policies, and manifests; audit links both orgs.
   - Unauthorized or unsigned artifacts are rejected with clear policy reasons and evidence in audit.
2. **Partner Spaces**
   - Partner runs a pre‑approved query; results reflect required redactions and watermarks; budget caps enforced.
3. **Multimodal**
   - Images/audio/video/chat ingest capture provenance for all transforms; redaction boxes apply before storage; toggles respected.
4. **Redaction‑at‑Capture**
   - Sensitive regions/tokens are redacted at ingress with reversible vaulting; reveal requires legal‑basis + approval; all events audited.
5. **Supply‑Chain**
   - All first‑party connectors/runbooks ship with attestations and SBOMs; a CVE event auto‑quarantines an extension until owner approves.
6. **Compliance**
   - Residency constraints enforced; retention proofs generated and shareable; DPIA/PIA exports compile without manual edits.
7. **SLOs**
   - Federation delivery p95 < 5m; OCR throughput ≥ target; redaction queue p95 < 10m; media budgets respected.

---
## Backlog (Epics → Stories)
### EPIC AC — Federation & Partner Trust
- AC1. Org identity + key mgmt
- AC2. AGM exchange protocol + verifier
- AC3. Policy contracts + consent/warrants

### EPIC AD — Partner Spaces & Mediation
- AD1. Scoped sandboxes & curation
- AD2. Mediated queries + redaction
- AD3. Watermarking + leak forensics

### EPIC AE — Multimodal Ingest
- AE1. Images (OCR, pHash, redaction)
- AE2. Audio (ASR/diarization + scrub)
- AE3. Video (key‑frames + OCR)
- AE4. Chat connectors (Slack/Teams)

### EPIC AF — Redaction‑at‑Capture
- AF1. Ingress policy engine
- AF2. Redaction vault + reveal gates
- AF3. Operator review tools

### EPIC AG — Supply‑Chain Security
- AG1. Signing & attestations
- AG2. SBOM/CVE pipeline
- AG3. Repro builds + verification

### EPIC AH — Compliance & Policy
- AH1. Residency & purpose enforcement
- AH2. Retention harmonizer + proofs
- AH3. DPIA/PIA exporters

### EPIC AI — Operability & SLOs
- AI1. Federation SLOs + alerts
- AI2. Media pipeline dashboards
- AI3. Media cost guard

---
## Definition of Done (Sprint 5)
- All ACs pass on inter‑org demo; security review clears; partner legal review signed off; documentation updated (federation guide, redaction‑at‑capture SOP, media ingest runbooks); demo executes end‑to‑end.

---
## Demo Script
1. Org A exports a **signed case snapshot**; Org B verifies, ingests into a **Partner Space**, and runs a mediated query; results are redacted and watermarked.
2. A **chat + image + video** bundle is ingested; redaction‑at‑capture removes sensitive regions/tokens; provenance shows transforms.
3. A partner requests reveal of redacted fields; OPA gate enforces legal‑basis + approval; audit artifacts recorded.
4. An extension with a new CVE is auto‑quarantined; operator reviews SBOM, approves patch, and re‑enables.
5. Residency and retention policies are exercised; a crypto‑erasure proof is shared back to partner.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** federation trust, redaction ingress policies.
- **Backend (2):** AGM protocol, partner spaces, SBOM/CVE pipeline.
- **ML/Media (1):** OCR/ASR, redaction models.
- **Frontend (2):** Partner Spaces UI, mediation flows, redaction review tools.
- **Platform (1):** signing, keys, dashboards, SLOs.
- **Security/Ombuds (0.5):** legal/policy mapping, DPIA/PIA exports.

---
## Risks & Mitigations
- **Cross‑org policy drift** → machine‑readable contracts; fail‑closed; compatibility tests.
- **Media costs** → cost guard pre‑flight + sampling; on‑prem models.
- **Watermark robustness** → multiple modalities, leak forensics; periodic validation.

---
## Metrics
- Federation: 0 unsigned artifact acceptances; p95 delivery < 5m.
- Redaction: 100% ingress redaction on flagged content; 0 unauthorized reveals.
- Multimodal: ≥ 90% OCR field extraction accuracy on demo set; ASR WER within target.
- Supply‑chain: 100% extensions signed; CVE quarantine MTTR within target.

---
## Stretch (pull if we run hot)
- **Partner federated search** (preview) over allowlisted indices with policy contracts.
- **Hardware‑rooted sealing** of redaction vault.
- **Live stream ingest** (RTSP) with inline redaction.

*Closing:* “Federate with proofs, reveal with warrants, remember with audit.”

