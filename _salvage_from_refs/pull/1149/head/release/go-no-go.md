# v24.0.0 Go/No-Go — Sign-offs
Date: ____  Time (America/Denver): ____

## Approvals
- Eng Lead v24: ____
- SRE On-Call: ____
- Security: ____
- Platform Arch: ____

## Gates
- [ ] CI green (tests, OPA, SBOM, vuln)
- [ ] k6 SLO suite within budgets
- [ ] Persisted queries frozen & deployed
- [ ] Alerts & dashboard applied
- [ ] Secrets validated in prod

## Risk Notes & Backout
- Canary plan: 10%→50%→100%
- Rollback: feature flag off + Helm rollback
