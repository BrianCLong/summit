# IntelGraph — GA Go/No‑Go Checklist

**Release:** v1.0.0 (GA)  
**Decision Date:** 2025‑09‑17  
**Owners:** MC · SRE Lead · Security Lead · Product

---

## 1) Decision Summary
**Recommendation:** **GO** for GA cutover.  
**Basis:** P0–P6 evidence complete; SLOs met under k6 peak; security, privacy, provenance, cost guardrails enforced; DR drills pass.

---

## 2) Final Readiness Checklist
_Status: ✅ Pass · ⚠️ Risk Accepted · ❌ Blocker_

| Area | Gate | Target / Policy | Evidence | Status |
|---|---|---|---|---|
| SLOs — API Reads | p95 ≤ 350 ms; p99 ≤ 900 ms | k6: scenario‑peak | `artifacts/k6/peak-report.json` | ✅ |
| SLOs — API Writes | p95 ≤ 700 ms; p99 ≤ 1.5 s | k6: scenario‑writes | `artifacts/k6/writes-report.json` | ✅ |
| Subscriptions | server→client p95 ≤ 250 ms | k6: scenario‑subs | `artifacts/k6/subs-report.json` | ✅ |
| Graph Ops (Neo4j) | 1‑hop p95 ≤ 300 ms | PROFILE plans | `artifacts/neo4j/1hop-profiles/` | ✅ |
| Graph Ops (Neo4j) | 2–3 hop p95 ≤ 1,200 ms | PROFILE plans | `artifacts/neo4j/3hop-profiles/` | ✅ |
| Error Budget — API | ≤ 0.1% monthly | SLO burn calc | `dashboards/slo/api.json` | ✅ |
| Error Budget — Ingest | ≤ 0.5% monthly | SLO burn calc | `dashboards/slo/ingest.json` | ✅ |
| Persisted Queries | Allowlist enforced | Hashes only | `evidence/graphql/pq-allowlist.csv` | ✅ |
| Response Cache | Per‑tenant isolation | Cross‑tenant probes fail | `evidence/cache/tenant-isolation.log` | ✅ |
| Policy Reasoner | OPA default‑deny; decision logs on | Bundle + logs | `evidence/opa/decision-logs/` | ✅ |
| Privacy | PII → `short-30d` | Audit sample | `evidence/privacy/retention-audit.md` | ✅ |
| Licensing | Counters + violations | Alerts wired | `evidence/licensing/alerts.json` | ✅ |
| WebAuthn Step‑Up | Success ≥ 99.5% in ≤2 tries | Auth metrics | `dashboards/auth/webauthn.json` | ✅ |
| Supply Chain | SLSA3 gate; round‑trip proof | verify‑bundle | `evidence/provenance/verify-bundle.log` | ✅ |
| Vulnerability Scans | No High/Critical | SBOM + scan | `evidence/sbom/scan-report.sarif` | ✅ |
| Cost Guardrails | 80% alerting; forecast ≤ cap | FinOps board | `dashboards/cost/burn-forecast.json` | ✅ |
| DR Drill | Replica failover pass | RPO ≤ 5m, RTO ≤ 10m | `evidence/dr/failover-report.md` | ✅ |
| Change‑Freeze | Window active; bypass dual‑approved | Provenance ledger | `evidence/change-freeze/events.jsonl` | ✅ |
| Runbooks | Deploy/Upgrade, On‑Call, DB care, IR | Versioned | `runbooks/*` | ✅ |

---

## 3) Preconditions for T‑0 Cutover
1. Canary config prepared (10% → 50% → 100%) with auto‑rollback on SLO breach.  
2. Redis namespaces pre‑warmed for persisted queries + response cache.  
3. `verify-bundle` attestation IDs recorded for release artifacts.  
4. Baseline dashboards exported (latency, errors, cost, auth, policy, cache, Neo4j).

---

## 4) Rollback / Stop‑Ship Triggers
- SLO burn rate > 2× target for ≥ 10 minutes.  
- WebAuthn failure rate > 0.5% or median auth time > 1.5 s.  
- Policy deny spikes on critical operations (>0.2% of requests).  
- Cost burn forecast > 90% of monthly cap.  
**Action:** Auto‑rollback to `v1.0.0-rcN`; set OPA/WebAuthn enforce → monitor; thaw caches; preserve provenance logs.

---

## 5) Validation Commands (Quick‑Run)
```
# Persisted queries (hash allowlist)
curl -s -H 'X-PQ-Hash: $(cat hash.txt)' https://api.intelgraph.example/graphql -d @op.json | jq .

# Cache tenant isolation probe (should FAIL cross‑tenant)
./scripts/probes/cache-tenant-isolation.sh --from tntA --to tntB

# Neo4j profile sanity
cypher-shell -u neo4j -p ***** \
  "PROFILE MATCH (n:Entity {id:$id})-[:REL*1..3]->(m) RETURN count(m)" --param id=123 | tee artifacts/neo4j/profile.txt

# verify-bundle SLSA3
verify-bundle verify --bundle dist/release.bundle --policy slsa3.yaml --require-roundtrip --strict

# k6 peak gate
k6 run k6/scenario-peak.js --out json=artifacts/k6/peak-report.json
```

---

## 6) Approvals
- **MC:** ✅  
- **SRE Lead:** ✅  
- **Security Lead:** ✅  
- **Product:** ✅

---

## 7) Notes / Waivers
- None blocking GA. Minor: policy UI lag on large rule diffs; tracked for Sprint 27.

