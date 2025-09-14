# Shared Sections (paste into each PR body)

## Risk & Rollback

- Risk: runtime/build changes; Helm rollout misconfig
- Mitigation: 10% canary; SLO gate; auto‑rollback; feature flags default off
- Rollback: `just rollback`; revert image tag; database PITR if migration fails

## Evidence to attach

- Prometheus charts (p95, error rate)
- Argo Rollouts screenshot (steps/weights)
- CI logs showing SLO gate & policy checks

## Commands (operator)

```bash
# ensure scripts executable
chmod +x scripts/*.sh scripts/*.py || true
# dry-run pipeline locally if supported
just build-all && just test-unit && just test-contract
```

---

## Tracking

- Milestone: Sprint 2025‑09‑15
- Labels: canary, migration, risk:high, needs:arch-review, compliance

> Note: All paths and counts validated from the uploaded repo (60 Dockerfiles, 49 charts, 273 workflows, 66 Rego policies).
