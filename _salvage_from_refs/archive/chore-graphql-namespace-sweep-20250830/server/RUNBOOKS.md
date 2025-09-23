# IntelGraph Assistant — Production Runbooks

> Version: 1.0 • Owner: IntelGraph Platform Team • Last updated: August 25, 2025

This runbook covers day‑2 operations for the Assistant pipeline: **client → transports (fetch/SSE/Socket.IO) → API streaming → enrichment (BullMQ) → Neo4j suggestions → GraphQL review UI → commit**. It documents SLOs, detection, triage, mitigation, validation, and post‑incident steps for common failure modes.

---

## 0) Quick Facts

**SLOs**

* p95 time‑to‑first‑byte (TTFB) for `/assistant/*` < **500 ms**
* p95 time‑to‑complete < **2.5 s**
* Error rate < **1%** over 5 minutes per tenant

**Primary dashboards (Grafana/Datadog placeholders)**

* Assistant Overview: latency, errors, QPS, tokens, cache hit‑rate
* Enrichment Queue: backlog, processing rate, failures/second
* Neo4j Health: query latency, active sessions, lock/GC
* Redis Health: CPU, RTT, evictions, memory

**Key endpoints**

* `/metrics` – Prometheus metrics registry
* `/healthz` – basic liveness/readiness (Redis+Neo4j ping)

**Feature flags**

| Flag                       | Scope  | Purpose                                 |
| -------------------------- | ------ | --------------------------------------- |
| `ASSISTANT_ENABLED`        | server | Kill switch for all assistant endpoints |
| `ASSISTANT_VOICE`          | client | Enable/disable voice UI                 |
| `AI_SUGGESTIONS_REVIEW_UI` | client | Toggle review panel                     |
| `VITE_ASSISTANT_TRANSPORT` | client | `fetch` (default) | `sse` | `socket`  |

**Important config**

* JWT key pair, `REDIS_URL`, `DATABASE_URL`, `NEO4J_URI/USER/PASSWORD`
* Ingress: buffering **off**, read timeout ≥ 60s, sticky WS for Socket.IO

**Toolbelt**

* `kubectl`, `stern`/`kubetail`, `k6`, `redis-cli`, `psql`, `cypher-shell`

---

## 1) Canary & Rollback Procedures

### 1.1 Canary rollout

1. Set environment:

   * Client: `VITE_API_BASE` to target, `VITE_ASSISTANT_TRANSPORT=fetch` (initial)
   * Server: ensure feature flags enabled per tenant/org as needed
2. Route **5%** of traffic → new version (Ingress/Service mesh weight).
3. Watch SLOs (5–10 min):

   * p95 TTFB < 500 ms, complete < 2.5 s
   * Error rate < 1%
   * Queue failure rate < 0.5%
4. If healthy, ramp → **25%** → **100%** with the same checks.

### 1.2 Rollback

* **Feature flag** rollback (preferred): toggle `ASSISTANT_ENABLED=false` or switch transport to prior mode.
* **Deploy** rollback: `helm rollback <release> <rev>` or `kubectl rollout undo deployment/<name>`.
* Validate via smoke (see §6) and SLO dashboards.

---

## 2) Common Incidents

Each entry lists **Detect → Triage → Mitigate → Validate → Postmortem**.

### 2.1 LLM breaker open / upstream degraded

**Detect**: error spikes (>1%), breaker state "open", fallback responses increase; logs show upstream 5xx/timeouts.

**Triage**

* Check `/metrics`: `assistant_http_errors_total`, breaker metrics (if exported), cache hit‑rate.
* Inspect provider status/dashboard.

**Mitigate**

* Increase cache TTL to reduce load (env or config map).
* Force fallback message for affected tenants; throttle high‑QPS tenants.
* Scale API replicas if event‑loop lag rises.

**Validate**: error rate <1% over 5m; p95 within SLO.

**Postmortem**: capture timelines, provider RCA, add synthetic checks.

### 2.2 Streaming latency spike

**Detect**: p95 TTFB > 500 ms or complete > 2.5 s.

**Triage**

* Verify ingress buffering is **off** after last deploy.
* Check pod CPU/mem, event‑loop lag, GC (runtime metrics).
* Run `k6` smoke (§6) against canary and control.

**Mitigate**

* Scale replicas + HPA limits; reduce per‑request work; ensure gzip/deflate disabled for tiny chunks.
* For Socket.IO storms, enable sticky sessions and Redis adapter.

**Validate**: latency histograms move back to target buckets.

### 2.3 Enrichment queue backlog

**Detect**: queue depth rising; latency to suggestion > 2 min; worker failures > 0.5%.

**Triage**

* Inspect Bull board / Redis keys; sample job payloads for anomalies.
* Review Neo4j write latency.

**Mitigate**

* Scale workers; set `attempts/backoff` sane; move poison jobs to DLQ.
* Temporarily skip low‑value enrichment (flag) or reduce batch size.

**Validate**: backlog drains; failure rate stable.

**Postmortem**: adjust retry policy and backpressure.

### 2.4 Hot tenant quota/abuse

**Detect**: repeated 429s from a single org; rateLimit metrics per tenant.

**Triage**: identify org via labels; confirm legitimate spike vs abuse.

**Mitigate**

* Raise/lower per‑tenant limits; block abusive tokens; enable captcha or invite flow.

**Validate**: 429s return to baseline; no collateral damage.

### 2.5 Redis degraded/outage

**Detect**: cache & rate‑limit errors; increased latency.

