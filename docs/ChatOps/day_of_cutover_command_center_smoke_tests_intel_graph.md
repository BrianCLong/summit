# IntelGraph — Day‑of Cutover Command Center (One‑Pager) & Smoke Tests

> Date: T‑Day • Timezone: America/Denver (MDT) • War Room: `#intelgraph-go-live` • Source of Truth: this doc

---

## A) Command Center (One‑Pager)

**Roles**  
**IC** (Incident Commander) • **RM** (Release Manager) • **SRE‑API** • **SRE‑Stream** • **DB/Graph** • **SecOps** • **QA** • **Comms**

**Golden KPIs (SLO acceptance gates)**

- API Gateway p95 ≤ **150 ms**, error rate < **0.1%**
- Graph Queries p95 ≤ **1200 ms** on canary workloads
- Stream E2E p95 ≤ **1 s**; consumer lag steady; **0** data loss
- Auth success ≥ **99.9%**; RBAC/ABAC decisions consistent

**Rollback Triggers (any sustained 10 min)**

- 5xx ≥ **0.2%**, or overall error ≥ **0.5%**
- API p95 > **250 ms** or Graph p95 > **2 s**
- Consumer lag spikes > **5×** baseline or offset gaps detected
- Auth anomalies > **0.2%** or audit signer failures

### Hour‑by‑Hour Timeline (T‑Day)

| Time (MDT) | Owner      | Action                                                                             | Entry Criteria                  | Exit Criteria                         |
| ---------- | ---------- | ---------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------- |
| **T‑60**   | RM/IC      | Announce change window; **freeze** non‑cutover deploys; roll‑call                  | All on‑call present; comms open | War room active; status set “Cutover” |
| **T‑50**   | DB/Graph   | Create PITR markers; verify snapshots; check replication health                    | Green env healthy               | Markers recorded; checksums pass      |
| **T‑45**   | SRE‑API    | Pre‑scale green; verify `/readyz` & `/healthz`; warm caches                        | Autoscaler ready                | Healthy, 0 errors                     |
| **T‑40**   | SRE‑Stream | Verify brokers/consumers healthy; set canary topic; enable shadow traffic          | Brokers OK; lag nominal         | Shadow traffic OK                     |
| **T‑30**   | SecOps     | Confirm ABAC/OPA **ENFORCING**; persisted queries **REQUIRED**; cost guards **ON** | Policy bundles loaded           | Audit signer green                    |
| **T‑25**   | QA         | Run **Pre‑Cutover Smoke** (Section B.1) against green                              | Token valid                     | All checks pass                       |
| **T‑15**   | IC         | Final **Go/No‑Go** checkpoint                                                      | All previous steps green        | Approved to proceed                   |
| **T‑10**   | RM         | Start **blue drain**; Traefik weight 10/90 (blue/green)                            | Users stable                    | No error spike                        |
| **T‑5**    | DB/Graph   | Final sync delta; confirm no schema drift                                          | Low write window                | Delta applied                         |
| **T‑0**    | RM         | Flip to **green 100%**; record timestamp; unfreeze writes                          | Weights 0/100                   | Traffic stable                        |
| **T+5**    | QA/SRE     | Run **Post‑Cutover Smoke** (Section B.1) + **k6 canary** (Section B.2)             | Cutover complete                | Thresholds met                        |
| **T+15**   | SRE‑Stream | Validate lag & throughput; verify **0** loss; metrics snapshot                     | Consumers stable                | Within limits                         |
| **T+30**   | Comms      | Status page: “Operational”; stakeholder note; lift maintenance banner              | KPIs green                      | Update sent                           |
| **T+45**   | SecOps     | Verify audit signer & notarization; review auth error budget                       | Logs validating                 | Green                                 |
| **T+60**   | IC         | Sign‑off ✅; enter heightened watch (24h); keep v2.x hot (48h)                     | All green                       | Handoff to BAU                        |

**Comms Cadence**: every 30 min; incident escalation per matrix.  
**Evidence Capture**: save command outputs to `docs/releases/phase-3-ga/post-cutover/` with timestamps.

---

## B) Smoke Tests & Canary Load

### B.1 Quick Smoke (bash, ~2–3 min)

> Set env once, then run checks. Captures evidence to `./post-cutover/`.

