# Cost Taxonomy & Ownership

This document defines the cost domains for Summit, their owners, and budget units. All costs must be classified into one of these domains.

## Overview

Summit operates on a **cost-by-design** principle. Every workload has a budget and an owner. Cost regressions fail fast, and optimization is continuous.

## Cost Domains

| Domain ID       | Description                                               | Owner             | Budget Unit         |
| :-------------- | :-------------------------------------------------------- | :---------------- | :------------------ |
| `agent_runs`    | Standard Agent runs (by capability class)                 | `@agent-platform` | Run Credits         |
| `coordination`  | Multi-agent coordination and message passing              | `@agent-platform` | Operations          |
| `evaluation`    | Evaluation, self-testing, and benchmark runs              | `@quality`        | Compute Minutes     |
| `write_actions` | Opt-in write actions (e.g., external API mutations)       | `@security`       | Action Tokens       |
| `marketplace`   | Plug-ins, third-party integrations, and marketplace usage | `@partners`       | Marketplace Credits |
| `ci_assurance`  | CI pipeline execution and scheduled assurance jobs        | `@devops`         | CI Minutes          |

## Cost Ownership

- **@agent-platform**: Responsible for the efficiency of agent execution and inter-agent communication.
- **@quality**: Responsible for the cost of maintaining quality standards via automated evaluations.
- **@security**: Responsible for the cost of high-risk write operations.
- **@partners**: Responsible for costs associated with external ecosystem extensions.
- **@devops**: Responsible for the cost of the build and verification infrastructure.

## Attribution Strategy

1.  **Tagging**: All infrastructure resources (e.g., EC2, RDS, OpenAI) must be tagged with `CostDomain`.
2.  **Telemetry**: All application metrics (e.g., `maestro_run_duration_seconds`) must be labeled with `tenant_id` and `cost_domain`.
3.  **Traceability**: Distributed traces must propagate `x-cost-domain` headers.

## Governance

- **Budget Exceeded**: Action is HALTED immediately (Hard Stop).
- **Forecasting**: Spend is forecasted daily.
- **Alerting**: Owners are notified at 50%, 80%, and 100% of budget.
