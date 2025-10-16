# Post-Release Review — {{GA_TAG}}

**Window:** first 7 days post-GA  
**Owners:** Release Captain, SRE on-call, Service owners

## SLO Review

- p95 latency (target 1.5s): _actual_ → trend
- Error rate < 1%: _actual_ → trend
- Burn-rate alerts: count, false positive rate, tuning actions

## Reliability

- Incidents: list & links
- Rollbacks: none/summary
- Autoscaling: did it trigger as expected?

## Security

- New Trivy findings since GA: list & action plan
- SBOM drift vs. RC: notable changes?

## Cost

- Spend deltas vs. baseline; “downshift” opportunities

## Action Items

- [ ] Tune alert thresholds/windows
- [ ] Reduce noisy labels in metrics/logs
- [ ] Backlog follow-ups (owners/dates)
