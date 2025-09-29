# IntelGraph GA War Room Kit

**Purpose:** One‑pager pack for coordinated GA cutover. Includes timeline, RACI, tenant ramp matrix, smoke tests, comms templates, and rollback switchboard.

---

## 1) Hour‑by‑Hour Timeline (GA Day‑0)
| T | Activity | Owner | Success Criteria | Artifacts |
|---|---|---|---|---|
| T−60m | Final go/no‑go, freeze PRs, verify SLSA attest + OPA bundle pin | Release Manager | All gates ✅ | CD logs, SBOM, attestation |
| T−45m | Cache pre‑warm: top‑50 APQ hashes (canary tenant) | Platform | Hit‑rate ≥ 85% | prewarm report |
| T−30m | DR readiness: PITR checkpoint + snapshot checksum | SRE | Snapshot OK | snapshot ID |
| T−20m | Incident channel + comms templates staged | IC | War room live | links posted |
| T−10m | Canary deploy (read‑only) | Release Manager | Health checks ✅ | deploy summary |
| T0 | Flip canary RW flag → R/W | Release Manager | p95 read ≤ 350 ms; write ≤ 700 ms for 10m | Grafana screenshot |
| T+10m | Ramp 10% traffic | SRE | Burn < 1×; DLQ < 0.1% | SLO panel |
| T+30m | Ramp 50% | SRE | Queues stable; step‑up ≥ 99% | authz panel |
| T+60m | Ramp 100% | SRE | All green 10m | Go/No‑Go panel |
| T+90m | Enable subscriptions | Platform | WS connects ≥ 99% | k6 endurance |
| T+120m | Sign‑off + customer notice | Exec + IC | StatusPage posted | link |

---

## 2) RACI & Contacts
| Function | R | A | C | I | Channel |
|---|---|---|---|---|---|
| Release | Release Manager | CTO | SRE, Security | All | #ga-warroom |
| SRE | SRE Lead | Platform Lead | Release, DB | All | #sre-oncall |
| Security | Sec Lead | CISO | SRE, Release | All | #sec-incidents |
| Data Gov | DGO | CTO | Product | All | #data-gov |

**On‑call handles:** PagerDuty services `intelgraph-api`, `intelgraph-neo4j`, `intelgraph-security`.

---

## 3) Tenant Canary/Control Matrix
| Tenant | Role | Dataset Sensitivity | Ramp Order | RW at T0? | Notes |
|---|---|---|---|---|---|
| `tenant-alpha` | Canary | Low/Medium | 1 | Read‑only → RW at T0 | Ideal synthetic load |
| `tenant-bravo` | Control | Medium | 2 | RW | Compare KPIs vs canary |
| `tenant-charlie` | General | Mixed | 3 | RW | Watch ER categories |

> Replace rows with real tenants and attach owner Slack handles.

---

## 4) Smoke & Health Checklist (10 minutes each step)
- **Gateway:** `200/2xx ≥ 99.9%`, p95 read ≤ 350 ms, p95 write ≤ 700 ms  
- **APQ:** pre‑warmed hashes hit‑rate ≥ 85%  
- **Neo4j Router:** read→replicas, write→primary; replica p95 spread < 15%  
- **ER:** ingress RPS steady, lag < 60 s, DLQ < 0.1%  
- **AuthZ/Security:** step‑up coverage ≥ 99% on high‑risk ops  
- **Provenance:** latest deploy verified (attestation+cosign)  
- **Costs:** telemetry sample mode = `normal` (no spikes)

**Command snippets**
```bash
# Health probe
curl -s $API_URL/healthz | jq .
# Top slow GraphQL ops (last 5m)
jq 'select(.latency_ms>700) | .op' /var/log/gateway/*.json | tail -n +1 | sort | uniq -c | sort -nr | head -20
# ER lag quick view
prom "max_over_time(queue_lag_seconds[5m]) by (category)"
```

---

## 5) Rollback Switchboard
**Triggers:** 3× consecutive 5‑min p95 breaches; ER lag > 120 s; DLQ > 0.5% (A/B); step‑up < 95%; provenance failure.

**Steps:**
1) **Stop ramp**: `kubectl -n edge scale deploy api-gateway --replicas=0`  
2) **Flags**: `canary_rw=false`, `adaptive_sampling_mode=high`, `apq_sticky_lru=true`  
3) **Helm rollback**: `helm rollback intelgraph <REV> -n prod --wait`  
4) **Cache**: invalidate volatile keys, pre‑warm read‑paths  
5) **DB router**: pin to stable replicas  
6) **Verification**: SLO panel green 10m, DLQ drain < 0.1%, provenance re‑verified

**Comms after rollback**: post incident note + customer status (minor/major template below).

---

## 6) Incident Comms Templates
**Internal (war room kick‑off)**
> *Incident start \[T\]* — Degraded performance on GA cutover. IC: <name>. Owners: Release, SRE, Security. Triggers: read p95 > 350 ms for 15m. Actions: pause ramp, enable sticky LRU, assess ER lag. Next update in 15m.

**Customer (minor degradation)**
> We observed elevated latency during GA cutover between **HH:MM–HH:MM Phoenix time**. No data loss or security impact. Mitigations applied; performance has stabilized. We continue to monitor.

**Customer (security gate)**
> A verification gate prevented an **unverified artifact** from deploying. No exposure occurred. We rebuilt and re‑verified the release before proceeding.

**Post‑GA summary**
> IntelGraph GA completed at **T+120m**. All SLOs green. Key metrics: read p95 **≤ 350 ms**, write p95 **≤ 700 ms**, ER DLQ **< 0.1%**. Full report attached.

---

## 7) Evidence Pack & Sign‑off
- Grafana screenshots: Go/No‑Go, API latencies, ER DLQ, step‑up coverage  
- CD logs: SLSA verify, SBOM scan, cosign verify  
- Drill artifacts: snapshot ID, replay checksum  
- Decision log: triggers observed, actions taken, outcomes

**Approvals:** Release Manager, SRE Lead, Security Lead, Product Owner.

---

## 8) Post‑GA Cadence (Day +1 → Day +7)
- Daily 15‑min *green bar* review; lock thresholds  
- Chaos "light": Redis blip (30s), router restart, OPA deny‑by‑default drill  
- Cost review: adaptive sampling → `normal`, confirm spend trend  
- Policy changes: run simulator on proposed diffs before merge  
- Prepare Week‑1 retrospective: SLO, incidents, cost, customer comms

---

## 9) War Room Board (To‑Do Columns)
- **Observe**: metrics/screenshots  
- **Hypothesize**: possible causes  
- **Act**: mitigations applied  
- **Verify**: SLO checks  
- **Document**: links, IDs, owners

> Keep this Kit printed and pinned. Update with real tenant names, owners, and links before T−60m.

