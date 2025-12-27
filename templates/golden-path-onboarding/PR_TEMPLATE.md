# Golden Path Service Adoption PR

## Summary

- Service name:
- Owner:
- Golden Path workflow impact:

## SLOs (required)

- Availability target:
- Latency target (p95/p99):
- Error budget (window + burn rate):
- Measurement source (dashboards/metrics):

## Canary thresholds (required)

- Error rate threshold:
- Latency threshold:
- Saturation threshold:
- Rollback trigger:

## Alerting (required)

- Paging policy/link:
- Alert routes (team + channel):
- Alert thresholds:

## Runbook (required)

- Runbook link:
- On-call escalation:

## Disclosure/Evidence pack config (required)

- Evidence bundle location:
- Evidence checklist completed (yes/no):
- Policy decision log link:
- Release notes link:

## OPA policy gates

- Policy changes summary:
- Policy simulation results:

## Required checks

Reference [`docs/CI_STANDARDS.md`](../../docs/CI_STANDARDS.md) and ensure alignment
with `.github/workflows/ci.yml` and `.github/workflows/ci-golden-path.yml`.

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `make smoke`
- [ ] `node scripts/check-boundaries.cjs`

## Risks / Rollback

- Risk summary:
- Rollback plan:

## Evidence

- Example PR reference: [`docs/archive/root-history/PR_ANALYSIS.md`](../../docs/archive/root-history/PR_ANALYSIS.md)
