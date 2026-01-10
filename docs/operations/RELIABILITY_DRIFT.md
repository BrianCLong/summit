# Reliability Drift Detection

Reliability drift is detected through proactive signals, triaged automatically, and blocked from
shipping when patterns regress. Signals, rules, and locks must be versioned and testable.

## Drift Signals

- **Latency creep:** P95/P99 per critical path, tail inflation vs 4-week baseline, SLO burn spikes.
- **Error-rate creep:** 4xx/5xx per service, retry storms, user-facing failure ratios vs baseline.
- **Failover anomalies:** Replica election frequency, health-check flaps, dependency divergence.
- **Capacity/queue risk:** Queue depth trend, worker saturation, executor exhaustion.

## Signal Pipeline

1. **Collection:** Metrics and logs sampled at 1m/5m intervals with 7d/28d baselines.
2. **Detection:** Drift rules compare current signals to baseline and SLO thresholds.
3. **Classification:** Advisory vs Action based on threshold severity.
4. **Response:** Auto-triage actions and incident tickets.

## Auto-Triage Rules

- **Classification:**
  - **Advisory:** Informational; review in weekly Ops Review.
  - **Action:** Must be mitigated within SLA; blocks deploys if regression lock triggers.
- **Escalation thresholds:**
  - Latency: >10% P99 increase for 2 consecutive intervals → Action.
  - Error-rate: >0.5% absolute increase or SLO burn ≥1%/hour → Action.
  - Failover anomalies: ≥3 unplanned failovers/day or >2 consecutive health-check flaps → Action.

### Auto-Responses

- Capture request/trace samples and freeze deployment of impacted services.
- Create incident ticket with owner, suspected component, and rollback hint.
- Trigger synthetic checks against fallback paths.

## Regression Locks

- Maintain a catalog of known bad patterns with blocking rules (CI + runtime flags).
- Example patterns: missing circuit breakers, cache-bypass in hot paths, unbounded fan-out queries.

### Regression Lock Record Template

| Field        | Description                        |
| ------------ | ---------------------------------- |
| ID           | REL-LOCK-###                       |
| Pattern      | Description of the regression risk |
| Detection    | Test or synthetic monitor ID       |
| Scope        | Services or routes impacted        |
| Owner        | DRI                                |
| Escape Hatch | Owner + expiry + justification     |
| Verification | Evidence link                      |

## Verification & Reporting

- Daily report of triggered signals and responses summarized in the weekly Ops Review.
- New regression locks must include a test ID, owner, and verification method.
- Track Mean Time to Detect (MTTD) and Mean Time to Mitigate (MTTM); target continuous reduction.
