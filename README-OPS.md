# Ops Orchestrator Kit — Maestro GA Release

This kit gives the team a **resumable, status-reporting** workflow to:
- Triage & merge open PRs safely (batch or individually)
- Clean up stale branches (dry-run first)
- Generate changelog & release notes
- Build & test across languages (auto-detected)
- Package artifacts, SBOM, and provenance
- Prepare a **GA release** with canary plan and rollback
- Keep an immutable audit trail in `ops-logs/` and a resumable state file in `ops-state.json`

Works **locally on Ubuntu** and in hybrid environments (workstation + CI). It is **idempotent** and
can be resumed at any time: `./ops/ga_orchestrator.sh resume`.

> Non-destructive by default. Actions that mutate remotes require `CONFIRM=1`.
> All steps write detailed logs under `ops-logs/` and update `ops-state.json`.

---

## Quickstart

```bash
# 1) Place this kit at the root of your repo
cp -r ops ops-logs templates scripts ops-state.schema.json README-OPS.md ./

# 2) Ensure prerequisites (Ubuntu):
sudo apt-get update -y
sudo apt-get install -y git jq yq curl coreutils findutils unzip
# optional but recommended:
# gh (GitHub CLI), docker, docker-compose, nodejs/npm, python3-pip, go, openjdk, helm, kubectl, terraform, cosign, syft, grype

# 3) Dry-run status (no changes to remotes):
./ops/ga_orchestrator.sh status

# 4) Create or resume a GA release plan:
./ops/ga_orchestrator.sh init         # writes ops-state.json if absent
./ops/ga_orchestrator.sh plan         # inventories PRs/branches; no mutations
./ops/ga_orchestrator.sh build        # language-aware builds/tests
./ops/ga_orchestrator.sh release-dry  # render notes, changelog, artifacts (no tag)

# 5) Execute merges & tag GA (requires CONFIRM=1):
CONFIRM=1 ./ops/ga_orchestrator.sh merge-prs
CONFIRM=1 ./ops/ga_orchestrator.sh cleanup-branches
CONFIRM=1 ./ops/ga_orchestrator.sh tag-ga
```

### Resume anywhere
Every subcommand updates `ops-state.json`. If you stop or error, run:
```bash
./ops/ga_orchestrator.sh resume
```
It will continue from the next pending step using the saved state.

---

## Safety & Observability
- **Dry-run first**: PR merges and branch deletes are printed with exact commands before changes.
- **Audit logs**: All output is timestamped to `ops-logs/step-<N>-<name>.log`.
- **Guardrails**: If required tools are missing for a step, the step is **skipped** and marked `needs_tool` with a human action.
- **Policy hooks**: If `scripts/policy_gate.sh` exists, it runs before any mutating actions.
- **Rollback**: Release tagging is last; canary/rollback plan is recorded in `templates/GA_RELEASE_PLAN.md`.

---

## What it detects & builds
The kit autodetects common stacks:
- Node/TypeScript (`package.json`, `pnpm-lock.yaml`, `yarn.lock`)
- Python (`pyproject.toml`, `requirements*.txt`)
- Go (`go.mod`)
- Java (`pom.xml`)
- Docker/Compose (build; smoke up if compose present)
- Helm charts (`Chart.yaml`); Terraform (`*.tf`) — plan-only in local run

Each language step **never guesses**: if a standard file is present, it runs the standard build/test.
If the tool is missing, it skips with a clear status for the operator to address.

---

## State file
See `ops-state.schema.json` for the JSON schema. The current state lives in `ops-state.json`.
