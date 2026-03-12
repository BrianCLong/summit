# Rollback Readiness Report

**Schema version**: 1.0.0
**Scope**: Summit Platform — GA Rollback Path Audit

---

## Rollback Surface Inventory

| Surface | Location | Status |
|---------|----------|--------|
| GA rollback workflow | `.github/workflows/release-rollback.yml` | PRESENT |
| Rollback script | `scripts/release/rollback_release.sh` | PRESENT |
| Rollback report writer | `scripts/release/write_rollback_report.sh` | PRESENT |
| Canary rollback playbook | `scripts/release/canary-rollback-playbook.sh` | PRESENT |
| Operator rollback plan | `rollback-plan.md` | PRESENT (updated) |
| Canary rollback runbook | `docs/runbooks/ROLLBACK.md` | PRESENT |
| Fast rollback procedure | `docs/runbooks/rollback-procedure.md` | PRESENT |
| Migration rollback | `docs/runbooks/migrations-rollback.md` | PRESENT |
| Maestro rollback | `docs/runbooks/maestro-rollback.md` | PRESENT |

---

## Rollback Workflow Validation

The `release-rollback.yml` workflow provides the canonical automated rollback path:

| Stage | What It Does | Gate |
|-------|-------------|------|
| `validate` | Checks tag format, finds previous stable tag | Hard fail if no previous tag |
| `approve` | Requires `hotfix-release` environment approval | Two-person approval required |
| `rollback` | Runs `rollback_release.sh --tag … --reason …` | Audited execution |
| `notify` | Logs rollback notification (Slack/Teams wired externally) | Best-effort |

**Dry-run supported**: `dry_run=true` input shows what would happen without executing.

---

## Manual Rollback Commands (by platform)

### Kubernetes / Helm

```bash
helm history summit -n summit                    # view revisions
helm rollback summit -n summit                   # roll back one revision
helm rollback summit <revision> -n summit        # roll back to specific revision
kubectl rollout status deployment/summit -n summit  # verify
```

### Docker Compose

```bash
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate
```

### Health Verification After Rollback

```bash
curl -sf https://<your-domain>/healthz && echo "LIVE"
curl -sf https://<your-domain>/readyz && echo "READY"
BASE_URL=https://<your-domain> ./scripts/go-live/smoke-prod.sh
```

---

## Rollback Rehearsal Checklist

The following can be rehearsed in dry-run mode before any GA release:

```bash
# 1. Dry-run the rollback workflow to verify it finds the correct previous tag
gh workflow run release-rollback.yml \
  -f tag=<current-ga-tag> \
  -f reason="Pre-release rollback rehearsal dry run" \
  -f dry_run=true

# 2. Confirm the rollback report artifact is produced

# 3. Confirm helm history shows a rollback target
helm history summit -n summit

# 4. Verify smoke script works against current deployment
BASE_URL=https://<your-domain> ./scripts/go-live/smoke-prod.sh
```

---

## Gaps Resolved in This PR

| Gap | Fix |
|-----|-----|
| `rollback-plan.md` was effectively empty | Replaced with full operator plan including workflow commands, helm, compose, and post-rollback checklist |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| No automated canary rollout + auto-rollback wiring in the GA pipeline | MEDIUM | Canary playbook exists (`canary-rollback-playbook.sh`) but not invoked from `release-ga-pipeline.yml` |
| `hotfix-release` env approval gate must have reviewers configured | MEDIUM | If not configured, rollback step auto-approves — confirm in repo Settings → Environments |
| Forward-only DB migrations cannot be rolled back via app rollback alone | HIGH | Requires `docs/runbooks/migrations-rollback.md` procedure and pre-deploy snapshot |
| Rollback notification is a placeholder (`echo` only) | LOW | Slack/Teams integration not wired — operators must manually notify |

---

## Determinism Note

This report reflects the state of the rollback surface as audited. It contains no timestamps.
Stamps belong in separate stamp files only.
