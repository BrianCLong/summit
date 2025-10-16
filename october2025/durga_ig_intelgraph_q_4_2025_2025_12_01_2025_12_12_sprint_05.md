# DIRECTORATE J ∑ — Durga IG Workstream

**Classification:** Internal // Need‑to‑Know  
**Mode:** [JADE] Strategic Foresight + [JINX] Adversary Emulation + [JURY] Policy/Standards + [JAVELIN] GTM  
**Cadence Anchor:** Q4’25 company plan (Oct 6 – Dec 28, 2025)  
**This Sprint:** **S‑05: 2025‑12‑01 → 2025‑12‑12** (Prod target: **2025‑12‑17**)  
**Owner:** Durga IG (Directorate J ∑)

---

## A) Executive Thesis

- **Decisive Idea:** Convert trust plumbing into **market leverage**: externalize proofs to partners, lock in standards alignment, and make compliance capital measurable. Shift from “prove on request” to **prove proactively** with automated attestations and policy SLOs.
- **Next Best Actions:** (1) **Proof Portal v1** with partner attestations; (2) **Standards map & self‑declaration** (SLSA/ISO/DPDP/SEC‑style) + continuous conformance checks; (3) **Registry v1.2** (subject rights: access/erasure export hooks); (4) **Mixed‑strategy rollout v1.1** with risk caps; (5) **Adversary Campaigns v2** (credential stuffing + narrative injection) to validate edge cases.
- **Win Condition (S‑05):** Three public releases carry partner‑verifiable proofs; standards self‑declaration lives with **auto‑checks**; two ETL boundaries enforce **subject‑rights hooks**; rollout planner caps risk; no critical gaps in JINX‑v2.

---

## B) COAs (Good/Better/Best)

**Scale: effort (S/M/L) × impact (Low/Med/High)**

- **Good (baseline):** Portal v1, standards mapping, registry v1.2 hooks, rollout planner v1.1, JINX‑v2.
- **Better:** **Continuous Compliance** pipeline (nightly conformance + drift alerts), **Proof Webhooks** for partners, narrative prebunk v4 with signed FAQ.
- **Best:** **Proof Federation** (OIDC/Sigstore integration for third‑party verification) + partner co‑marketing checklist and evidence‑backed case studies.

**Gate (Day 5):** If partner webhook integration blocks, ship portal v1 without live partner callbacks; publish signed artifacts + stable endpoints; push webhooks to S‑06.

---

## C) Deliverables (Ship List)

1. **Proof Portal v1**
   - Partner proof pages: embed **Sigstore verify** UI, EB hash, policy coverage badge, exceptions ledger.
   - **Proof Webhooks (optional)** `POST /proofs/events` for partner CI (deliver EB id + hash).
   - SLA: P95 < 500 ms; CSP hardened; no PII.

2. **Standards Self‑Declaration + Auto‑Checks**
   - `docs/standards/` mapping SLSA 3, ISO‑27001 (selected controls), SOC‑lite claims with evidence pointers.
   - CI job `continuous-compliance.yml` to regenerate **control matrix**, fail if claims drift.

3. **Registry v1.2 — Subject Rights Hooks**
   - API: `POST /subject/export`, `POST /subject/erase`, `GET /subject/status/:id`.
   - Staging: enforce **deny unlabeled or expired‑retention** and block erasure if legal hold present; prod: warn→deny.

4. **Risk‑Aware Rollout Planner v1.1**
   - Adds **risk caps** per tenant/region; supports **halt‑on‑signal** from KRIs; integrates **post‑deploy evidence injection**.

5. **Adversary Campaigns v2 (JINX)**
   - **C‑03 Credential Stuffing** with step‑up auth & rate‑limit checks;
   - **C‑04 Narrative Injection** (external claims vs portal proofs) with prebunk v4.

6. **Narrative Defense v4**
   - Signed FAQ pages; prebunk scripts auto‑include EB hash & verify steps; channel hygiene score surfaced on portal.

---

## D) Work Breakdown & Swimlanes

