This package finishes the CI/CD hardening by codifying **environment protections**, **branch protections**, and a **required checks registry** for `main`, plus org‑level rollout using Terraform (GitHub provider) and a fallback using `gh` CLI. It also adds migration doc templates and a minimal flaky‑test bot.

---

## File Map (add to repo or infra repo)

```
.github/workflows/
  org-rules-drift.yml
  flake-bot.yml
.ci/config/
  required-checks.yml
  checks-matrix.yml
  repo-rules.yml
  templates/
    migrations-plan.md
    migrations-rollback.md
infra/github/
  providers.tf
  versions.tf
  org.auto.tfvars.example
  main.tf
  rulesets.tf
  environments.tf
  branch_protection.tf
  vars.tf
scripts/
  gh-apply-rules.sh
```

---

## Required Checks Registry

### `.ci/config/required-checks.yml`

```yaml
# Map branch → required status checks. Used by Terraform and gh script.
branches:
  main:
    checks:
      - ci-pr (conclusion=success)
      - workflow: wf-reuse-test-node (job=test)
      - workflow: wf-reuse-test-python (job=test)
      - workflow: wf-reuse-scan (job=scan)
      - workflow: wf-reuse-package (job=package)
      - workflow: migration-gate (job=verify)
      - workflow: wf-reuse-deploy (environment=stage)
    require_linear_history: true
    require_signed_commits: true
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 1
      require_code_owner_reviews: true
      dismiss_stale_reviews: true
```

### `.ci/config/checks-matrix.yml`

```yaml
# Derive which checks are required for which paths (optional for rulesets)
paths:
  - pattern: 'db/migrations/**'
    require: ['migration-gate']
  - pattern: 'helm/**'
    require: ['wf-reuse-deploy']
  - pattern: 'terraform/**'
    require: ['wf-reuse-scan']
```

### `.ci/config/repo-rules.yml`

```yaml
rulesets:
  - name: Protect main
    target: branch
    include: ['main']
    conditions:
      pull_request: true
      non_fast_forward: true
    required_status_checks:
      strict: true
      checks_from: .ci/config/required-checks.yml
    restrictions:
      block_force_pushes: true
      block_deletions: true
```

---

## Terraform — GitHub Policy as Code (preferred)

> Use a separate **infra repo**. Point a GitHub App/Token with org‑admin scope to apply. Imports supported.

### `infra/github/versions.tf`

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    github = {
      source  = "integrations/github"
      version = ">= 6.3.0"
    }
  }
}
```

### `infra/github/providers.tf`

```hcl
provider "github" {
  owner = var.org
  token = var.token
}
```

### `infra/github/vars.tf`

```hcl
variable "org" { type = string }
variable "token" { type = string }
variable "repo" { type = string }
variable "environments" { type = list(string) default = ["stage","prod"] }
```

### `infra/github/org.auto.tfvars.example`

```hcl
org   = "your-org"
repo  = "summit-main"
token = "${GITHUB_TOKEN}" # or TF_VAR_token env
```

### `infra/github/branch_protection.tf`

```hcl
# Protect main with required checks
resource "github_branch_protection_v3" "main" {
  repository_id  = var.repo
  pattern        = "main"
  enforce_admins = true
  require_signed_commits = true
  allows_deletions      = false
  allows_force_pushes   = false

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
    require_code_owner_reviews      = true
  }

  required_status_checks {
    strict   = true
    contexts = [
      "ci-pr",
      "test (wf-reuse-test-node)",
      "test (wf-reuse-test-python)",
      "scan (wf-reuse-scan)",
      "package (wf-reuse-package)",
      "verify (migration-gate)"
    ]
  }
}
```

### `infra/github/environments.tf`

```hcl
# Create and protect environments
resource "github_repository_environment" "env" {
  repository       = var.repo
  for_each         = toset(var.environments)
  environment      = each.value
  wait_timer       = 0
  reviewers { users = [] } # swap for required teams
  deployment_branch_policy {
    protected_branches = true
    custom_branch_policies = false
  }
}
```

### `infra/github/rulesets.tf`

```hcl
# Optional: Repository Ruleset for path-conditional checks
resource "github_repository_ruleset" "protect_main" {
  name        = "Protect main"
  repository  = var.repo
  target      = "branch"
  enforcement = "active"
  conditions {
    ref_name {
      include = ["refs/heads/main"]
      exclude = []
    }
  }
  rules {
    pull_request {
      dismiss_stale_reviews_on_push = true
      require_code_owner_review     = true
      required_approvals            = 1
    }
    non_fast_forward {}
    commit_message_pattern { operator = "contains" pattern = ":" } # Conventional-ish
    required_status_checks {
      required_check {
        context = "ci-pr"
      }
    }
  }
}
```

---

## Fallback — `gh` CLI Script (apply without Terraform)

### `scripts/gh-apply-rules.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO=${1:-your-org/summit-main}
# Require checks on main
checks=(
  "ci-pr"
  "test (wf-reuse-test-node)"
  "test (wf-reuse-test-python)"
  "scan (wf-reuse-scan)"
  "package (wf-reuse-package)"
  "verify (migration-gate)"
)
json_checks=$(printf '"%s",' "${checks[@]}" | sed 's/,$//')
# Create branch protection
gh api -X PUT repos/$REPO/branches/main/protection \
  -f required_status_checks.strict=true \
  -f enforce_admins=true \
  -F required_status_checks.contexts="[$json_checks]" \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_pull_request_reviews.require_code_owner_reviews=true \
  -F restrictions=null
