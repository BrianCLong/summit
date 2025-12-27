# Release Train — NOW / NEXT / LATER

_Date:_ <!-- fill when executed -->
_Owner:_ Release Captain

This plan turns the checklist into an executable release train with exact GitHub protections, required checks, and environment gates. Copy/paste the commands as-is after setting `OWNER`/`REPO`.

---

## TL;DR

- **Cadence:** Weekly release train (Thu 18:00 UTC) with on‑demand hotfix lane.
- **Gate order:** PR checks → Preview env → Stage (smoke + k6 + rollout gate) → **manual promote** → Prod (blue‑green) with auto‑rollback on SLO burn.
- **Reversibility:** Rollback is one command (`make rollout-undo` or `make rollout-pin`). DB migrations are held behind explicit gates.

---

## NOW (do today)

1. **Set GitHub repo variables**

```bash
export OWNER="<org_or_user>"
export REPO="<repo_name>"
```

2. **Protect `main` (branch protection + checks)**
   > Uses GitHub REST via `gh`. Run all blocks.

```bash
# Enable required signatures (signed commits)
gh api -X POST repos/$OWNER/$REPO/branches/main/protection/required_signatures

# Enforce admins on branch protection
gh api -X PUT repos/$OWNER/$REPO/branches/main/protection/enforce_admins

# Core protection: linear history, no force pushes/deletions, conversation resolution
cat > /tmp/protect.json <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "build",
      "unit-tests",
      "e2e-tests",
      "sast-codeql",
      "dependency-review",
      "sbom-generate",
      "trivy-image-scan",
      "helm-lint",
      "helm-template",
      "terraform-fmt-validate",
      "terraform-plan",
      "migrations-dry-run",
      "preview-deploy",
      "rollout-gate (staging)",
      "smoke-tests (staging)",
      "k6-slo (staging)",
      "slo-burn-rollback (staging)"
    ]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true
}
JSON

gh api -X PUT repos/$OWNER/$REPO/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -F required_status_checks=@/tmp/protect.json:required_status_checks \
  -F required_pull_request_reviews=@/tmp/protect.json:required_pull_request_reviews \
  -F restrictions=@/tmp/protect.json:restrictions \
  -F required_linear_history=true \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F block_creations=false \
  -F required_conversation_resolution=true
```

> **Note:** The `contexts` must match your workflow job names. If they differ, rename your jobs or edit the array accordingly (see “Required checks naming” below).

3. **Protect release tags and branches**

```bash
# Tag protections for semver tags like v1.2.3
gh api -X POST repos/$OWNER/$REPO/tags/protection -f pattern='v*'

# Protect release branches (e.g., release/*)
for BR in "release/*"; do
  gh api -X PUT repos/$OWNER/$REPO/branches/$BR/protection/enforce_admins || true
  gh api -X PUT repos/$OWNER/$REPO/branches/$BR/protection \
    -H "Accept: application/vnd.github+json" \
    -F required_linear_history=true -F allow_force_pushes=false -F allow_deletions=false \
    -F required_conversation_resolution=true || true
done
```

4. **Lock environments (`stage`, `prod`)**

```bash
# Require 1 reviewer for stage, 2 for prod; 10‑minute wait timer for prod
cat > /tmp/env-stage.json <<'JSON'
{ "wait_timer": 0, "reviewers": [ { "type": "team", "id": 0 } ] }
JSON
cat > /tmp/env-prod.json <<'JSON'
{ "wait_timer": 10, "reviewers": [ { "type": "team", "id": 0 }, { "type": "team", "id": 0 } ] }
JSON
# Replace id=0 with real team IDs: gh api orgs/$OWNER/teams | jq '.[].id'

gh api -X PUT repos/$OWNER/$REPO/environments/stage -f wait_timer=0
# Add reviewers (repeat for each team id)
# gh api -X PUT repos/$OWNER/$REPO/environments/stage/reviewers -f reviewers[][type]=team -f reviewers[][id]=<TEAM_ID>

gh api -X PUT repos/$OWNER/$REPO/environments/prod  -f wait_timer=10
# gh api -X PUT repos/$OWNER/$REPO/environments/prod/reviewers  -f reviewers[][type]=team -f reviewers[][id]=<TEAM_ID>
```

