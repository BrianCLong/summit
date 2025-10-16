# Sprint Prompt — Operation **CLEARANCE LATTICE** (Wishlist Sprint 03)

**Window:** 2 weeks — Monday start, Friday 1500 demo.
**Theme:** Federate safely. Share surgically. Enforce retention. Alert with receipts.
**Rallying cry:** Connect islands without leaks. Every share leaves a footprint.

---

## 1) Mission (Non‑Negotiable)

Ship a working slice that enables **privacy‑preserving cross‑case/link discovery**, **redacted sharing modes**, **watchlist/alerting with policy checks**, and **retention + legal‑hold workflows** — all auditable, provenance‑bound, and reversible.

---

## 2) Scope (In)

1. **Federated Link Hints v0.9**
   - Per‑tenant isolation preserved.
   - Bloom‑filter/PSI (private set intersection) style **hashed identifiers** (salted, rota‑keys) publishable as **hint beacons**.
   - Cross‑tenant **link hint service** returns _maybe‑link_ with evidence counts only (no raw PII).
   - Analyst can request an **Escalate for Disclosure** workflow.

2. **Disclosure Modes & Redaction v1.0**
   - Three modes: **Internal**, **Partner (redacted)**, **Public (sanitized)**.
   - Redaction engine ties to ABAC/OPA obligations and license terms; per‑field masking, per‑document excerpting, auto‑caption with license.
   - Report Studio integrates mode selector; export manifests encode mode + redaction map.

3. **Watchlists & Alerts v0.8**
   - Rules engine (deterministic): list membership, geo corridor entry, contact with flagged entity, duplicate credential seen.
   - Alerts pass through **Policy Gate**: require legal basis + reason; generate a **reason‑for‑alert** note.
   - Subscriptions: case, entity, or rule; digest + real‑time.

4. **Retention & Legal Hold v0.9**
   - Retention classes enforced (from OPA): schedule jobs to purge/transform; **legal hold** pin stops purge.
   - "Right to Erasure" workflow: tombstone, mask, or transform with provenance carried; manifest updated with **erasure chain**.

5. **Streaming Ingest Path v0.7**
   - Kafka (or stub) topic(s) for new evidence; incremental lineage; watchlist evaluation inline; backpressure safe.
   - Export manifest supports **rolling batches** with checkpoint hashes.

6. **Audit & Share Ledger v1.0**
   - “Who saw what & why” dashboard; filter by case/tenant/actor/field.
   - Every share/alert retains reason, obligations, and redaction mode in immutable log.

---

## 3) Scope (Out)

- Probabilistic/ML link prediction; community detection.
- Cross‑jurisdiction data residency automation (only labels this sprint).
- Full PSI cryptography suite (mocked via salted Bloom filters + rotation policy).

---

## 4) Deliverables

- **Running demo** across two tenants (+ one public share).
- **Link Hint Service** with rota‑keyed Bloom filters + verifier tests.
- **Disclosure Modes** integrated in Report Studio with redaction maps exported.
- **Rules Engine** for watchlists with policy checks + digest.
- **Retention jobs** + legal hold UX; erasure manifests and offline verifier.
- Dashboards for **Audit & Share Ledger**.

---

## 5) Acceptance Criteria (Definition of Done)

### Federated Link Hints

- Publishing hints does **not** leak raw identifiers; inspection shows salted hashes only; rota‑keys rotate via config.
- Cross‑tenant request returns **counts + confidence** and a one‑click **Escalate**; audit logs capture requesting actor, reason, policy obligations.

### Disclosure Modes & Redaction

- Export in each mode (**Internal/Partner/Public**) yields different bundles with correct redactions; **verifier PASS** confirms redaction map + license captions.
- Attempt to export without license or basis → **Denied** with human‑readable clause and appeal path.

### Watchlists & Alerts

- On fixtures, rules fire deterministically; alerts require **legal basis + reason**; suppressions logged.
- Subscriptions deliver **digest** and **real‑time**; each alert links to underlying evidence and policy decision.

### Retention & Legal Hold

- Retention job purges/masks on schedule; legal hold blocks purge; erasure workflow updates **erasure chain** with checksums; verifier confirms manifest integrity pre/post erasure.

### Streaming Ingest

- New evidence through stream triggers lineage + watchlist evaluation; backpressure does not drop events; checkpoints visible in manifest.

### Audit & Share Ledger

- Dashboard shows who saw/shared what, when, and **why**; filters by tenant, case, field; exportable as disclosure addendum.

---

## 6) Work Breakdown (By Workstream)

### Graph / DB

- Tables/labels: `Share`, `Alert`, `Erasure`, `RetentionClass`, `HintBeacon`.
- Stored procs for hint publish/rotate; erasure chain writes; retention sweeps with dry‑run.

