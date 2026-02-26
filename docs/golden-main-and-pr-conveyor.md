# Golden Main and PR Conveyor Playbook

## Objective

Establish a single protected `main` branch tip where required checks are stable and reproducible, then resolve open PR backlog through a deterministic conveyor (merge, close, or supersede).

## Golden Main Definition

`main` is golden only when all conditions hold on a named SHA in the last 24-72 hours:

1. Required checks are stable and consistently pass.
2. Build + lint/typecheck + unit + integration + packaging/smoke checks pass.
3. Merge queue (or strict up-to-date + linear merge policy) is enforced.
4. A release artifact or smoke build is produced on each merge.
5. The exact green SHA is reproducible.

## Stabilization Sequence (24-48h execution window)

### 1) Freeze and isolate

- Freeze merges to CI-fix only.
- Enable strict branch protection + queue-based merges.
- Select current `main` as golden-candidate SHA.

### 2) Failure matrix triage

Classify each failed check into exactly one bucket:

- **Deterministic**: always fails, fix immediately in code/config.
- **Flaky**: intermittent failure, add bounded retries, quarantine, and open deflake work items.
- **Infra**: runner/secrets/cache/artifact/timeouts, fix platform settings before feature work.

### 3) Trustworthiness hardening

- Add limited retries for known flakes.
- Split long jobs and pin toolchains.
- Enable cache keys and restore points for package manager/build outputs.
- Require a minimal packaging/smoke artifact job before merge.

### 4) Lock governance

- Require required checks at merge time.
- Enforce labels: `ci-fix`, `flake`, `infra`, `deps`, `feature`, `docs`.
- Use merge queue only until green cadence is sustained.

## Backlog Resolution Conveyor

### Phase A: Bulk classification policy

- `>180d` inactive (without `keepalive` / `security` / `release`) => close with stale rationale.
- `90-180d` inactive => warn, request rebase, set 14-day closure timer.
- `<90d` => retain and route through queue.

Automation command:

```bash
gh pr list --state open --limit 1000 --json number,title,updatedAt,url,labels > /tmp/prs.json
node scripts/pr/triage-open-prs.mjs --input /tmp/prs.json --output artifacts/pr-triage-plan.json
```

### Phase B: Merge conveyor policy

1. Green + no conflicts => merge queue.
2. Green + conflicts => bot rebase attempt; escalate to human if conflict set is large.
3. Failing CI => fix or close unless failure signature is already tracked as flaky/infra.
4. Large PRs => split into refactor, deps, and feature increments.

### Phase C: Conflict factory for drifted PRs

For high-conflict PRs:

1. Branch from current golden `main`.
2. Cherry-pick logical commit chunks.
3. Resolve conflicts once per chunk.
4. Open replacement PRs and close originals as superseded.

## Immediate Priority

Investigate failing checks on the two best merge candidates first. If candidate PRs cannot pass required checks, the system does not have golden main yet.
