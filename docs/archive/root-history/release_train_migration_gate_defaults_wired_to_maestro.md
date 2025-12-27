This package adds a **DB migration gate** and a **stage→prod release train** with canary + auto‑rollback, wired for Maestro Conductor. It is stack‑agnostic with sane defaults and Postgres examples.

---

## File Map (add to repo)

```
.github/workflows/
  release-train.yml
  promote.yml
  migration-gate.yml
.ci/scripts/
  db_dryrun_pg.sh
  db_apply_pg.sh
  db_rollback_pg.sh
  collect_release_notes.sh
  verify_canary_health.sh
  annotate_pr_with_trace.sh
  require_green_slo.sh
.ci/config/
  release.yml
  slo.yml           # already present; used by gates
  db.yml
ops/runbooks/
  release-train.md
  migrations.md     # extended version
  rollback-db.md
  rollback-app.md
```

---

## Configs

### `.ci/config/release.yml`

```yaml
versioning:
  mode: auto # auto | manual
  tag_prefix: v
  bump: patch # default bump if auto and no conventional commit scope
  allow_pre: true
  prerelease_prefix: rc
promote:
  environments:
    - stage
    - prod
canary:
  steps: [5, 25, 50, 100] # percentage
  window_secs: 300 # observation window per step
rollback:
  strategy: helm_rollback # or: new_deploy_prev_tag
notes:
  sections: [Features, Fixes, Chores, Security]
```

### `.ci/config/db.yml`

```yaml
engine: postgres
schema_dir: db/migrations
required_docs:
  - docs/migrations/plan.md
  - docs/migrations/rollback.md
```

---

## Migration Gate Workflow

### `.github/workflows/migration-gate.yml`

```yaml
name: migration-gate
on:
  pull_request:
    paths:
      - 'db/migrations/**'
      - 'docs/migrations/**'
      - '.ci/policies/**'
permissions: { contents: read }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check required documents
        run: |
          for f in $(yq '.required_docs[]' .ci/config/db.yml); do
            test -f "$f" || (echo "Missing $f" && exit 1)
          done
      - name: Dry-run (Postgres)
        if: ${{ hashFiles('db/migrations/**') != '' }}
        env:
          PG_CONN: ${{ secrets.PG_DRYRUN_CONN }}
        run: ./.ci/scripts/db_dryrun_pg.sh "$PG_CONN" db/migrations
      - name: OPA policy check
        run: conftest test --policy ./.ci/policies db/migrations
      - name: Attach artifacts
        uses: actions/upload-artifact@v4
        with:
          name: migration-dryrun
          path: db/migrations/DRYRUN_RESULT.txt
```

> **Secrets**: set `PG_DRYRUN_CONN` to a non‑prod, throwaway PG instance (schema mirror), read/write permitted.

---

## Release Train (Stage → Prod with Canary)

### `.github/workflows/release-train.yml`

```yaml
name: release-train
on:
  workflow_dispatch:
    inputs:
      ref: { description: 'Git ref (branch or tag)', required: true, default: 'main' }
      bump: { description: 'version bump (major|minor|patch|none)', required: false, default: 'none' }
permissions:
  contents: write
  deployments: write
concurrency:
  group: release-${{ github.event.inputs.ref }}
  cancel-in-progress: false
jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.v.outputs.version }}
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.inputs.ref }} }
      - name: Compute version
        id: v
        run: |
          BUMP="${{ github.event.inputs.bump }}"
          PREFIX=$(yq '.versioning.tag_prefix' .ci/config/release.yml)
          if [ "$BUMP" != 'none' ]; then
            # naive bump helper
            CUR=$(git tag --list "${PREFIX}[0-9]*" --sort=-v:refname | head -n1 | sed "s/^$PREFIX//")
            [ -z "$CUR" ] && CUR=0.0.0
            IFS=. read -r MA MI PA <<<"$CUR"
            case "$BUMP" in
              major) MA=$((MA+1)); MI=0; PA=0;;
              minor) MI=$((MI+1)); PA=0;;
              patch) PA=$((PA+1));;
            esac
            NEXT="$MA.$MI.$PA"
            echo "version=${PREFIX}${NEXT}" >> $GITHUB_OUTPUT
          else
            echo "version=$(date +"${PREFIX}%Y.%m.%d-%H%M")" >> $GITHUB_OUTPUT
          fi
      - name: Create tag
        run: |
          git config user.name "release-bot"
          git config user.email "release-bot@users.noreply.github.com"
          git tag -a "${{ steps.v.outputs.version }}" -m "Release ${{ steps.v.outputs.version }}"
          git push origin "${{ steps.v.outputs.version }}"
      - name: Build & Publish image
        uses: ./.github/workflows/wf-reuse-publish.yml
        secrets: inherit
  stage:
    needs: prepare
    uses: ./.github/workflows/wf-reuse-deploy.yml
    with: { environment: 'stage' }
    secrets: inherit
  verify-stage:
    needs: stage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Ensure SLOs green
        run: ./.ci/scripts/require_green_slo.sh stage
      - name: Collect release notes
        run: ./.ci/scripts/collect_release_notes.sh > notes-stage.md
      - uses: actions/upload-artifact@v4
        with: { name: notes-stage, path: notes-stage.md }
  prod-canary:
    needs: verify-stage
    uses: ./.github/workflows/wf-reuse-deploy.yml
    with: { environment: 'prod' }
    secrets: inherit
  canary-verify:
    needs: prod-canary
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Step canary & verify
        env:
          STEPS: $(yq '.canary.steps[]' .ci/config/release.yml | xargs)
          WINDOW: $(yq '.canary.window_secs' .ci/config/release.yml)
        run: ./.ci/scripts/verify_canary_health.sh "$STEPS" "$WINDOW"
```