### Backend / Services

- **hint‑svc**: create/rotate Bloom filters (salted); answer hint queries with counts.
- **policy‑gateway**: extend OPA obligations for share/alert/retention; enforce basis + reason; surface obligations to UI.
- **rules‑engine**: deterministic rules eval; enqueue alerts; digest builder.
- **stream‑ingest**: Kafka stub + lineage capture; watchlist hooks.
- **ledger**: manifest extensions (redaction maps, rolling checkpoints, erasure chain); offline verifier updates.

### Frontend / Apps

- Report Studio: **Mode selector** + redaction preview; export w/ captions.
- Federation panel: publish/inspect hints; **Escalate** requests with reason.
- Watchlists UI: manage lists/rules; alert inbox + digest settings.
- Retention/Legal Hold: class labels, hold toggle, dry‑run preview, post‑run report.
- Audit dashboard: filters, CSV/PDF export.

### Policy / Governance

- Rego: sharing basis, partner scope, public redaction, retention classes, legal hold, alert obligations.
- License policy: allowed uses at export; caption templates.

### Data / Fixtures

- Two‑tenant synthetic dataset with overlapping hashed identifiers; watchlist names/phones/emails; geo corridor tracks; license variants.

### DevEx / SRE

- Rotating key scheduler; secret management; CI gate for redaction maps + erasure verifier; chaos: kill hint‑svc during rotation → no leak.

---

## 7) Test Plan

- **Unit:** bloom ops; rota‑key logic; rules eval; OPA decisions for share/alert/retention; erasure chain integrity; manifest checkpoints.
- **E2E:** publish hints → receive cross‑tenant counts → escalate → partner export → public export (sanitized) → retention sweep + legal hold → erasure workflow → all bundles **verifier PASS**.
- **Load:** 100k identifiers in hint beacons; alert throughput 50/s burst; streaming ingest 1k/s for 60s without loss.
- **Chaos:** rotate salts mid‑query; deny exports without basis; pause Kafka → backpressure resilience.

---

## 8) Demo Script (15 min)

1. Publish hint beacons from Tenant A; show no raw identifiers; rotate salt.
2. Tenant B queries and gets counts; **Escalate** to partner disclosure.
3. Export **Partner** bundle (redacted) and **Public** bundle (sanitized) with captions; run verifier → **PASS**.
4. Add an entity to a **watchlist**; stream in new evidence; see alert with **reason‑for‑alert** and policy obligations.
5. Run **retention sweep**; blocked by **legal hold**; lift hold and rerun; show **erasure chain** in manifest.
6. Audit dashboard: show who saw/shared what and why; export addendum.

---

## 9) Metrics (Exit)

- Zero raw identifier leakage in hints (manual/auto checks).
- 100% **verifier PASS** on exported bundles; redaction maps accurate.
- Alert false‑positive rate ≤ 5% on fixtures; digest delivery latency p95 < 30s.
- Retention job completes within window; legal hold blocks 100% of attempts; erasure chain integrity verified.
- Streaming path handles target load without loss.

---

## 10) Risks & Mitigations

- **Privacy leakage via hints:** rotate salts; rate‑limit; counts only; strict audit; tenant‑to‑tenant contracts.
- **Redaction gaps:** test packs with diffing; export blocks on missing policy/license.
- **Alert fatigue:** digest + thresholding; require reason; suppression with audit.
- **Erasure inconsistencies:** erasure chain verifier; dry‑run preview; legal hold precedence.

---

## 11) Dependencies

- Sprint‑01/02 features live: provenance ledger, tri‑pane, NLQ sandbox, deterministic ER, OPA gateway, disclosure bundles.
- Secrets management for rota‑keys; minimal Kafka or stub.
- License registry.

---

## 12) Stretch (only if green by Day 7)

- PSI via open‑source lib (benchmarked).
- Differential privacy counts for hint responses.
- Watchlist rule simulator with backtest timelines.

---

## 13) Operating Rules

- **Provenance Before Prediction.**
- **Least disclosure wins.**
- **Policy by default; reasons mandatory.**
- **Reversible automation** with verifiable manifests.

---

## 14) User Stories

- _As an analyst,_ I can safely discover potential cross‑tenant overlaps and request a controlled disclosure.
- _As a reviewer,_ I can enforce redaction modes tied to policy and license and see a verifier PASS.
- _As an operator,_ I can maintain watchlists and receive alerts that include reasons and obligations.
- _As a DPO/ombudsman,_ I can apply retention classes, legal holds, and erasure workflows and prove them in the manifest.

> **Orders:** Connect the islands without spillage. Share only what policy allows. Leave a perfect trail.
