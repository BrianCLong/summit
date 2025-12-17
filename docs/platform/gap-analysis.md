# Summit Platform Gap Analysis

## Infrastructure
*   **Gap**: Terraform code is scattered across `terraform/`, `infra/`, and `iac/`.
*   **Risk**: Hard to manage state, potential for drift.
*   **Plan**: Consolidate into `terraform/environments` and `terraform/modules`.

## Database Migrations
*   **Gap**: Postgres migrations (`scripts/db_migrate.cjs`) are applied blindly without a tracking table (unlike Neo4j).
*   **Risk**: Re-running migrations might fail or cause data corruption.
*   **Plan**: Adopt a proper migration tool like Flyway, Prisma Migrate, or implement a `_migrations` table check in the script.

## CI/CD
*   **Gap**: Workflow sprawl in `.github/workflows/` (over 100 files).
*   **Risk**: Hard to understand which workflow deploys what; high maintenance burden.
*   **Plan**: Consolidate into `ci-build.yaml`, `cd-deploy.yaml` using reusable workflows.

## Secrets
*   **Gap**: Secrets management is not strictly enforced; `.env` files are used heavily.
*   **Risk**: Leaked secrets.
*   **Plan**: Integrate External Secrets Operator with AWS/GCP Secrets Manager.
