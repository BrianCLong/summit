# Performance & Reliability Checklist

> Acceptance criteria for Prompts 17-25

## Prompt 17: Cross-subsystem Performance Benchmark Suite

- [ ] Benchmark harness implemented for TS, Python, Go
- [ ] 3-5 microbenchmarks per subsystem defined
- [ ] Baseline results captured and committed
- [ ] Results reproducible within 5% variance
- [ ] CI integration complete
- [ ] Performance delta report template created
- [ ] Documentation covers setup and interpretation

## Prompt 18: Hot Path Profiling

- [ ] Profiling strategy documented
- [ ] Production-like flows instrumented
- [ ] CPU/memory profiles collected
- [ ] Top-5 hotspots documented with evidence
- [ ] At least 3 proposed refactors with validation plans
- [ ] Profiling can run without production impact
- [ ] Before/after comparison methodology defined

## Prompt 19: Concurrency and Load Testing

- [ ] All scenario types defined (smoke, load, stress, spike, soak)
- [ ] Load tests run successfully in CI
- [ ] Results visible in dashboard
- [ ] SLI thresholds defined and enforced
- [ ] Capacity limits documented
- [ ] Regression detection implemented

## Prompt 20: Caching and Memoization Strategy

- [ ] Cache layers defined (local, distributed)
- [ ] Cacheable operations matrix created
- [ ] Cache key strategy documented
- [ ] Invalidation policy implemented
- [ ] Cache hit rate meets targets (>70%)
- [ ] Latency reduction demonstrated
- [ ] Memory usage within budget

## Prompt 21: Resource Utilization Budgeting

- [ ] All services have defined resource limits
- [ ] Quotas enforced in staging/production
- [ ] Autoscaling tested under load
- [ ] Cost projections documented
- [ ] Alert on quota exhaustion implemented
- [ ] Emergency override process documented

## Prompt 22: Observability-Driven Reliability

- [ ] SLOs defined for critical user journeys
- [ ] Alerts trigger on simulated faults
- [ ] Dashboards show burn rate and trends
- [ ] Runbooks linked to alerts
- [ ] Trace-log-metric correlation works
- [ ] Error budget tracking implemented

## Prompt 23: Build Artifact Optimization

- [ ] Artifact sizes reduced by target %
- [ ] Build times reduced by target %
- [ ] Reproducible builds verified
- [ ] CI pipeline updated with caching
- [ ] No functionality regressions
- [ ] Size budgets enforced

## Prompt 24: Canary Deployments and Rollback

- [ ] Canary deployment works in staging
- [ ] Rollback completes in < 2 minutes
- [ ] Metrics guardrails prevent bad deploys
- [ ] Feature flags integrate with canary
- [ ] Runbook documents all procedures
- [ ] At least one service using canary

## Prompt 25: Dependency Hygiene

- [ ] All critical vulnerabilities patched
- [ ] No deprecated packages in use
- [ ] Lockfile deduplicated
- [ ] Size budgets enforced in CI
- [ ] Upgrade plan documented
- [ ] Transitive dependency controls in place

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform Lead | | | |
| Performance Engineer | | | |
| QA Lead | | | |
