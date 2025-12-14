# Summit Environment Model & Lifecycle

This document defines the standard environment tiers for Summit, their purpose, guarantees, and configuration differences.

## Core Environments

| Environment | ID | Purpose | Scale/Isolation | Trigger | Risk Tolerance |
|---|---|---|---|---|---|
| **Local Dev** | `local` | Engineer's inner loop, feature dev. | Minimal (Docker Compose/Kind), seeded DB. | Manual (`./dev`) | High |
| **CI / Ephemeral** | `ci` | Automated testing, build validation. | Ephemeral (GitHub Actions), mocked services. | PR push | High |
| **Development** | `dev` | Integration testing, shared dev sandbox. | Shared cluster, scaled down. | Auto-deploy from `main` (optional). | Medium |
| **Staging** | `staging` | Pre-prod, QA, release verification. | Mirror of Prod (smaller scale), sanitized data. | Auto-deploy from `main` (post-CI). | Low |
| **Production** | `prod` | Live customer traffic. | Multi-zone, HA, full isolation. | Promotion from Staging (Tag/Approval). | Zero |

### Optional Environments
*   **Preview**: Ephemeral environments per PR for UI/Product review. Suffix: `pr-<number>`.

## Lifecycle & Promotion Flow

1.  **Code Commit**: Developer pushes code to `feature/*`.
2.  **CI**: `ci` env spins up for unit/integration tests.
3.  **Merge to Main**: Code merged to `main` branch.
4.  **Deploy to Staging**: CI pipeline deploys artifact to `staging`. Smoke tests run.
5.  **Promote to Prod**: Release tag created (or manual approval), deploying `staging` artifact to `prod`.

## Configuration Differences

| Config | Local | Staging | Prod |
|---|---|---|---|
| **Replicas** | 1 | 2+ (HA) | 3+ (Autoscaled) |
| **Database** | Local Postgres | Managed RDS (Dev tier) | Managed RDS (Prod tier, Multi-AZ) |
| **Logging** | Console | Aggregated (Info) | Aggregated (Info/Warn) + Archival |
| **Secrets** | `.env` file | Secrets Manager (Ref) | Secrets Manager (Strict) |
| **Domains** | `localhost` | `staging.summit.com` | `summit.com`, `app.summit.com` |
