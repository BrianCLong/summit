# Goal

Roll out the CI/CD + governance bundle safely, in the right order, with validation at each step and a quick rollback for every change.

---

## Phase 0 — Preflight (30–60 min)

- [ ] Confirm **owners**: Platform, CI/CD, SecOps, Data, Release Captain.
- [ ] Inventory **secrets** available: `REGISTRY_USER`, `REGISTRY_TOKEN`, `COSIGN_*`, `KUBE_CONFIG`, `PG_DRYRUN_CONN`, `RENOVATE_TOKEN` (if self-hosting).
- [ ] Ensure a **non‑prod cluster** (stage) is healthy; Helm chart deploys today.
- [ ] Verify GitHub permissions to create **rulesets** and **environments**.

**Validation**: Dry-run `helm template` and `terraform plan` (if using infra repo).

**Rollback switch**: none (read-only validation only).

---

## Phase 1 — Branch & Environment Protections (low risk)

1. Apply **environment protections** for `stage` and `prod`.
2. Enable **branch protection** on `main` with minimal checks (start with `ci-pr`).

**Validation**:

- `Settings → Environments` show protected `stage`/`prod`.
- A test PR shows required check `ci-pr` blocking merge.

**Rollback**: Temporarily relax by removing required checks; keep protection toggled.

---

## Phase 2 — Land Core CI Reusables (no deployment yet)

1. Commit reusable workflows: `wf-reuse-*` and scripts under `.ci/scripts/*`.
2. Commit **PR orchestrator** `pr.yml` (build+test+scan, no deploy).

**Validation**:

- Open a trivial PR; confirm jobs: build (node/python), tests, scan run to success.
- Artifact uploads present (junit, sbom).

**Rollback**: Disable `pr.yml` by renaming file or restricting `on.pull_request` branches.

---

## Phase 3 — Preview Environments (dev-only)

1. Add preview deploy step to `pr.yml` (already scaffolded).
2. Provide `KUBE_CONFIG` secret; ensure cluster DNS for preview host.

**Validation**:

- PR comment posts preview URL; namespace `pr-<n>` exists; health endpoints pass.

**Rollback**: Remove preview job; run `.ci/scripts/preview_destroy.sh <n>` to clean namespaces.

---

## Phase 4 — Security & Policy Gates

1. Enable **CodeQL** + SBOM script.
2. Add **OPA** checks for Terraform/Helm (non-blocking first).
3. Turn on **secret scanning** (repo settings).

**Validation**:

- Scan job uploads SARIF; no criticals.
- Conftest outputs pass/fail as expected on sample PR.

**Rollback**: Mark scan job `continue-on-error: true` temporarily.

---

## Phase 5 — Migration Gate (DB)

1. Commit `migration-gate.yml` and Postgres dry-run scripts.
2. Add `PG_DRYRUN_CONN` secret (points to **throwaway clone**).
3. Add templates `migrations-plan.md` and `migrations-rollback.md`.

**Validation**:

- PR touching `db/migrations/**` is blocked until docs + DRYRUN artifacts exist.

**Rollback**: Limit gate to `paths-ignore` or make it non-blocking for 24h.

---

## Phase 6 — Package, Sign, Publish

1. Wire `wf-reuse-package.yml` + `wf-reuse-publish.yml` in PR chain after tests+scan.
2. Set `COSIGN_*` and registry secrets; push to GHCR.

**Validation**:

- Image `ghcr.io/<org>/<repo>:sha-<sha>` visible; Cosign signature verifies.

**Rollback**: Remove `package/publish` jobs; artifacts still accessible in Actions.

---

## Phase 7 — Stage Deploy + SLO Gate

1. Use `wf-reuse-deploy.yml` with `environment: stage` on the `release-train.yml`.
2. Implement `require_green_slo.sh` to query your metrics (placeholder in repo).

**Validation**:

- Stage rollout succeeds; SLO script returns zero.
- Grafana overview dashboard shows traffic.

**Rollback**: `helm rollback` in stage; disable stage deploy job.

---

