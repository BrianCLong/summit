# Summit GA First-Week Operations

This runbook defines the operational cadence, review criteria, and stabilization procedures for the first 7 days following the Summit GA launch.

## 📋 Launch-Phase Cadence

| Interval | Action | Success Criteria |
|----------|--------|------------------|
| **T+15m** | Post-Deploy Validation | `scripts/validate-summit-deploy.mjs` returns GREEN. |
| **T+1h** | Error Budget & Regression Check | `scripts/detect-ga-regressions.mjs` returns GREEN. |
| **T+4h** | Synthetic Traffic & Queue Review | No >2% consumption of error budget. |
| **T+12h** | Evidence Integrity Audit | All ledger entries signed and Merkle-verified. |
| **Daily** | Morning Stand-up / Triage | P2+ issues reviewed; rollback window remains open. |
| **T+7d** | Stabilization Sign-off | Golden Main frozen; release declared "Mature". |

---

## 🔍 Critical Signals to Watch

### 1. Error Rate Spike (Service Mesh)
- **Dashboard**: [Production SLO Dashboard](http://localhost:3001/d/production-slo)
- **Threshold**: Any service error rate > 1% over a 5m window.
- **Action**: Check logs for retry storms or database connection pool exhaustion.

### 2. Queue Growth (Ingest/Evidence)
- **Dashboard**: [Maestro Production Dashboard](http://localhost:3001/d/maestro-production)
- **Threshold**: `ingest_queue_depth` > 5,000 or `evidence_lag` > 15m.
- **Action**: Check `prov-ledger` health and Redis memory pressure.

### 3. Latency Drift (Graph Queries)
- **Dashboard**: [Collab Latency Dashboard](http://localhost:3001/d/collab-latency)
- **Threshold**: P95 query latency > 1,500ms.
- **Action**: Review Neo4j query plan cache and expensive NLU patterns.

---

## 🚦 Decision Matrix: Continue vs. Rollback

| Signal | Investigation Level | Rollback Threshold |
|--------|----------------------|--------------------|
| **Service Outage** | Immediate P0 | > 5m total downtime. |
| **Data Integrity** | Immediate P1 | Any evidence signature mismatch. |
| **Performance** | P2 (Wait/Watch) | P99 > 5s for > 15m. |
| **Security** | P0 | Any unauthorized write to audit ledger. |

**To Rollback**: Follow the [Rollback Procedure](docs/runbooks/rollback-procedure.md).

---

## 🛡️ First-Week Defense Controls

### Entropy Spike Mitigation
If AI model drift or "hallucinations" are detected in GraphRAG:
1. Enable `ephemeral_frame_detector` via Feature Flag (`ai_strict_mode: true`).
2. Revert `nl2cypher` to v3.x model if necessary.

### Cost Guardrails
Monitor [FinOps Dashboard](http://localhost:3001/d/finops-dashboard) daily.
- **Limit**: $500/day for LLM tokens during launch.
- **Action**: Apply token rate-limiting if budget is burned > 50% in first 6 hours.

---

## 📞 Escalation Path

1. **L1 Support**: SRE On-Call (Slack: #summit-ops)
2. **L2 Tech**: Domain Lead (Maestro/Switchboard/IntelGraph)
3. **L3 Management**: Release Captain (Refer to `GA_RELEASE_SUMMARY.md`)

---

*Verified for Summit GA Release 2026-03-09*