**Lane A — Portal v1 (Release Eng + Web)**

- A1 Add partner pages and verify widget; render exceptions ledger from `evidence/public/`.
- A2 Implement and document `POST /proofs/events` with HMAC signatures and replay protection.
- A3 Load tests + CSP audits.

**Lane B — Standards (JURY + Durga IG)**

- B1 Build claim‑evidence matrices with **explicit warrants**.
- B2 Author self‑declaration docs; attach EB ids; set CI drift checks.
- B3 Add **issue templates** for non‑conformance CAPA.

**Lane C — Registry v1.2 (Data Eng)**

- C1 Implement subject rights endpoints with idempotency + audit trail.
- C2 Simulate exports/erasures on anonymized datasets; emit metrics `subject_exports_total`, `subject_erasure_total`, `holds_active_total`.
- C3 Deny unlabeled/expired flows; prod warn→deny; dashboards/alerts.

**Lane D — Rollout v1.1 (SRE)**

- D1 Risk caps per tenant; halting signals wired to KRIs; ensure **rollbackd** consumes caps/halts.
- D2 Post‑deploy evidence injector.

**Lane E — JINX‑v2 (SecOps + Durga IG)**

- E1 Build stuffing fixtures and success criteria; measure **account takeover averted**.
- E2 Narrative injection test vs portal; verify prebunk auto‑post.

**Lane F — Narrative v4 (Comms)**

- F1 Signed FAQ + prebunk updates; hygiene scoring display; owners & approvals.

---

## E) Scorecard & Tripwires (Targets)

**KPIs**

- Portal v1 P95 < 500 ms; 3 public releases with proofs + partner pages.
- Standards matrix regenerated each release; CI fails on drift; CAPA under 7 days.
- Subject rights hooks operational; exports/erasures simulated with 0 errors; ≥ 2 real requests completed (if any).
- Rollout planner enforces risk caps; **0** breaches of cap; rollback P95 ≤ 6m when triggered.
- JINX‑v2: **0 critical**; **Credential stuffing blocked** ≥ 99.9%.

**KRIs**

- Portal CSP violations, 4xx/5xx > 1%.
- Standards drift (controls losing evidence).
- Subject rights queue > 3 open > 7 days.
- Deny spikes post‑enforcement; narrative anomalies post‑release.

**Tripwires**

- Disable partner webhooks on abuse/replay; revert to signed static proofs.
- Freeze deploy if standards drift persists 24h.
- Auto‑rollback on unlabeled/expired flows at boundary.

---

## F) PCS — Proof‑Carrying Strategy

**Evidence Basis:** Prior sprints (portal v0, coverage gate, registry v1.1, rollbackd, KRIs, R‑score) and internal cadence docs.  
**Assumptions:** Partner OIDC available for webhook signing; Sigstore available; data sets for subject rights testing; CI capacity for nightly conformance.  
**Confidence:** High for portal v1/standards mapping; Medium‑High for registry v1.2; Medium for partner webhooks.  
**Falsifiers:** High CSP violation rate; webhook replay detected; subject rights SLA misses; drift alerts unstable.

---

## G) Artifacts & Scaffolding (Drop‑in)

### 1) Proof Webhook Contract — `apps/proof-portal/webhooks.md`

```http
POST /proofs/events HTTP/1.1
X-Partner-Id: <id>
X-Timestamp: <unix_ms>
X-Signature: sha256=<hmac>

{ "eb_id": "EB-01F..", "sha256": "...", "release": {"repo":"...","tag":"v1.2.3"} }
```

### 2) Webhook Verify (Express) — `apps/proof-portal/server/webhook.js`

```javascript
import crypto from 'crypto';
export function verify(req, res, next) {
  const sig = req.get('X-Signature')?.split('=')[1];
  const ts = req.get('X-Timestamp');
  if (Date.now() - Number(ts) > 5 * 60 * 1000) return res.status(401).end();
  const mac = crypto
    .createHmac('sha256', process.env.PARTNER_SECRET)
    .update(req.rawBody)
    .digest('hex');
  if (mac !== sig) return res.status(401).end();
  next();
}
```

