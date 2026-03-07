# Lane Promotion Runbook

## Prerequisites

- Config validated by policy engine (OPA) with no critical findings.
- Release artifact built + signed; SBOM attached.
- Observability baselines captured (latency, error rate, budget consumption).

## Steps

1. **Prepare**: ensure `lanes/<customer>/config.yaml` merged and ArgoCD sync paused.
2. **Canary Deploy**: set `canary.weight` (default 20%), sync ArgoCD, monitor for 30 minutes.
3. **Evaluate**: verify metrics within thresholds and privacy budgets not exceeded.
4. **Promote**: increase weight to 100% or scheduled rollout window. Update `audit.log` with evidence.
5. **Rollback**: if SLO burn or alerts, reduce weight to 0, revert ArgoCD to previous commit, capture incident ticket.
6. **Closeout**: archive metrics snapshot and share summary in #lane-releases.

## Validation Checklist

- [ ] Canary latency p95 within 5% of baseline
- [ ] Error rate delta <0.5%
- [ ] No policy violations (audit + OPA)
- [ ] Privacy budget remaining >20%
- [ ] Access accounting events streaming to ledger
