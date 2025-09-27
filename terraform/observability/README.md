# Observability & Guardrail Infrastructure

This module provisions the AWS infrastructure required to operate the Summit observability stack:

- Amazon Managed Prometheus workspace used by the canary analysis pipeline.
- Amazon Managed Grafana workspace for dashboards and runbooks.
- CloudWatch alarms for API/ingest SLO guardrails.
- AWS Budgets to enforce the 80% monthly cost cap with SNS + GitHub automation hooks.

## Usage

```hcl
module "observability" {
  source = "./terraform/observability"

  region                   = "us-east-1"
  amp_workspace_alias      = "summit-platform"
  grafana_account_access   = "CURRENT_ACCOUNT"
  pagerduty_sns_topic_arn  = module.incident_topics.pagerduty_arn
  github_issue_webhook_url = "https://ops-gateway.summit.internal/webhooks/github-issue"
  github_issue_webhook_auth_token = var.github_issue_token
  monthly_platform_budget  = 75000
  monthly_llm_budget       = 25000
}
```

Outputs expose Prometheus remote write endpoint, Grafana URL, and SNS topics for wiring into other modules.