### 3) Continuous Compliance — `.github/workflows/continuous-compliance.yml`

```yaml
name: Continuous Compliance
on: [schedule]
schedule:
  - cron: '0 3 * * *'
jobs:
  controls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python tools/controls/generate_matrix.py > docs/standards/control_matrix.md
      - run: python tools/controls/check_claims.py --fail-on-drift docs/standards/control_matrix.md
```

### 4) Standards Mapping (skeleton) — `docs/standards/self_declaration.md`

```md
# Standards Self‑Declaration

- **Scope:** Tier‑1 services
- **SLSA 3:** provenance, SBOM, signed tags → EB fields `artifacts.*`
- **ISO 27001 (selected):** A.8, A.12, A.14 mapped to EB/policy evidence
- **SOC‑lite claims:** change mgmt, release gates, rollback evidence
- **Proofs:** EB ids, portal verify steps
```

### 5) Registry v1.2 — API Deltas `services/registry/openapi.yaml`

```yaml
paths:
  /subject/export:
    post: { responses: { '202': { description: accepted } } }
  /subject/erase:
    post: { responses: { '202': { description: accepted } } }
  /subject/status/{id}:
    get: { responses: { '200': { description: ok } } }
```

### 6) Subject Rights Worker — `services/registry/worker.py`

```python
from queue import Queue
q = Queue()
while True:
    job = q.get()
    if job.type == 'EXPORT':
        # gather labeled data, redact PII per policy
        pass
    if job.type == 'ERASE':
        # check legal hold, then redact/soft-delete
        pass
```

### 7) Rollout Risk Caps — `tools/rarp/config.yaml`

```yaml
caps:
  tenant:
    max_concurrent_pct: 25
    max_daily_risk_score: 0.6
  region:
    max_concurrent_pct: 30
halt_on:
  - OPA_DENY_CRITICAL
  - UNLABELED_FLOW
  - NARRATIVE_SPIKE
```

### 8) JINX‑v2 Playbooks — `campaigns/jinx_v2/`

```md
# C‑03 Credential Stuffing

Target: login endpoints. Expect: rate limit + step‑up auth.

# C‑04 Narrative Injection

Target: external channels. Expect: prebunk v4 link + EB verify steps.
```

### 9) Narrative v4 — Signed FAQ `apps/proof-portal/public/faq.md`

```md
Q: How do I verify a release?
A: Open Proof Portal → copy EB hash → run verify script (Sigstore) → compare SHA‑256.
```

---

## H) RACI & Resourcing

- **Responsible:** Release Eng (Portal v1), JURY (standards), Data Eng (Registry v1.2), SRE (RARP v1.1), SecOps (JINX‑v2), Comms (Narrative v4), Durga IG (orchestration).
- **Accountable:** CTO / Director Sec.
- **Consulted:** Legal/DPO, Partner Eng.
- **Informed:** Exec staff; Board (monthly pack).

---

## I) Milestones & Calendar

- **M1 (Dec 3):** Standards self‑declaration published; continuous‑compliance job live.
- **M2 (Dec 5):** Portal v1 partner pages in prod (no webhooks).
- **M3 (Dec 9):** Registry v1.2 subject rights endpoints staging; two simulations green.
- **M4 (Dec 10):** Rollout risk caps enforced; halt‑on signals validated.
- **M5 (Dec 12):** JINX‑v2 pass; 3 releases with proofs; scorecard green/amber with CAPA.

---

## J) Governance & Provenance

- All public artifacts signed; EB/DEC cross‑references live; exception backlog monitored; standards drift alerts page; subject rights logs retained with TTL.

---

## K) DoD‑J (Definition of Done)

- Three public releases with partner‑verifiable proofs; standards self‑declaration + continuous checks active; subject rights hooks operational; rollout caps enforced; JINX‑v2 passes; narrative v4 live; scorecard green or justified amber with mitigations.