# Protect envs
for env in stage prod; do
  gh api -X PUT repos/$REPO/environments/$env --silent || true
  gh api repos/$REPO/environments/$env --method PUT -f "deployment_branch_policy.protected_branches"=true --silent || true
done
```

---

## Templates — Migrations Docs

### `.ci/config/templates/migrations-plan.md`

```md
# Migration Plan

- Service/Owner:
- Issue/PR:
- Summary:
- Data impact:
- Backfill strategy:
- Rollout plan: dry-run → stage → prod
- Observability: metrics/logs to watch
- Rollback plan reference: `docs/migrations/rollback.md`
```

### `.ci/config/templates/migrations-rollback.md`

```md
# Migration Rollback

- Owner:
- Preconditions to rollback:
- Exact statements to reverse:
- Data restoration steps (if any):
- Verification checklist after rollback:
```

---

## Flaky‑Test Bot (minimal)

### `.github/workflows/flake-bot.yml`

```yaml
name: flake-bot
on:
  workflow_run:
    workflows: ['pr']
    types: [completed]
permissions: { checks: read, contents: read, issues: write }
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const res = await github.rest.checks.listForRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.payload.workflow_run.head_sha,
            })
            const flaky = res.data.check_runs.filter(r => r.conclusion === 'failure' && (r.name||'').match(/test/i))
            if (flaky.length) {
              const body = flaky.map(f => `- ${f.name}: ${f.output?.summary||'see logs'}`).join('\n')
              await github.rest.issues.create({ owner: context.repo.owner, repo: context.repo.repo, title: `Flake candidates for ${context.payload.workflow_run.head_branch}`, body })
            }
```

---

## How to Apply

### Terraform path

1. Put `infra/github/*` in your infra repo.
2. Export `TF_VAR_token` with org‑admin token; set `TF_VAR_org` and `TF_VAR_repo`.
3. `terraform init && terraform apply`.

### `gh` CLI path

1. Ensure `gh auth login` as org admin.
2. Run: `bash scripts/gh-apply-rules.sh your-org/summit-main`.

---

## After Enablement — Acceptance Evidence

- Screenshot GitHub **Rulesets** and **Environments** with protections.
- `main` shows required checks blocking merges.
- PRs with DB changes must pass **migration-gate**.
- Canary promotions blocked on **SLO** gate until green.
- Flake issues automatically opened with failure summaries.
