# On‑Call Runbooks & Post‑Incident Template — Sprint 26 GA

**Scope:** Gateway/API SLO burn, ER backlog, Policy deny storms, WebAuthn step‑up failures, Neo4j degradation, Freeze override, and generic post‑incident report. Incorporates IntelGraph org SLOs, cost guardrails, and evidence capture requirements.

---

## Quick Reference (L1)
- **Pager rotation:** SRE (primary), Gateway TL (secondary)  
- **Dashboards:** Gateway SLO, ER Queue Health, Cost & Telemetry  
- **Alert priorities:** Fast burn → **page**, Slow burn → **ticket**  
- **Evidence root:** `/evidence/incidents/<YYYYMMDD-INCID>`  
- **Freeze override approvers:** per `ops/freeze-windows.yaml`  

---

## Runbook 1 — Gateway/API SLO Burn
**Symptoms:** Alerts `APISLOFastBurn` or `APISLOSlowBurn`. Elevated p95/p99 or error rate.

**SLO Targets:** Reads p95 ≤ 350 ms (p99 ≤ 900 ms); Writes p95 ≤ 700 ms; Availability 99.9%/mo.

**Triage (≤ 5 min)**
1. Open **Gateway SLO Overview** dashboard; confirm alert window aligns with spike.  
2. Check **error budget burn** (fast vs slow); if fast burn persists > 10 min → initiate canary rollback or traffic reduction.  
3. Inspect **top endpoints** by latency/error (`/metrics` histograms).  

**Decision Tree**
- **High errors (5xx)**
  - Recent deploy? → flip canary to **0%** or `helm rollback`.  
  - Policy denies? → see Runbook 3.  
  - Auth errors on `@sensitive`? → see Runbook 4.  
- **High latency (no 5xx)**
  - Cache miss surge? (`gateway_cache_*`) → enable/enforce PQ, warm top‑10 PQs.  
  - Neo4j latency? → see Runbook 5.  
  - External deps (OPA) slow? → enable circuit‑breaker, fallback to cached decisions if permitted.

**Immediate Actions**
- Reduce traffic to canary (ALB/Nginx weight → 0–5%).  
- Toggle `PQ_ENFORCE=true` and register PQs; restart gateway if needed.  
- Apply rate limits to noisy tenants (ABAC/OPA policy).  

**Validation**
- p95 returns to target for 2 consecutive 5‑minute windows.  
- Error budget burn < 1× SLO over next hour.

**Evidence**
- Export dashboard JSON + trace exemplars → `/evidence/incidents/<id>/gateway/`.

---

## Runbook 2 — ER Backlog / DLQ Growth
**Symptoms:** ER queue lag > 60s; DLQ rate > 0.1%; intake throughput dips.

**Targets:** Intake ≥ 1,000 ev/s/pod; p95 processing ≤ 100 ms pre‑storage; lag < 60s @ 2× peak.

**Triage**
1. Check **ER Queue Health** dashboard (throughput, lag, DLQ%).  
2. Inspect **intake pod CPU/mem** and DB IOPS; scale if saturated.  
3. Validate **idempotency key** insertions; duplicates indicate upstream issue.

**Remediation**
- Scale **intake** pods (+1 each 5 min) until lag trends down.  
- Enable **rate limiting** on sources causing spikes.  
- Run **DLQ replay** with backoff: `node services/er/dist/dlq.js --from <offset>`.  

**Validation**
- Lag < 60s for 15 min; DLQ < 0.1% steady.  

**Evidence**
- Save throughput/lag snapshots + replay logs.

---

## Runbook 3 — Policy Deny Storm (OPA)
**Symptoms:** Widespread GraphQL denies; `policy-ci` passed but runtime blocks.

**Likely Causes:** New dataset missing license; retention/purpose tag mismatch; OPA latency.

**Triage**
1. Examine **Gateway errors** for `policy_deny` labels.  
2. Query **OPA decision logs**; sample explains.  
3. Check dataset manifests for `license`, `purpose`, `retention` fields.

**Remediation**
- Apply **emergency allowlist** for specific dataset/tenant via override Rego (time‑boxed; requires CTO & Legal approval).  
- Patch missing metadata; re‑trigger request.  
- If OPA latency: enable **cached decisions** for 15–30 min while investigating.

**Validation**
- Deny rate returns to baseline; OPA p95 < 50 ms.

