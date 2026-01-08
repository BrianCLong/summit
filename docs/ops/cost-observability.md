# Cost Observability and Tagging

This document defines how we expose, attribute, and report cloud and LLM costs. It focuses on tenant- and feature-level transparency while avoiding sensitive data in logs.

## Cloud Cost Sources

- **AWS Cost Explorer / Billing console** for authoritative spend, budget alarms, and anomaly detection.
- **Resource tags and AWS Organizations cost allocation tags** for service, environment, and tenant attribution.
- **CloudWatch metrics** for usage counters (compute, storage, bandwidth) that can be joined to tags.
- **Vended logs (e.g., S3 server access, ALB access logs)** when we need finer-grained traffic insights.

## Tagging Standards

Apply these tags on all billable resources (compute, storage, networking, data pipelines):

| Key                   | Value                                                                             | Notes                                                             |
| --------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `env`                 | `dev`, `staging`, `prod`, `sandbox`                                               | Aligns with deployment tier.                                      |
| `service`             | Owning service name (e.g., `maestro`, `intelgraph-api`, `ops-worker`)             | Matches repo module/service identifiers.                          |
| `app`                 | Product area (e.g., `maestro_conductor`, `intelgraph`)                            | Stable across deploy units.                                       |
| `feature`             | Feature flag or capability (e.g., `maestro_planning`, `intelgraph_summarization`) | Optional for shared infra; mandatory for feature-specific stacks. |
| `tenant`              | Tenant slug/ID when isolatable (e.g., `tenant-acme`)                              | Use `multi-tenant` when shared.                                   |
| `owner`               | Squad or DRI (e.g., `team-observability`, `sre`)                                  | Used for escalations and approvals.                               |
| `data_classification` | `public`, `internal`, `confidential`, `restricted`                                | Ensures consistent guardrails.                                    |
| `cost_center`         | Finance code when required                                                        | Supports chargeback.                                              |

**Guardrails**

- Tags must be applied through Terraform or Helm templates; block deployments when required tags are missing.
- Avoid PII in tag values; use stable IDs instead of user-provided names.
- Keep tag keys stable to preserve historical cost slices and alerts.

## LLM Cost Attribution Model

We attribute every model call using token accounting and a static, configurable rate table.

- **Rate table**: `vendor:model -> {input_per_1k, output_per_1k}` in USD. Configure via environment or injected config (default table lives next to the LLM client).
- **Per-call attribution**: `prompt_tokens / 1000 * input_rate + completion_tokens / 1000 * output_rate` → `cost_usd_estimate`.
- **Dimensions**
  - `provider` (vendor), `model`.
  - `feature` (e.g., `maestro_planning`, `intelgraph_summarization`).
  - `tenant` (if a tenant ID is available on the request context; otherwise `multi-tenant`).
  - `environment` (`dev`/`staging`/`prod`).
- **Data capture**
  - Record prompt + completion token counts for every call.
  - Persist a non-sensitive usage log (`logs/llm-usage.ndjson` by default) with metadata only: vendor, model, feature, tenant ID, environment, token counts, and cost estimate.
  - Emit OpenTelemetry metrics:
    - `llm_cost_usd_total` (counter) with attributes vendor/model/feature/tenant/environment.
    - `llm_tokens_total` (counter) tagged by `segment=prompt|completion` plus the same attributes.

## Tenant & Feature Mapping

- **Maestro**
  - Planning calls → `feature=maestro_plan`.
  - Action/agent calls → `feature=maestro_action`.
- **Intelgraph summarization**
  - Narrative generation → `feature=intelgraph_summarization`.
- **Fallback**
  - When no feature is provided, default to `feature=unspecified` and `tenant=multi-tenant`.

## Reporting Expectations

- **Dashboards** use the OTEL metrics above, aggregating cost and tokens by feature and tenant.
- **Offline reports** (see `scripts/ops/llm-cost-report.ts`) read the usage log to produce CSV/console summaries for finance reviews.
- **Budgets & alerts**
  - Per-environment budgets in AWS Budgets.
  - Alerting on cost anomalies uses tags `service`, `env`, and `feature` to scope signals.

## Security and Privacy

- Do not log prompts or completions—only metadata and token counts.
- Keep tenant identifiers non-PII (UUIDs or slugs) and avoid user-provided names.
- Ensure usage logs rotate in production (ship to object storage with lifecycle policies).
