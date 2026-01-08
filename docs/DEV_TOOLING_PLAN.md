# Developer Tooling Plan (MVP3/GA)

## Vision

"Engineers ship, not wrestle tools."

## Roadmap

| Area          | Initiative                                              | Status         | Owner    |
| :------------ | :------------------------------------------------------ | :------------- | :------- |
| **Local Dev** | **One-Command Start** (`make up`)                       | ✅ Done        | Platform |
| **CI/CD**     | **Parity Checks** (Local matches CI)                    | 🚧 In Progress | DevOps   |
| **CI/CD**     | **Preview Environments** (Ephemeral PR envs)            | 📅 Q3          | DevOps   |
| **Templates** | **Service Scaffolding** (Create new service with 1 cmd) | 📅 Q3          | Platform |
| **Docs**      | **Developer Portal** (Backstage or similar)             | 📅 Q4          | Docs     |
| **Ops**       | **Migration Tooling** (Safe schema changes)             | ✅ Done        | Backend  |

## Tooling Inventory

### CLI Tools

- `summitctl`: The unified CLI for the platform.
  - `init`: Bootstrap env.
  - `check`: Run lint/types/tests.
  - `deploy`: Deploy to environment.

### Scripts

- `scripts/bootstrap.sh`: Sets up dependencies.
- `scripts/migrate.ts`: DB migrations.

## Productivity Metrics

We track:

- **Cycle Time**: Code commit to production deploy.
- **Review Latency**: Time waiting for PR review.
- **CI Duration**: Time to run the pipeline.
- **Flake Rate**: % of false negative CI runs.

## Quarterly Retro

- Survey developers on top friction points.
- Ship one major improvement per quarter.