## Phase 8 — Prod Canary + Auto‑Rollback

1. Enable `release-train.yml` workflow_dispatch; deploy with canary steps.
2. Fill `verify_canary_health.sh` with real metric queries + thresholds from `.ci/config/slo.yml`.

**Validation**:

- Canary progresses 5→25→50→100 with observation windows; auto-rollback triggers on synthetic breach.

**Rollback**: Helm rollback to previous revision; tag `frozen/rollback` to pause train.

---

## Phase 9 — Governance as Code

**Choose one**:

- Terraform (preferred): apply `infra/github/*` in infra repo.
- `gh` CLI fallback: run `scripts/gh-apply-rules.sh`.

**Validation**:

- `main` shows all required checks; env protections active; ruleset applied.

**Rollback**: `terraform destroy -target`/re-run script with relaxed contexts.

---

## Phase 10 — Renovate + Clean‑Main Sentinel

1. Add `.renovaterc.json` (or enable app).
2. Enable `clean-main-sentinel.yml` and pair with ruleset to block merges when label `freeze/main-red` present.

**Validation**:

- Renovate PRs appear during business hours; sentinel labels PRs when `main` is red.

**Rollback**: Disable workflow(s); remove merge‑block label rule.

---

## Phase 11 — Dashboards‑as‑Code & OTEL Tags

1. Import Grafana JSONs; link Prometheus datasource.
2. Ensure CI sources `.ci/otel/resource-attrs.env` so traces link PR→build→deploy.

**Validation**:

- Dashboards render; alerts fire on synthetic error budget burn.

**Rollback**: Silence alert rule group; keep dashboards.

---

## Acceptance Evidence (attach to sprint)

- Screenshots: protected environments, rulesets, passing required checks.
- Artifact links: SBOM, Cosign attestations, migration DRYRUN output.
- Grafana snapshots: golden signals during canary + rollback simulation.
- Audit: release-train run log, trace IDs, who/what/why/when.

---

## RACI (who does what)

- **Platform/DevOps**: Envs, K8s, Helm, secrets, SLO script, Grafana, Terraform.
- **CI/CD**: Workflows, caches, artifacts, preview env lifecycle.
- **SecOps**: CodeQL, OPA policies, secret scanning, license policy.
- **Data**: Migration gate, DRYRUN, rollback SQL ownership.
- **Release Captain**: Runs release train, canary watch, rollback decision, notes.

---

## Timeline (2 weeks)

- **Day 1–2**: Phases 1–2
- **Day 3**: Phase 3
- **Day 4–5**: Phase 4
- **Day 6**: Phase 5
- **Day 7**: Phase 6
- **Day 8**: Phase 7
- **Day 9**: Phase 8 (prod canary drill off-hours)
- **Day 10**: Phase 9
- **Day 11**: Phase 10
- **Day 12–13**: Phase 11 + fixes
- **Day 14**: Evidence, retro, hardening backlog

---

## Quick Commands (operator handy list)

```bash
# Preview destroy all stale namespaces older than 3 days
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | grep '^pr-' ); do
  kubectl get ns $ns -o jsonpath='{.metadata.creationTimestamp}' | awk -v NS=$ns 'BEGIN{cmd="date -u +%s"; cmd | getline now} { gsub(/Z/,"",$0); gsub(/T/," ",$0); cmd="date -u -d \""$0"\" +%s"; cmd | getline ts; if (now-ts>259200) print NS }' | xargs -r kubectl delete ns --wait=false
done

# Cosign verify
cosign verify ghcr.io/<org>/<repo>:sha-<sha>

# Helm rollback
helm history summit -n <ns>
helm rollback summit <REV> -n <ns>
```

---

## Post‑Sprint Hardening Backlog

- Convert canary health script to query **your** metrics provider (Prometheus/Datadog/Grafana Loki) and enforce rollout gates.
- Add contract tests and e2e smoke to PR matrix.
- Cost guard: preview env TTL + scale-to-zero; dashboards per namespace.
- Chaos drill: pod kill + region failover on stage.
