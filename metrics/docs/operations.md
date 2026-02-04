# GMR Guardrail Operations

## Rollout Phases

1. **Observe-only:** Collect counters and baselines, no blocking.
2. **Soft gate:** Fail on missing metrics or zero GMR with non-zero CDC.
3. **Hard gate:** Enforce MAD-band drift; require migration notes for expected shifts.

## Gate Execution

- **Command:** `make gmr-gate`
- **Behavior:** Runs `metrics/scripts/run_gmr_gate.sh` against the latest completed window.
- **Output:** Deterministic evidence artifacts under `metrics/evidence/`.

## Alert Response

1. **Missing metrics:** Check CDC consumer lag and graph loader job health.
2. **CDC drop:** Validate connector throughput and upstream change rates.
3. **MAD drift:** Review schema registry and mapping rule changes.
4. **Hash-stable drift:** Treat as upstream/schema drift until proven otherwise.

## SLOs

- **Detection latency:** ≤ 1 window (hourly).
- **False positives:** < 1 per 1,000 windows per source after baseline warmup.

## Rollback Triggers

- Alert storm sustained for > 6 hours post-deploy.
- Gate failure rate > 5% across stable sources for 24 hours.

## Owner Routing

- **CDC pipeline:** Data ingestion team.
- **Graph loader:** Graph platform team.
- **Policy gate:** Governance/Release Captain.