5. **Make the listed checks required in Branch Protection**  
   Map the following **job names** to your workflows:

- `build` — main build/package
- `unit-tests` — unit test suite
- `e2e-tests` — end‑to‑end path (ingest→resolve→runbook→report)
- `sast-codeql` — CodeQL or equivalent SAST
- `dependency-review` — dependency vulnerability check
- `sbom-generate` — SBOM artifact job (CycloneDX or SPDX)
- `trivy-image-scan` — container image vuln scan
- `helm-lint` & `helm-template` — chart lint & render
- `terraform-fmt-validate` + `terraform-plan` — IaC checks (no apply on PR)
- `migrations-dry-run` — DB migration gate using SHADOW_DB_URL
- `preview-deploy` — PR preview env (namespace `pr-<num>`)
- `rollout-gate (staging)` — promotion gate
- `smoke-tests (staging)` — post‑deploy smoke
- `k6-slo (staging)` — k6 thresholds enforce SLOs
- `slo-burn-rollback (staging)` — auto‑rollback simulation

6. **Enable Canary / Blue‑Green (Argo Rollouts)**

```bash
# Stage rollout\ nmake rollout-apply NS=maestro-staging
kubectl -n maestro-staging argo rollouts get rollout maestro

# Prod rollout (auto-promotion disabled via values)
make rollout-apply NS=maestro
```

7. **Add PR‑closed cleanup workflow**
   Create `.github/workflows/preview-cleanup.yml`:

```yaml
name: Preview Cleanup
on:
  pull_request:
    types: [closed]
jobs:
  teardown:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Auth to cluster (OIDC)
        uses: azure/setup-kubectl@v4
      - name: Delete preview namespace
        run: |
          set -euo pipefail
          kubectl delete ns pr-${{ github.event.pull_request.number }} --ignore-not-found
```

8. **Secrets via SealedSecrets**

- Ensure `kubeseal` public cert is committed for the target cluster(s).
- Store OIDC/Auth provider and rollout controller tokens via `SealedSecret` manifests under `deploy/<env>/secrets/`.
- Verify no plaintext secrets in repo or CI logs.

---

## NEXT (this week)

- **Release train workflow:** add `.github/workflows/release-train.yml` to cut notes, publish artifacts, and open/close the train.
- **Chaos/DR drill on `stage`:** use `RUNBOOKS/disaster-recovery-procedures.yaml`; capture evidence in `PRODUCTION_GO_EVIDENCE.md`.
- **Cost guard:** TTL labels on preview namespaces; nightly cleanup cron.
- **OPA policies:** enforce ABAC/RBAC and reason‑for‑access prompts on risky actions.
- **Golden signals dashboards:** OTEL traces, Prom metrics, logs; add p95 latency SLO panels.

Example `release-train.yml` skeleton:

```yaml
name: Release Train
on:
  schedule: [{ cron: '0 18 * * 4' }] # Thu 18:00 UTC
  workflow_dispatch: {}
jobs:
  cut-notes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate Release Notes
        run: ./scripts/release-notes.sh > RELEASE_NOTES.md
      - name: Upload notes
        uses: actions/upload-artifact@v4
        with: { name: release-notes, path: RELEASE_NOTES.md }
  stage-deploy:
    needs: cut-notes
    uses: ./.github/workflows/cd.yaml
    with: { environment: stage }
  gates:
    needs: stage-deploy
    uses: ./.github/workflows/rollout-gate.yml
  promote-prod:
    needs: gates
    if: ${{ success() }}
    uses: ./.github/workflows/promote.yml
    with: { environment: prod }
```