**Evidence**
- Decision logs + explains attached; approval trail for any overrides.

---

## Runbook 4 — WebAuthn Step‑Up Failures
**Symptoms:** `@sensitive` mutations fail with `Step‑up required` or assertion errors.

**Triage**
1. Confirm **header presence**: `X‑StepUp‑Assert` and `X‑StepUp‑Challenge`.  
2. Check **RPID/origin** mismatches in logs; verify TLS and domain.  
3. Validate **session→credential binding** not expired.

**Remediation**
- Prompt user to re‑enroll or re‑authenticate; rotate session secret if widespread.  
- Roll back **Step‑Up enforcement** via feature flag (requires CISO approval).  

**Validation**
- Successful mutation with valid audit record (challenge ID logged).  

**Evidence**
- Capture failing & succeeding requests (redact secrets) + audit entries.

---

## Runbook 5 — Neo4j Degradation
**Symptoms:** 1‑hop > 300 ms; 2–3 hop > 1,200 ms; CPU thrash; page cache misses.

**Triage**
1. Run `CALL db.stats.clear()` and collect fresh plans on representative queries.  
2. Inspect **page cache** and **GC** metrics; verify **replica** health.

**Remediation**
- Apply **query hints** on hot paths; reduce payload shape (project fewer props).  
- Increase **page cache**; pin NLQ reads to replicas; scale replicas.  
- Backfill **indexes/constraints** if missing.

**Validation**
- p95s back within targets for 15 min; CPU stabilized.

**Evidence**
- Query plans, before/after timings, config diffs.

---

## Runbook 6 — Change Freeze Override
**When:** Critical fix during freeze window.

**Process**
1. Run `node tools/ci/check_freeze.js --validate`. If blocked, proceed with override.  
2. Collect **approvals** per `ops/freeze-windows.yaml` (CISO + Eng Mgr minimum).  
3. Create **override record**: `tools/ci/check_freeze.js --override --reason "<Jira> <impact>"`.  
4. CD runs with **Verify‑Bundle** and **tamper test**; canary 5% then 25% then 100%.  
5. Post‑deploy validation + evidence.

**Evidence**
- Override request, approvals, CD logs, k6 results.

---

## Communications Templates

**User‑Facing (Slack/StatusPage)**
```
[IntelGraph] Degraded performance on API reads. We are mitigating by reducing canary traffic and warming caches. No data loss. Next update in 30 minutes.
```

**Resolved Notice**
```
[IntelGraph] API performance restored to SLOs. Root cause: cache miss surge after deploy. Action: enforce persisted queries, add warmup job. Evidence bundle: /evidence/incidents/20251003-API-LATENCY.
```

---

## Post‑Incident Report Template

**ID:** `<YYYYMMDD-SHORT>`  
**Severity:** SEV‑1/2/3  
**Window (UTC):** `start → end`  
**Impact:** (what users experienced; error budget burned)  
**SLOs affected:** (reads/writes/ingest)  
**Root Cause:** (5 whys)  
**Timeline:** (detailed)  
**Mitigations:** (immediate)  
**Corrective Actions:** (prevent recurrence)  
**Evidence:** `/evidence/incidents/<id>/`  
**Owners:** (RACI)  

### Action Items (DOR by Sprint)
- [ ] Add PQ warmup job on deploy (owner, due sprint)  
- [ ] Tune OPA caching (owner, due sprint)  
- [ ] Index on :Entity(id) (owner, due sprint)  

---

## Appendices

### A. Command Snippets
- **Canary weight (Nginx):** `kubectl annotate ingress gateway nginx.ingress.kubernetes.io/canary-weight="5" --overwrite`
- **Helm rollback:** `helm rollback gateway <REV>`
- **PQ register:** `npm --prefix services/gateway run pq:register`
- **DLQ replay:** `node services/er/dist/dlq.js --from 0`

### B. Evidence Capture
- Export dashboards (`/ops/observability/dashboards/*.json`) to incident folder.  
- Save alert notifications (PagerDuty/email) as PDF or JSON.  
- Attach CI logs for any hotfix during freeze.

### C. SLO & Budget References
- API error budget: **0.1%** monthly (≈ 43 min).  
- Ingest error budget: **0.5%** monthly.  
- Prod cost guardrail: **≤ $18k/mo infra**, LLM **≤ $5k/mo**, alert at **80%**.