```bash
#!/usr/bin/env bash
set -euo pipefail
# === Config ===
export BASE_URL="https://green.intelgraph.example.com"   # Traefik green
export API_URL="$BASE_URL/api"
export GQL_URL="$BASE_URL/graphql"
export METRICS_URL="$BASE_URL/metrics"
export TOKEN="REDACTED_JWT"                               # OIDC token
export PERSISTED_ID="op:healthQuery:v1"                   # sample persisted op
export NEO4J_URI="https://neo4j.intelgraph.example.com:7473"
export NEO4J_USER="neo4j"; export NEO4J_PASS="REDACTED"
export KAFKA_BROKER="kafka-0.intelgraph:9092"
export TOPIC_CANARY="canary.cutover"
TS=$(date -u +"%Y%m%dT%H%M%SZ")
mkdir -p ./post-cutover/$TS
log(){ echo "[$(date +%T)] $*" | tee -a ./post-cutover/$TS/steps.log; }

# 1) Liveness/Readiness
log "Health checks"
curl -fsSL "$BASE_URL/healthz" -o ./post-cutover/$TS/healthz.json
curl -fsSL "$BASE_URL/readyz" -o ./post-cutover/$TS/readyz.json

# 2) API Gateway p95 spot probe (latency print)
log "API spot latency"
for i in {1..10}; do curl -s -o /dev/null -w 'time_total=%{time_total}\n' \
  -H "Authorization: Bearer $TOKEN" "$API_URL/ping"; done | tee ./post-cutover/$TS/api_ping.lat

# 3) GraphQL persisted query (must be enforced)
log "GraphQL persisted query"
curl -fsS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"id\":\"$PERSISTED_ID\",\"variables\":{}}" "$GQL_URL" \
  | tee ./post-cutover/$TS/gql_persisted.json > /dev/null

# 4) AuthZ sanity (role requires ABAC allow)
log "AuthZ ABAC check (expect 200)"
curl -fsS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
  "$API_URL/secure/allowed" | tee ./post-cutover/$TS/abac_allowed.code

log "AuthZ ABAC negative (expect 403)"
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
  "$API_URL/secure/denied" | tee ./post-cutover/$TS/abac_denied.code

# 5) Neo4j graph probe (sample lightweight query)
log "Neo4j probe"
curl -fsS -u "$NEO4J_USER:$NEO4J_PASS" -H 'Content-Type: application/json' \
  -d '{"statements":[{"statement":"MATCH (n) RETURN count(n) AS c"}]}' \
  "$NEO4J_URI/db/neo4j/tx/commit" | tee ./post-cutover/$TS/neo4j_count.json > /dev/null

# 6) Kafka E2E canary (requires kcat)
log "Kafka canary produce/consume"
echo "{\"ts\":\"$TS\",\"kind\":\"cutover-canary\"}" | \
  kcat -P -b "$KAFKA_BROKER" -t "$TOPIC_CANARY"
# consume one message with 10s timeout
kcat -C -b "$KAFKA_BROKER" -t "$TOPIC_CANARY" -o -1 -e -q -c 1 -u \
  | tee ./post-cutover/$TS/kafka_canary.json

# 7) Metrics snapshots
log "Metrics snapshot"
curl -fsS "$METRICS_URL" > ./post-cutover/$TS/metrics.prom

log "SMOKE: DONE"

# === Acceptance (human read):
# API p95 spot should suggest < 150ms (see k6 for authoritative 95th)
# GQL persisted op returns 200 + valid payload
# ABAC allowed=200, denied=403
# Neo4j returns count payload (no errors)
# Kafka canary returns last message
# Metrics file present, with no critical alerts raised
```

**Expected thresholds (accept/reject)**:

- API p95 **≤ 150 ms**; Graph p95 **≤ 1200 ms**; error rate **< 0.1%**
- No `rate_limit_exceeded` spikes; no `audit_signer_fail_total` > 0
- `stream_processed_total` increasing; `consumer_lag` within 1.5× baseline

---

### B.2 k6 Canary (HTTP APIs)

> 2 scenarios: Gateway ping & GraphQL persisted op. Duration short but statistically meaningful.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  thresholds: {
    http_req_failed: ['rate<0.001'], // <0.1%
    'http_req_duration{scenario:gateway}': ['p(95)<150'],
    'http_req_duration{scenario:gql}': ['p(95)<1200'],
  },
  scenarios: {
    gateway: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'gateway',
    },
    gql: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'gql',
    },
  },
};

const BASE = __ENV.BASE_URL || 'https://green.intelgraph.example.com';
const TOKEN = __ENV.TOKEN || 'REDACTED_JWT';
const PERSISTED_ID = __ENV.PERSISTED_ID || 'op:healthQuery:v1';

export function gateway() {
  const res = http.get(`${BASE}/api/ping`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  check(res, { 200: (r) => r.status === 200 });
  sleep(0.1);
}

export function gql() {
  const payload = JSON.stringify({ id: PERSISTED_ID, variables: {} });
  const res = http.post(`${BASE}/graphql`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  check(res, { 200: (r) => r.status === 200 });
  sleep(0.1);
}
```

**Run:**

```bash
k6 run -e BASE_URL=$BASE_URL -e TOKEN=$TOKEN -e PERSISTED_ID=$PERSISTED_ID ./k6_canary.js \
  | tee ./post-cutover/$(date -u +%Y%m%dT%H%M%SZ)/k6_canary.out
```

---

### B.3 Rollback Macro (operator quick‑switch)

> Use only if rollback triggers fire for ≥10 min or a Sev‑1 emerges.

```bash
#!/usr/bin/env bash
set -euo pipefail
log(){ echo "[$(date +%T)] $*"; }
log "🔄 Initiating rollback to BLUE (v2.x)"
# 1) Route flip
kubectl -n edge annotate ingress traefik.ingress.kubernetes.io/service-weights \
  "blue=100,green=0" --overwrite
# 2) Freeze writes (temporary), then re‑enable after stability
curl -fsS -X POST "$API_URL/admin/write-freeze?enable=true" -H "Authorization: Bearer $TOKEN"
# 3) Broadcast status
log "Posting status to #intelgraph-go-live"; # (use chatops command here)
# 4) Verify health on BLUE
curl -fsS "$BASE_URL_BLUE/readyz" >/dev/null && log "Blue ready"
# 5) Unfreeze writes
curl -fsS -X POST "$API_URL/admin/write-freeze?enable=false" -H "Authorization: Bearer $TOKEN"
log "Rollback complete; continue incident response and root‑cause."
```

---

## C) Evidence Checklist (fill during T+ window)

- [ ] Save all smoke/k6 outputs under `docs/releases/phase-3-ga/post-cutover/`
- [ ] Screenshot SLO dashboards (API, Graph, Streams) at T+5, T+15, T+30, T+60
- [ ] Export Prometheus snapshots; attach to ticket
- [ ] Create after‑action note if any threshold breached (even transient)

> **Success Definition:** All thresholds met; no Sev‑1/Sev‑2; zero data loss; stakeholders notified; status “Operational”; v2.x remains hot for 48h.