---

## LATER (within 2 sprints)

- **Auto‑rollback hardening:** tie rollback to SLO burn rate (multi‑window) + canary analysis.
- **Schema migration orchestration:** explicit `predeploy`/`postdeploy` jobs with `--safe` and feature flags.
- **Artifact strategy:** registry retention, immutability, and provenance (SLSA/Sigstore).
- **DR RTO/RPO tests:** cross‑region replica failover; PITR recovery rehearsal.
- **FinOps:** tenant/project‑level dashboards and budget alerts.

---

## Roles & RACI (snapshot)

- **Deployment Engineer:** canary plan, rollout, rollback criteria, migration gates.
- **CI/CD Engineer:** required checks, preview envs, artifact/SBOM, security scans.
- **DevOps/Platform:** clusters, secrets (sealed), autoscaling, SLO dashboards.
- **Repo Arborist:** branch protections, CODEOWNERS, labels, hygiene.
- **Release Captain:** run the train, publish notes, KPIs, postmortems.

---

## Required checks — canonical naming (map to your jobs)

_Use these names in your workflow `jobs.<job_id>.name` to match branch protection contexts._

| Context (required)          | Purpose                                |
| --------------------------- | -------------------------------------- |
| build                       | Build/package with cache + SBOM upload |
| unit-tests                  | Unit test suite                        |
| e2e-tests                   | Ingest→Resolve→Runbook→Report e2e      |
| sast-codeql                 | Static analysis (CodeQL)               |
| dependency-review           | Vulnerability review                   |
| sbom-generate               | SPDX/CycloneDX SBOM artifact           |
| trivy-image-scan            | Image scan before push                 |
| helm-lint                   | Helm chart lint                        |
| helm-template               | Helm render (fail on error)            |
| terraform-fmt-validate      | Terraform fmt/validate                 |
| terraform-plan              | Terraform plan (no apply)              |
| migrations-dry-run          | Migration lint/dry-run vs SHADOW_DB    |
| preview-deploy              | Ephemeral PR env stands up OK          |
| rollout-gate (staging)      | Promotion gate checks pass             |
| smoke-tests (staging)       | Post‑deploy smoke green                |
| k6-slo (staging)            | Thresholds hold under load             |
| slo-burn-rollback (staging) | Auto‑rollback hook verified            |

---

## Communication templates

**Change Announcement (pre‑train)**

- Impact: _what changes and who’s affected_
- Risk & rollback: _playbook + “undo” plan_
- Owner & on‑call: _name + pager_
- Migration notes & flags: _user facing toggles_

**Post‑Release Notes (auto‑generated)**

- New features / fixes
- Flags default changes
- Migrations executed
- SLO status + any incidents

---

## Rollback criteria (golden signals)

- p95 latency > 1.5s for 5 consecutive minutes (or SLO burn rate > 2x over 10m/1h windows)
- Error rate > 2% over 5 minutes
- Saturation > 80% sustained 10 minutes
- Any migration gate breach

**Rollback commands (stage/prod)**

```bash
make rollout-undo NS=<namespace>
# Or pin back to last good digest
make rollout-pin NS=<namespace> IMMUTABLE_REF=ghcr.io/brianclong/app@sha256:<known_good>
```

---

## Audit & Evidence

- Attach CI artifacts (SBOM, plan outputs, test reports) to the release.
- Export stage→prod dashboards at cut time; link in `PRODUCTION_GO_EVIDENCE.md`.
- Ensure audit logs capture who/what/why/when for promotions and accesses (OPA).

---

## Appendix — Quick fixes

- If a check name doesn’t appear in the branch protection picker, push a commit that runs the job once so GitHub learns the context name.
- For team IDs in environment reviewers: `gh api orgs/$OWNER/teams | jq -r '.[] | "\(.name): \(.id)"'`.
- Don’t make `preview-deploy` required if your runners are transient; instead, require `preview-build` + `helm-template`.
