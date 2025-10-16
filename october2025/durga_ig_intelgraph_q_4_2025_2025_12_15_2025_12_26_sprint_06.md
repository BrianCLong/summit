# DIRECTORATE J ∑ — Durga IG Workstream

**Classification:** Internal // Need‑to‑Know  
**Mode:** [JADE] Strategic Foresight + [JINX] Adversary Emulation + [JURY] Policy/Standards + [JANUS] Double‑Loop Learning + [JAVELIN] GTM  
**Cadence Anchor:** Q4’25 company plan (Oct 6 – Dec 28, 2025)  
**This Sprint:** **S‑06: 2025‑12‑15 → 2025‑12‑26** (Prod target: **2025‑12‑31**)  
**Owner:** Durga IG (Directorate J ∑)

---

## A) Executive Thesis

- **Decisive Idea:** Close Q4 with **externally provable operations at scale** and a **repeatable trust engine**. Harden what we shipped (Proof Portal, Registry, OPA, RARP) and federate proofs to partners.
- **Next Best Actions:** (1) **Proof Federation v0** (OIDC + Sigstore verify callback); (2) **Continuous Compliance v1** (nightly + pre‑release checks with CAPA automation); (3) **Subject‑Rights Live** for two ETL boundaries with SLA; (4) **Policy Coverage SLO QA** and exception burn‑down; (5) **JANUS Q4 review** to reset metrics/guardrails for Q1.
- **Win Condition (S‑06):** Partner can verify **3 releases** without our assistance; continuous‑compliance green ≥ 95% of nights; subject‑rights SLA met (TTR ≤ 7 days; 100% audit‑logged); exception backlog ≤ 1/service; post‑action review codified with updated playbooks.

---

## B) COAs (Good/Better/Best)

**Scale: effort (S/M/L) × impact (Low/Med/High)**

- **Good:** Proof federation (manual partner config), CC v1, subject‑rights live, exception backlog near‑zero, JANUS review.
- **Better:** Auto‑provision partner verifier via OIDC dynamic client; drift guard for registry and policy bundles; status page with public EB hashes per release.
- **Best:** Mixed‑strategy rollout auto‑tunes using KRIs + partner feedback loop; publish **Compliance Capital Score** beta.

**Decision Gate (Day 4):** If partner federation blocked by identity constraints, ship **signed artifact mirrors** + verify script pack; move dynamic OIDC to Q1.

---

## C) Deliverables (Ship List)

1. **Proof Federation v0**
   - OIDC relying‑party flow for partners; **/federation/verify** endpoint; cosign verification server‑side; downloadable verify receipts.
   - Partner onboarding guide + sandbox.

2. **Continuous Compliance v1**
   - Expand nightly job: control matrix regeneration, policy/test coverage checks, standards mappings; **CAPA auto‑tickets** with SLA.
   - Dashboard tile + fail‑open/closed rules.

3. **Subject‑Rights Live (Registry v1.3)**
   - SLAs: export ≤ 7 days, erase ≤ 30 days unless legal hold.
   - Audit trail + signed receipts; simulation → live switch on two boundaries.

4. **Policy Coverage SLO QA + Exception Burn‑down**
   - Coverage SLO ≥ 0.9 enforced; exception ledger trimmed to ≤ 1 active/service with expiry.
   - Delta report attached to EB.

5. **RARP v1.2**
   - Risk cap tuning; "halt on narrative spike" signal; rollout experience report (win/loss) into Conductor.

6. **JANUS Q4 Review Kit**
   - Post‑action review (PAR) template; metric refresh; doctrine updates; Q1 hypothesis backlog.

7. **JINX v3 (Targeted)**
   - **C‑05 OPA Bypass Attempt** (malformed headers, replay); **C‑06 Subject Rights Abuse** (bulk erasure attempt). Expect: deny + alert + receipts.

---

## D) Work Breakdown & Swimlanes

**Lane A — Federation (Release Eng + Partner Eng)**

- A1 OIDC Client Reg manual; tokens with short TTL; JWK rotation docs.
- A2 `/federation/verify` endpoint verifies EB hash + signature; emits receipt id.
- A3 Sandbox + onboarding doc.

**Lane B — Continuous Compliance (JURY + Release Eng)**

- B1 Extend controls; add ISO‑A.12/A.14 checks; enforce fail‑closed on core controls.
- B2 CAPA auto‑open issues; DRI + due dates.

**Lane C — Registry v1.3 (Data Eng)**

- C1 SLA timers + status; hold checks; receipts emitted to `evidence/public/receipts/`.
- C2 Live on ETL‑A/B; metrics to KRIs.

**Lane D — SLO QA + Exceptions (SecOps)**

- D1 Coverage audit; remove stale exceptions; enforce expiries.
- D2 Integrate delta report into EB + release notes.

**Lane E — RARP v1.2 (SRE + Durga IG)**

- E1 Tune caps; wire narrative‑spike signal; produce rollout report to Conductor.
- E2 Canary validation on one Tier‑1.

**Lane F — JANUS (Durga IG + All)**

- F1 Run PARs for S‑01..S‑06; update doctrine; publish Q1 hypotheses.
- F2 Update scorecards, KRIs, stop/rollback criteria.

**Lane G — JINX v3 (SecOps)**

- G1 Author fixtures; run canary; file gaps + CAPA.

---

## E) Scorecard & Tripwires (Targets)

**KPIs**

