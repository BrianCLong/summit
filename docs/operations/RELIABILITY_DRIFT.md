# Reliability Drift Detection

Reliability drift is detected through proactive signals, triaged automatically, and blocked from shipping when patterns regress. Signals, rules, and locks must be versioned and testable.

## Drift Signals

- **Latency creep:** P95/P99 per critical path, tail inflation vs 4-week baseline, and SLO burn rate spikes.
- **Error-rate creep:** 4xx/5xx per service, retry storms, and user-facing failure ratios vs baseline.
- **Failover anomalies:** Replica election frequency, health-check flaps, partial partition events, dependency health divergence.
- **Capacity/queue risk:** Queue depth trend, worker saturation, threadpool/executor exhaustion.

## Auto-Triage Rules

- Classify events as **Advisory** (informational, attach to weekly review) or **Action** (must be mitigated).
- **Escalation thresholds:**
  - Latency: >10% P99 increase for 2 consecutive intervals → Action.
  - Error-rate: >0.5% absolute increase or SLO burn ≥1%/hour → Action.
  - Failover anomalies: ≥3 unplanned failovers/day or >2 consecutive health check flaps → Action.
- **Auto-responses:**
  - Capture request/trace samples and freeze deployment of impacted services.
  - Create incident ticket with owner, suspected component, and rollback hint.
  - Trigger synthetic checks against fallback paths.

## Regression Locks

- Maintain a catalog of known bad patterns with blocking rules (CI and runtime feature flags).
- Example patterns: missing circuit breakers, disabled retries with no fallback, cache-bypass in hot paths, unbounded fan-out queries.
- **Process:**
  1. Add failing scenario to regression test or synthetic monitor.
  2. Add CI gate/feature flag that blocks deploy if triggered.
  3. Document escape hatch with explicit owner and expiration.

## Verification & Reporting

- Daily automated report of triggered signals and responses; summarized in the weekly Ops Review.
- New regression locks must include a test ID, owner, and verification method (synthetic, load test, or unit).
- Track Mean Time to Detect (MTTD) and Mean Time to Mitigate (MTTM) for all drift events; target continuous reduction.