**Triage**: `INFO`, memory, evictions.

**Mitigate**

* Fail‑open on cache and rate limiter (as implemented);
* Point to standby Redis; reduce TTLs after recovery.

### 2.6 Neo4j connectivity/locks

**Detect**: driver errors; timeouts; rising query latency.

**Triage**: run health Cypher, inspect active transactions; check JVM/GC.

**Mitigate**

* Lower write throughput (throttle enrichment);
* Add indexes/constraints; rotate connections; scale core/read replicas.

**Validate**: latency normal; no lock waits.

### 2.7 Postgres audit bloat

**Detect**: table growth, slow writes.

**Mitigate**: VACUUM/partition by month; move to async write buffer if needed.

### 2.8 Socket.IO reconnect storms

**Detect**: connection churn, CPU spikes.

**Mitigate**: enable Redis adapter, sticky sessions, adjust `pingInterval/pingTimeout`.

### 2.9 Prompt‑injection false positives

**Detect**: 400 `input_rejected` for benign content.

**Mitigate**: extend allowlist; per‑tenant override; log samples for tuning.

### 2.10 DSAR / Right‑to‑erasure

**Procedure**

1. Verify requester identity and tenant ownership.
2. Run Cypher/SQL erasure scripts (see Appendix).
3. Invalidate caches and derived suggestions; reindex search as needed.

---

## 3) On‑call Checklists

**Every shift start**

* Open Assistant Overview dashboard.
* Verify no red alerts in last 24h.
* Run smoke tests (see §6) against prod and canary.

**When paged**

* Acknowledge within SLA; start incident doc; set severity; post status in #ops.
* Follow the incident’s runbook section; update status every 15m.

**After resolution**

* Validate SLOs; mute alerts; raise postmortem within 24h.

---

## 4) Observability Reference

**Key metrics**

* `assistant_http_latency_ms{path,method,status}` (Histogram)
* `assistant_http_errors_total{path,code}` (Counter)
* `assistant_tokens_streamed_total{mode}` (Counter)
* Queue: processed/sec, failures/sec, backlog
* Cache: hit/miss, TTL effective

**Traces**

* Ensure `x-request-id` propagates; sample rate ≥ 10% during incidents.

**Logs**

* Structured JSON with `reqId`, tenant, user, mode, duration, tokens, status.

---

## 5) Security & Compliance

* RBAC: require `graph:write` to accept/reject suggestions.
* Secrets: rotate JWT/DB creds per policy; track last rotation.
* PII: scrub in logs and GraphQL errors.
* Retention: scheduled purge job (default 90 days) with audit logs.

---

## 6) Smoke & Load

**HTTP stream smoke**

```bash
curl -N -X POST "$API_BASE/assistant/stream"   -H "Authorization: Bearer $TOKEN"   -H 'Content-Type: application/json'   -d '{"input":"test stream"}'
```

**SSE smoke**

```bash
curl -N "$API_BASE/assistant/sse?q=hello&token=$TOKEN"
```

**k6 quick check**

```bash
k6 run server/tests/k6.assistant.js -e BASE=$API_BASE -e TOKEN=$TOKEN
```

---

## 7) Rollout/Config Commands

**Kubernetes**

```bash
kubectl -n intelgraph get pods
stern -n intelgraph assistant
kubectl -n intelgraph rollout status deploy/assistant-api
kubectl -n intelgraph rollout undo deploy/assistant-api
```

**Redis**

```bash
redis-cli -u $REDIS_URL INFO
redis-cli -u $REDIS_URL KEYS 'rl:assistant:*'
```

**Neo4j**

```bash
cypher-shell -a $NEO4J_URI -u $NEO4J_USER -p $NEO4J_PASSWORD "MATCH (n) RETURN count(n) LIMIT 1;"
```

**Postgres**

```bash
psql $DATABASE_URL -c "SELECT count(*) FROM assistant_audit;"
```

---

## 8) Appendices

### A) DSAR / Erasure snippets

**Neo4j suggestions by user**

```cypher
MATCH (u:User {id:$userId})-[:MADE_REQUEST]->(r:Request)<-[:DERIVED_FROM]-(s:AISuggestion)
DETACH DELETE s;
```

**Postgres audit by user**

```sql
DELETE FROM assistant_audit WHERE user_id = $1;
```

### B) Constraint & index reference

```cypher
CREATE CONSTRAINT IF NOT EXISTS ON (r:Request) ASSERT r.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS ON (s:AISuggestion) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS ON (e:Entity) ASSERT e.name IS UNIQUE;
// Optional vector index
CREATE VECTOR INDEX entity_name_emb IF NOT EXISTS
FOR (e:Entity) ON (e.nameEmbedding)
OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'cosine' } };
```

### C) Known good defaults

* Transport: `fetch`
* Cache TTL: 60s (burst control)
* Rate limit: 60 req/min per user per tenant
* Breaker: 50% error threshold, 5s reset timeout

---

## 9) Post‑incident Template

**Summary**: (what happened)

**Impact**: (tenants/users, duration)

**Timeline**: (all times UTC)

**Root cause**: (technical + organizational)

**Mitigations applied**: (what we changed)

**Actions**:

* [ ] Preventative fix 1
* [ ] Preventative fix 2
* [ ] Monitoring/alert change
* [ ] Documentation/training

**Follow‑ups** (owner, due date):

* @.github/CODEOWNERS – item – YYYY‑MM‑DD

---

> Keep this file updated. When an alert fires without a clear path, **add a new runbook section** so the next engineer moves faster.