### `.github/workflows/promote.yml`

```yaml
name: promote
on:
  workflow_dispatch:
    inputs:
      environment: { description: 'stage|prod', required: true }
      ref: { description: 'tag or sha', required: true }
jobs:
  deploy:
    uses: ./.github/workflows/wf-reuse-deploy.yml
    with: { environment: ${{ github.event.inputs.environment }} }
    secrets: inherit
```

---

## DB Scripts (Postgres example)

### `.ci/scripts/db_dryrun_pg.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
PG_CONN="$1"; MIG_DIR="$2"
: > db/migrations/DRYRUN_RESULT.txt
for f in $(ls "$MIG_DIR"/*.sql); do
  echo "-- DRYRUN: $f" | tee -a db/migrations/DRYRUN_RESULT.txt
  psql "$PG_CONN" -v ON_ERROR_STOP=1 -f "$f" -c 'ROLLBACK;' --single-transaction >/dev/null 2>&1 && \
    echo "OK $f" | tee -a db/migrations/DRYRUN_RESULT.txt || {
      echo "FAIL $f" | tee -a db/migrations/DRYRUN_RESULT.txt
      exit 1
    }
done
```

### `.ci/scripts/db_apply_pg.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
PG_CONN="$1"; MIG_DIR="$2"
for f in $(ls "$MIG_DIR"/*.sql); do
  psql "$PG_CONN" -v ON_ERROR_STOP=1 -f "$f"
  echo "$f applied"
done
```

### `.ci/scripts/db_rollback_pg.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
PG_CONN="$1"; ROLLBACK_SQL="docs/migrations/rollback.sql"
psql "$PG_CONN" -v ON_ERROR_STOP=1 -f "$ROLLBACK_SQL"
```

---

## Canary Health & SLO Gates

### `.ci/scripts/verify_canary_health.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
STEPS="$1"; WINDOW="$2"
# TODO: Replace with real metrics queries. Placeholder loop to indicate stepwise promotion.
for p in $STEPS; do
  echo "Promote canary to ${p}% and wait ${WINDOW}s"
  # Example: kubectl patch HPA or Helm values to scale traffic split
  sleep "$WINDOW"
  # TODO: query metrics; exit 1 on breach to trigger rollback
done
```

### `.ci/scripts/require_green_slo.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
ENV="$1"
# TODO: implement check against your metrics provider using .ci/config/slo.yml thresholds
# Exit non-zero to block promotion when SLOs are burning
exit 0
```

### `.ci/scripts/collect_release_notes.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
FROM=$(git describe --tags --abbrev=0 --always --match 'v*' 2>/dev/null || echo $(git rev-list --max-parents=0 HEAD))
TO=HEAD
echo "# Release Notes"; echo
COMMITS=$(git log --pretty=format:'%s (%h)' "$FROM".."$TO")
echo "$COMMITS" | awk '
  /feat\(/ {print "## Features\n- "$0; next}
  /fix\(/  {print "## Fixes\n- "$0; next}
  /chore\(/{print "## Chores\n- "$0; next}
  {print "## Other\n- "$0}
'
```

---

## Maestro Conductor Hooks

- **Trace & Audit**: call `.ci/scripts/annotate_pr_with_trace.sh` during PR builds to append trace IDs; Maestro collects them and correlates with deployments.
- **Policy stop**: Maestro should query SLO endpoint and block `promote.yml` dispatch if `.ci/scripts/require_green_slo.sh` would fail.
- **Rollback**: If `verify_canary_health.sh` exits non‑zero, deploy job fails; Maestro triggers `helm rollback` to previous revision and records immutable audit with reason.

### `.ci/scripts/annotate_pr_with_trace.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
TRACE_ID=${1:-}
[ -z "$TRACE_ID" ] && exit 0
echo "Trace: $TRACE_ID" > trace.txt
```

---

## Runbooks

### `ops/runbooks/release-train.md`

```md
**Objective**: Safe, reversible stage→prod promotion with canary + rollback.

1. Run workflow **release-train** on `main`.
2. Verify stage dashboards; ensure `require_green_slo.sh` passes.
3. Promote to prod (canary). Observe golden signals each step.
4. If breach: rollback via Helm (`helm rollback summit <REV>`), verify, and document audit ID.
```

### `ops/runbooks/migrations.md`

```md
**Objective**: Prevent unsafe schema changes.

- PRs touching `db/migrations/**` must include plan + rollback docs and pass `migration-gate`.
- Dry-run against non-prod clone; attach `DRYRUN_RESULT.txt`.
- Rollback script `docs/migrations/rollback.sql` must reverse all destructive changes.
```

### `ops/runbooks/rollback-db.md`

```md
**DB Rollback**

- Use `db_rollback_pg.sh` with the connection string to stage/prod after approval.
- Verify application compatibility; monitor error rate.
```

### `ops/runbooks/rollback-app.md`

```md
**App Rollback**

- `helm rollback summit <REVISION>`
- Confirm p95 latency, error rate, saturation are back to normal for 10 minutes.
```

---

## Required Secrets & Protections

- `PG_DRYRUN_CONN` — non‑prod Postgres clone for DRYRUN.
- Protect **prod** environment: required reviewers, manual approval, and `prevent self‑approval`.
- Enable branch protection on `main`: required checks (tests, scan, migration‑gate when applicable), linear history, and signed commits.
