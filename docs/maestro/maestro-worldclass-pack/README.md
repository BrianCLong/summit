# Maestro Orchestrator — World‑Class Epics & PR Scaffold

This pack bootstraps GitHub issues (epics + tasks), labels, and a starter PR with directory stubs.

## What’s inside

- `.github/ISSUE_TEMPLATE/feature.yml` & `task.yml` — Issue Forms for Features and Tasks
- `scripts/create_labels.sh` — Creates common labels
- `scripts/create_issues.sh` — Creates 6 epics + ~30 child issues (optional Epic G)
- `scripts/prepare_pr.sh` — Creates a feature branch and adds starter files
- `deploy/router/` — LiteLLM Router values (example)
- `deploy/observability/` — OTEL Collector + Grafana placeholders
- `evals/prompt_eval.yaml` — Eval runner example
- `policies/` — Rego examples (routing & cost)
- `PULL_REQUEST_TEMPLATE.md` — Suggested PR body

## Prereqs

- [gh CLI](https://cli.github.com/) authenticated: `gh auth login`
- `jq` installed (for JSON parsing in scripts)
- Run scripts from the repo root (where `.git` lives)

## Quickstart

```bash
# 1) Create labels (idempotent)
bash scripts/create_labels.sh

# 2) Generate epics + issues (will print created URLs)
bash scripts/create_issues.sh

# 3) Create a branch and add starter files
bash scripts/prepare_pr.sh

# 4) Push branch and open PR
git push -u origin feature/maestro-worldclass-epics
gh pr create --fill
```
