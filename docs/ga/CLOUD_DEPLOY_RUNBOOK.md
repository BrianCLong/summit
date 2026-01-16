# Cloud Deploy Runbook

## Workflows
- iac:validate: Runs semantic + drift checks; runs Terraform fmt/validate if `iac/terraform` exists.
- security:iac: Runs Trivy IaC scan and uploads SARIF to GitHub Security.
- deploy:cloud: Plans (default) or applies to dev/stage/prod.

## Required Repo Settings
1) Configure GitHub Environments:
- dev: no approvals
- stage: optional approvals
- prod: required approvals

2) Configure secrets (cloud-specific):
- Use OIDC if supported; otherwise configure provider credentials as environment secrets.

## Deploy
- Push to main: plans dev by default
- Manual run: choose env and apply=true to apply

## Artifacts
- IaC validate artifacts: `artifacts/iac-validate/`
- Deploy artifacts: `artifacts/deploy-cloud/`
- GA verify artifacts: `artifacts/ga-verify/<sha>/`
