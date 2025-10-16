---
name: 'Ops: Weekly Release Train'
about: Cadenced checklist for safe weekly promotions
title: 'Ops: Weekly Release Train — week of {{date}}'
labels: ['ops', 'release-train', 'cadence:weekly', 'priority:normal']
assignees: []
---

## ✅ Definition of Ready

- [ ] Feature flags documented (defaults & rollout plan)
- [ ] Migration gate plan (if schema change)
- [ ] Observability additions merged (OTEL spans, metrics, logs)
- [ ] Security checks: SAST/SCA/SBOM green, 0 criticals
- [ ] Canary + rollback plan updated

## 🚦 Promotion Gates

- [ ] SLO dashboards **green** (p95 < 1.5s, error < 5%)
- [ ] `verify-images` gate passes (Cosign + SLSA)
- [ ] Preview env passes e2e + load smoke
- [ ] Helm/Terraform lint/plan clean

## 🚀 Deploy Steps

- [ ] Stage soak: `make stage`
- [ ] Canary: `make prod10` → verify → `make prod50` → verify → `make prod100`
- [ ] Evidence: `make evidence` + append run/digests to `audit/ga-core-evidence-pack.md`

## 🔎 Post-Deploy

- [ ] Flagger history reviewed
- [ ] No restart storms / probe flaps
- [ ] p95 + error trend panel checked (24h)
- [ ] Runbook updated if changes observed

> Owner on call: @assign-here
> Links: Grafana SLO | Flagger | Release notes
