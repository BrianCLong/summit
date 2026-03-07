# Repository Assumptions and Verified State

## Verified

- GitHub Actions workflow files exist and suggest an active CI surface (e.g., `ci.yml`, `aeip_ci.yml`, `agentic-evals.yml`, `agentic-evals-robust.yml`, `agentplace-drift.yml`, `agentplace-policy.yml`, `api-docs-validation.yml`, `asset-inventory.yml`).
- The repository is a multi-service workspace (`intelgraph-api`, `gateway`, etc.).
- There are established patterns for GraphQL schemas, agent architectures, and deployment manifests.

## Assumed

- **Source Tree Paths**: We assume the existence and correctness of paths such as `src/connectors/`, `src/graphrag/`, `src/agents/`, `src/api/graphql/`, `src/dashboard/`, and scripts like `scripts/benchmarks/`.
- **Evidence Schema**: The exact JSON schema definitions for validation are assumed to follow Draft 2020-12 located within standard directories (e.g., `data/cloud/`, `docs/standards/`).
- **Scripts and Workflows**: We assume `pnpm docs:lint`, `pnpm test:ai-infra-stack-spec`, and `pnpm test:ai-infra-evidence-schema` represent intended CI entry points that may need setup.
- **Must-Not-Touch Files**: We assume we should avoid mutating core CI files (like `.github/workflows/ci.yml`) unless we are implementing an explicit addition like `ai-infra-stack.yml`.
