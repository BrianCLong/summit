# Chaos Engineering & Resilience Verification Playbook

## Failure Scenarios Catalog

### Infrastructure failures

- **Single node loss:** Random termination or cordon/drain of one worker node to validate pod rescheduling, workload anti-affinity, and autoscaling thresholds.
- **Zone/availability domain loss:** Disable a failure domain (taint/block scheduling, shut down nodes, or simulate AZ network isolation) to confirm multi-AZ placement, quorum durability, and degraded capacity handling.
- **Dependency outage:** Blackhole or throttle outbound calls to core dependencies (databases, object storage, message bus, identity provider) to verify retry/backoff, circuit breaking, and fallback behavior.

### Application-level failures

- **Latency spikes:** Inject p95/p99 latency into selected services or endpoints to validate SLO alerts, timeouts, and client-side degradation patterns (e.g., graceful feature disablement).
- **Error storms:** Force elevated HTTP 5xx / gRPC error rates or throw exceptions in key code paths to exercise circuit breakers, bulkheads, and load shedding.
- **Partial data unavailability:** Make specific tables/collections/feature flags unavailable (e.g., read-only mode, row-range denial) to confirm stale-cache fallbacks, degraded UX, and reconciliation once restored.

### Control-plane failures

- **Orchestration issues:** Pause or slow Kubernetes controllers/schedulers, or block writes to etcd, to ensure workloads continue serving from existing pods and that drift is detected by watchdogs.
- **Identity & policy engines:** Disable token issuance/refresh, revoke OPA sidecar connectivity, or serve deny-all policies to confirm cached credentials behavior and emergency break-glass access.
- **Config/feature flag delivery:** Delay or corrupt config rollouts to validate rollback safety, default-safe values, and monitoring for config-induced outages.

## Experiment Mechanics

### Definition, schedule, and scope

- **Templates:** Standardize experiments as YAML ("Resilience Experiment Library") with target service(s), failure mode, blast radius, guardrails, and expected outcomes.
- **Scheduling:**
  - **Pipelines:** Run lightweight experiments on every main-branch canary deploy and nightly in non-prod (e.g., chaos namespace).
  - **Calendar:** Publish a quarterly game day calendar with service owners, rotating focus on top Sev1 risks.
- **Scoping:** Tag experiments by environment (dev/stage/canary/prod), tenant (shared vs. dedicated), and dependency class (data plane vs. control plane).

### Safety controls

- **Blast-radius limits:** Time-bound experiments; limit to a subset of nodes/pods/requests (traffic sampling or namespace-scoped fault injection).
- **Auto-stop conditions:** Abort on SLO burn-rate > 2x baseline, error budgets exhausted, pager alerts firing, or manual red-button invocation (Slack command).
- **Change windows:** Only run in approved windows with on-call + service owner acknowledgment; use feature-flagged toggles to disengage faults instantly.

### Data collection and success criteria

- **Observability:** Capture distributed traces, request/error rates, saturation, queue depths, and leader elections. Persist experiment metadata (start/end, scope, blast radius, toggles) to a ledger for auditability.
- **User impact:** Monitor synthetic checks and real-user telemetry segmented by tenant; require no Sev1/Sev2 impact in non-prod and zero customer impact in prod experiments.
- **Success vs. regression:**
  - Success: steady-state SLOs hold, auto-remediation triggers as designed, recovery < agreed RTO, no data loss/integrity issues, alerts fire with correct severity.
  - Regression: SLO breach, recovery exceeds RTO/RPO, alerts missing or noisy, or manual intervention required beyond runbook.

## Game Days & Automation

- **Cadence:** Monthly cross-team game day per pillar (app, infra, control plane) plus quarterly full-stack scenario (e.g., zone loss with dependency outage).
- **Participants:** Service owners, SRE/on-call, incident commander, observability lead, and business rep for customer impact review. Assign a facilitator and scribe.
- **Automation:**
  - Embed critical experiments into CI/CD canary pipelines using fault-injection controllers (e.g., Chaos Mesh, Litmus, Envoy fault filters) with opt-in labels per service.
  - Use scheduled chaos cronjobs in non-prod and policy-enforced caps in prod.
  - Automatically create incident tickets when abort conditions trigger; attach dashboards, logs, and experiment metadata.
- **DR & incident response integration:**
  - Map each scenario to DR drills (backup restore, traffic failover, config rollback) and ensure runbooks are referenced and exercised.
  - Update runbooks after every game day with lessons learned, remediations, and new guardrails.

## Resilience Experiment Library v0 (outline)

- **Catalog index:** YAML/JSON registry with experiment IDs, owners, environments allowed, and risk tier.
- **Common primitives:** Fault types (kill, delay, error, DNS blackhole, resource pressure), scopes (pod, node, AZ, service dependency), and guardrails.
- **Service packs:**
  - **Data layer:** DB primary failover, read-replica loss, storage throttle, cache eviction storms.
  - **Control plane:** OPA deny-all, token service outage, config rollout rollback.
  - **Edge/API:** Gateway latency injection, TLS termination restart, rate-limit misconfiguration.
  - **Async/queues:** Message bus partition, consumer slowdown, DLQ growth alarm.
- **Templates:** Reusable YAML with `steady_state`, `attack`, `metrics`, `abort_conditions`, `rollback`, `owner`, and `review_date` fields.

## Example Experiment Spec: "Kill a Region's DB Read Replicas"

```yaml
id: db-read-replica-regional-loss
service: orders-db
environment: stage
risk_tier: medium
steady_state:
  - p99_read_latency_ms < 120
  - read_error_rate_pct < 1
attack:
  - action: disable
    target: db_read_replicas
    scope: region-us-east-1
    method: rds:stop_instances
blast_radius: max 30% of read traffic (use proxy routing rule)
guardrails:
  - abort_if: read_error_rate_pct > 5 for 3m
  - abort_if: slo_burn_rate > 2x for 5m
metrics:
  - name: read_latency_p99
  - name: replica_lag_seconds
  - name: failover_events
observability: dashboards/db-read-path, traces/orders-read
rollback:
  - action: restart_instances
  - action: reset_proxy_routing to all regions
expected_outcome:
  - read traffic fails over to remaining regions within 60s
  - no write amplification or stale reads observed
owner: data-platform
review_date: 2026-01-15
```

## Resilience Verification Checklist

A service is **resilience-verified** when:

- [ ] SLOs and error budgets defined with steady-state metrics and alerting wired to on-call.
- [ ] Runbooks exist for top failure modes (data, control plane, edge) and are exercised quarterly.
- [ ] At least one chaos experiment per risk tier is automated in CI/canary; abort hooks tested.
- [ ] Game day participation includes service owner, on-call, and business stakeholder; findings are documented and remediations tracked.
- [ ] DR drills (backup restore, failover, config rollback) run at least semiannually with success criteria met.
- [ ] Observability coverage includes traces, metrics, logs, and synthetic checks scoped per tenant.
- [ ] Config/feature flags default to safe values and can be rolled back independently of code deploys.
- [ ] Access and policy controls support break-glass with auditing.
- [ ] Recent experiments show recovery within agreed RTO/RPO and no data integrity issues.
- [ ] All remediation items from the last two game days are closed or have owners/due dates.
