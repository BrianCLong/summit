# Summit GA Rollback Plan

**Canonical rollback authority**: `release-rollback.yml` GitHub Actions workflow
(Actions → Release Rollback → Run workflow)

---

## When to Roll Back

| Signal | Threshold | Action |
|--------|-----------|--------|
| Production error rate | > 2% sustained 10m | Immediate rollback |
| API p95 latency | > 2s sustained 10m | Immediate rollback |
| Data corruption detected | Any | Immediate rollback |
| Security breach confirmed | Any | Immediate rollback |
| Canary SLO breach | Error > 1% or latency p95 > 1s × 2 intervals | Freeze + rollback |

See `LAUNCH_CHECKLIST.md` for the full go/no-go gate criteria.

---

## Rollback Methods

### Method 1 — GA Release Rollback Workflow (preferred)

Trigger via GitHub Actions UI or `gh` CLI:

```bash
gh workflow run release-rollback.yml \
  -f tag=vX.Y.Z \
  -f reason="<description of failure, min 18 chars>" \
  -f create_issue=true \
  -f dry_run=false
```

**Dry-run first** to confirm which previous tag will be restored:

```bash
gh workflow run release-rollback.yml \
  -f tag=vX.Y.Z \
  -f reason="Dry-run validation of rollback path" \
  -f dry_run=true
```

This workflow:
1. Validates the GA tag format and finds the previous stable tag
2. Requires `hotfix-release` environment approval (break-glass gate)
3. Deletes the bad Git tag and GitHub release
4. Creates a tracking issue
5. Uploads an audit report artifact

**Script**: `scripts/release/rollback_release.sh`

---

### Method 2 — Kubernetes / Helm (app-level)

```bash
# View release history
helm history summit -n summit

# Roll back to previous revision
helm rollback summit -n summit

# Roll back to specific revision number
helm rollback summit 3 -n summit

# Verify health after rollback
curl -sf https://<your-domain>/healthz && echo "HEALTHY"
```

See `docs/runbooks/ROLLBACK.md` for the full canary-rollback procedure.

---

### Method 3 — Docker Compose (if applicable)

```bash
# Re-pull prior image tag and force-recreate
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate
```

---

## Post-Rollback Checklist

- [ ] Confirm previous version is live: `curl -sf <url>/health`
- [ ] Run smoke test against previous version:
  ```bash
  BASE_URL=https://<your-domain> ./scripts/go-live/smoke-prod.sh
  ```
- [ ] Verify SLO recovery in Grafana dashboard
- [ ] Open incident ticket and attach rollback report artifact
- [ ] Disable any feature flags tied to failed release
- [ ] Notify on-call (#summit-ops) with timeline and previous version tag

---

## Data Migration Backout

For migration-related rollbacks, see `docs/runbooks/migrations-rollback.md`.

---

## Reference Runbooks

| Scenario | Runbook |
|----------|---------|
| Canary rollback | `docs/runbooks/ROLLBACK.md` |
| Rollback procedure (fast) | `docs/runbooks/rollback-procedure.md` |
| Migration rollback | `docs/runbooks/migrations-rollback.md` |
| Maestro orchestrator | `docs/runbooks/maestro-rollback.md` |
| Deployment runbook | `docs/runbooks/DEPLOYMENT_RUNBOOK.md` |
| GA runbook | `docs/runbooks/GA_RUNBOOK.md` |
