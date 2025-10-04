# 🗡️ Council of Spies & Strategists — Sprint 6 Plan (Q4 2026)

> Opening: “Hold the wire, harden the mask, carry the graph to the field.”

## Sprint Goal (14–21 days)
Add **real‑time streaming ingest & alerting**, advance **deception/poison defenses**, ship **Field Kit (mobile/edge)** for low‑conn ops, and achieve **audit readiness** (SOC 2 Type I / ISO 27001 pre‑audit). Mature multi‑lingual support and cross‑jurisdiction policy packs.

---
## Scope & Deliverables

### 1) Streaming Intel Ingest & Alerts (v1)
- **Kafka/NATS ingest** with exactly‑once semantics to canonical model; schema registry + lineage on streams.
- **Windowed detectors:** sliding/tumbling windows for burst, rate, and co‑occurrence spikes; **policy‑aware** throttles.
- **Real‑time alerts:** debounce + deduplicate; budgeted delivery channels (webhook/email/syslog) via signed connectors.

### 2) Deception & Data‑Poison Protections (v1)
- **Source reputation ledger:** per‑source trust, freshness, license, and historical error rates.
- **Poison screens:** canary queries, duplicate‑content traps, cross‑evidence contradictions, and claim‑consistency checks.
- **Quarantine workflow:** isolate suspect data into shadow index; adjudication UI; restore/expunge with manifest updates.

### 3) Field Kit (Mobile/Edge) (v1)
- **Mobile tri‑pane** with offline snapshot reader; minimal writebacks: notes/tags queued for sync.
- **Edge capture:** camera/mic with **redaction‑at‑capture** profiles; hardware‑bound keys; sealed storage.
- **Peer‑to‑peer sync:** local mesh handoff using signed deltas; conflict policy additive; operator controls.

### 4) Multilingual & Translation (v1)
- **Language detection** at ingest; **policy labels** per language.
- **On‑prem translation** (quality‑gated) with provenance of transforms; bilingual evidence view (original + translation).
- **Cross‑lingual entity linking:** transliteration/alias tables; ER aids for common scripts.

### 5) Audit Readiness & Controls (v1)
- **SOC 2/ISO control mapping:** map existing features to controls; gap remediation for access reviews, key mgmt rotation, vendor risk.
- **Automated evidence packer:** pulls audit artifacts (logs, approvals, manifests) by control ID; read‑only.
- **Operational runbooks:** access review cadence, incident response desk checks, backup/restore drills.

### 6) Policy Packs & Jurisdictional Templates (v1)
- **Region packs:** GDPR/UK‑GDPR, CCPA/CPRA, PDPA, LGPD mappings to labels and retention.
- **Warrant templates:** standardized legal‑basis tags per region; enforcement tests.
- **Residency router:** stream/topic routing per policy pack; block + explain on violations.

### 7) Performance & Resilience (v2)
- **Hot path tuning:** p95 5‑hop < 2.2s; streaming detector latency p95 < 5s.
- **Backpressure & surge:** graceful degrade and queues; circuit breakers with operator controls.
- **Chaos drills:** broker/node failures; verify RPO/RTO and delta‑snapshot integrity.

---
## Acceptance Criteria
1. **Streaming**
   - Exactly‑once ingest verified on replay; windowed detectors fire within SLA; lineage preserved on stream transforms.
2. **Deception/Poison**
   - Poison scenarios detected in ≥ 90% scripted tests; quarantines isolate data with full provenance; restores update manifests.
3. **Field Kit**
   - Offline snapshot open, annotate, sync; redaction‑at‑capture enforced; mesh sync passes signature checks.
4. **Multilingual**
   - Bilingual evidence view renders original + translation with provenance; cross‑lingual ER improves recall by ≥ 15% on test set.
5. **Audit Readiness**
   - Evidence packer produces control‑mapped bundles; pre‑audit checklists pass internal review.
6. **Policy Packs**
   - Residency router blocks out‑of‑region flows with clear explanations; warrant templates attach and are enforced.
7. **Perf/Resilience**
   - Meets 5‑hop and detector latency SLOs; chaos drills meet RPO/RTO.

---
## Backlog (Epics → Stories)
### EPIC AJ — Streaming & Detectors
- AJ1. Kafka/NATS adapters + registry
- AJ2. Windowed detectors + lineage
- AJ3. Alert delivery + budgets

### EPIC AK — Deception/Poison Defense
- AK1. Source reputation ledger
- AK2. Poison screens + traps
- AK3. Quarantine index + UI

### EPIC AL — Field Kit
- AL1. Mobile reader + notes
- AL2. Edge capture + redaction
- AL3. Mesh sync + controls

### EPIC AM — Multilingual
- AM1. Lang‑detect + labels
- AM2. On‑prem translation + provenance
- AM3. Cross‑lingual ER aids

### EPIC AN — Audit Readiness
- AN1. Control mapping
- AN2. Evidence packer
- AN3. Ops runbooks

### EPIC AO — Policy Packs
- AO1. Region templates
- AO2. Warrant tags + tests
- AO3. Residency router

### EPIC AP — Perf & Resilience
- AP1. Hot‑path tuning
- AP2. Backpressure + degrade
- AP3. Chaos drills

---
## Definition of Done (Sprint 6)
- ACs pass on live‑like streams + field demo; pre‑audit evidence bundles compiled; docs updated (streaming SOPs, deception defense guide, field kit usage, jurisdiction packs); demo succeeds E2E.

---
## Demo Script
1. Live stream ingests; detector flags a burst; alert delivered via signed webhook under budget.
2. Poisoned feed attempt triggers quarantine; adjudicator reviews, expunges, and verifies manifest update.
3. Field officer captures photo/audio with redaction‑at‑capture; later mesh‑syncs to base; annotations appear with provenance.
4. Analyst views bilingual evidence; cross‑lingual ER links aliases.
5. Auditor downloads SOC 2 evidence pack; policy router blocks an out‑of‑residency stream with explanation.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** streaming architecture, deception defenses.
- **Backend (2):** adapters, detectors, quarantine, residency router.
- **Frontend (2):** mobile reader, quarantine UI, bilingual views.
- **Platform (1):** chaos/backpressure, evidence packer, SLOs.
- **Security/Ombuds (0.5):** policy packs, pre‑audit.

---
## Risks & Mitigations
- **False alarms** → debounce/dedupe, thresholds, human review.
- **Edge device compromise** → hardware keys, sealed storage, remote revoke.
- **Translation errors** → provenance, show originals, allow user feedback.

---
## Metrics
- Streaming: p95 detector latency < 5s; zero duplicate commits.
- Poison defense: ≥ 90% scripted catch rate; 0 quarantined items escape into primary index.
- Field: 100% redaction enforcement; sync success ≥ 98%.
- Audit: evidence bundles complete for ≥ 95% control IDs.

---
## Stretch (pull if we run hot)
- **Real‑time geofence actions** (policy‑bound).
- **On‑device OCR/ASR** acceleration paths.
- **Partner live‑stream peering** under strict contracts.

*Closing:* “Speed without secrecy is noise; secrecy without speed is stale.”

