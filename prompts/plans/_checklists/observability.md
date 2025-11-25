# Observability & Analytics Checklist

> Acceptance criteria for Prompts 31-35

## Prompt 31: Unified Metrics Taxonomy

- [ ] Metrics catalog documented with all metric definitions
- [ ] Naming conventions enforced across codebases
- [ ] Language adapters working in TS, Python, Go
- [ ] Dashboards show consistent metrics
- [ ] No high-cardinality violations
- [ ] Migration from old naming complete
- [ ] Documentation updated

## Prompt 32: Distributed Tracing Rollout

- [ ] End-to-end traces visible for critical flows
- [ ] Context propagates across all services (HTTP, gRPC, Kafka)
- [ ] Sampling meets requirements
- [ ] Performance overhead < 2%
- [ ] Trace UI accessible to developers
- [ ] Trace-log-metric correlation working
- [ ] Exemplars on key metrics

## Prompt 33: Log Management and Retention

- [ ] Log volume reduced by target %
- [ ] Retention policy implemented (hot/warm/cold)
- [ ] Cost within budget
- [ ] Compliance requirements met
- [ ] Query performance acceptable
- [ ] Archival pipeline functional
- [ ] Restoration process tested

## Prompt 34: Real-time Analytics for Demos

- [ ] Demo dashboards render in CI/demo environment
- [ ] Data latency < 2 seconds end-to-end
- [ ] Demo data is realistic and PII-free
- [ ] Works with 100 concurrent viewers
- [ ] Documented demo playbook created
- [ ] Fallback options available
- [ ] Seed data scripts functional

## Prompt 35: Anomaly Detection Pilot

- [ ] Anomalies detected in simulated scenarios
- [ ] False positive rate < target (5%)
- [ ] Alerts include explanations
- [ ] Feedback mechanism works
- [ ] Documentation complete
- [ ] Tuning process defined
- [ ] Integration with alerting system

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| SRE Lead | | | |
| Observability Engineer | | | |
| On-Call Manager | | | |