- **3** partner verifications completed end‑to‑end.
- Nightly continuous‑compliance green ≥ **95%**; CAPA SLA met for 100% new issues.
- Subject‑rights requests: export ≤ 7 days (P95), erase ≤ 30 days (P95), **0** unauthorized.
- Coverage SLO ≥ 0.9 on 95% releases; exceptions ≤ 1/service.
- RARP halts trigger rollback ≤ 6m P95; post‑deploy evidence injected automatically.
- JANUS review completed; Q1 backlog published.

**KRIs**

- OIDC auth failures, webhook abuse, CSP violations.
- Control drift; exception backlog growth.
- Subject‑rights queue > 3 open > 7 days.
- Narrative anomaly spikes during rollouts.

**Tripwires**

- Disable federation endpoint on abuse; fall back to signed artifacts.
- Freeze deployment if coverage drops < 0.85 or drift persists 24h.
- Auto‑rollback on unlabeled/expired flows or critical OPA deny.

---

## F) PCS — Proof‑Carrying Strategy

**Evidence Basis:** Prior sprints (portal v1, coverage gate, registry v1.2, RARP v1.1, JINX‑v2), internal control matrices, EB links in release notes.  
**Assumptions:** Partner OIDC feasible; Sigstore available; CI capacity for nightly CC; legal holds available via registry.  
**Confidence:** High for CC v1 and SLO QA; Medium‑High for federation v0; Medium for live subject‑rights across two boundaries.  
**Falsifiers:** Partner cannot complete OIDC; CC flakes > 5%; subject‑rights breach of SLA; exception backlog not burning down.

---

## G) Artifacts & Scaffolding (Drop‑in)

### 1) Federation Verify Endpoint — `apps/proof-portal/server/federation.js`

```javascript
import express from 'express';
import { verifyEB } from './verify.js';
import { requireOIDC } from './oidc.js';
const r = express.Router();
r.post('/federation/verify', requireOIDC, async (req, res) => {
  const { eb_id, sha256 } = req.body;
  const ok = await verifyEB(eb_id, sha256);
  if (!ok) return res.status(400).json({ ok: false });
  const receipt = `VRF-${Date.now()}`;
  // store receipt (redacted) for partner download
  res.json({ ok: true, receipt });
});
export default r;
```

### 2) OIDC Middleware — `apps/proof-portal/server/oidc.js`

```javascript
export async function requireOIDC(req, res, next) {
  // validate id_token, audience, expiry; check partner allow‑list
  try {
    /* ... */ next();
  } catch (e) {
    return res.status(401).end();
  }
}
```

### 3) Continuous Compliance Expansion — `.github/workflows/continuous-compliance.yml` (delta)

```yaml
jobs:
  controls:
    steps:
      - run: python tools/controls/check_iso_a12_a14.py --fail-closed
      - run: python tools/controls/open_capa.py --from report.json --sla-days 7
```

### 4) Subject‑Rights Receipts — `services/registry/receipts.md`

```md
Receipt fields: id, subject_hash, type(export/erase), created_at, status, evidence_refs, signatures[]
```

### 5) Exception Delta Report — `tools/policy/exception_delta.py`

```python
# emits markdown of added/removed/expired exceptions; attach to EB
```

### 6) RARP v1.2 — Narrative Signal Hook `tools/rarp/signals.py`

```python
# consume narrative anomaly score; raise HALT if z > 2.0
```

### 7) JANUS PAR Template — `docs/janus/par_template.md`

```md
# Post‑Action Review (PAR)

- Outcomes vs intent
- Metrics (KPIs/KRIs)
- What worked / didn’t
- Doctrine updates
- Q1 hypotheses & experiments
```

### 8) JINX‑v3 Fixtures — `campaigns/jinx_v3/`

```md
# C‑05 OPA Bypass Attempt

Inject malformed headers; attempt replay; Expect: deny + alert.

# C‑06 Subject Rights Abuse

Flood erase requests; Expect: rate limit + holds respected + receipts.
```

---

## H) RACI & Resourcing

- **Responsible:** Release Eng (Federation), JURY (Continuous Compliance), Data Eng (Registry v1.3), SecOps (SLO/Exceptions, JINX), SRE (RARP v1.2), Durga IG (JANUS orchestration).
- **Accountable:** CTO / Director Sec.
- **Consulted:** Legal/DPO, Partner Eng, Support.
- **Informed:** Exec staff; Board (Q4 closeout).

---

## I) Milestones & Calendar

- **M1 (Dec 18):** Federation endpoint & sandbox live.
- **M2 (Dec 19):** Continuous‑compliance v1 green two nights in a row; CAPA flow active.
- **M3 (Dec 20):** Subject‑rights live on ETL‑A/B; receipts emitted.
- **M4 (Dec 23):** Coverage SLO QA + exception burn‑down ≤ 1/service.
- **M5 (Dec 24):** RARP v1.2 halt tested with narrative signal.
- **M6 (Dec 26):** JANUS PAR completed; Q1 backlog published.
- **M7 (Dec 31):** 3 partner verifications completed on public releases.

---

## J) Governance & Provenance

- Federation receipts signed and stored; EB/DEC cross‑links; continuous‑compliance outputs retained 7y; subject‑rights logs immutable with lawful redaction; exceptions auto‑expire.

---

## K) DoD‑J (Definition of Done)

- **Partner‑verifiable proofs** for 3 releases; **CC v1** green ≥ 95%; **subject‑rights live** (SLA met, receipts signed); **coverage SLO ≥ 0.9** with ≤ 1 exception/service; **RARP v1.2** halts validated; **JANUS** review published with Q1 hypotheses; scorecard green/amber with CAPA and ownership.
