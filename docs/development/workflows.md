# Development Workflows

This document outlines the standard daily development patterns, testing guidelines, debugging strategies, and contribution models for Summit.

## Daily Development Patterns

### Development Scripts

The most common commands you will run daily across the monorepo:

- **`pnpm dev`**: Starts both the frontend and backend development servers concurrently.
- **`pnpm build`**: Builds all apps, services, and packages in the monorepo.
- **`pnpm lint`**: Lints the entire project using ESLint and Ruff (for Python).
- **`pnpm format`**: Formats the entire project using Prettier and Ruff.
- **`pnpm typecheck`**: Runs TypeScript compilation checks.

_(Note: Always run `pnpm install` after checking out new branches to ensure workspace dependencies are up-to-date and deterministic.)_

### Working with Specific Workspaces

Because Summit uses `pnpm` workspaces, you often want to target specific packages to avoid running a command over the entire monorepo:

- **Add dependency to a specific package**: `pnpm add <package> --filter apps/web`
- **Run a script on a single package**: `pnpm --filter services/api-gateway run dev`
- **Run a script on a package and its dependencies**: `pnpm --filter ...apps/gateway run build`

## Running Tests

Testing is divided by environment and concern. You should target an 80%+ code coverage for new and modified logic. Ensure you never leave `.only()` or `.skip()` in committed test files.

- **Unit & Fast Tests**: `pnpm test:quick`
  - Useful for testing individual TypeScript files locally. Use `--experimental-strip-types` for simple directories lacking a local `package.json`.
- **Monorepo Integration**: `pnpm test:integration`
  - Runs broader API and integration pipelines against infrastructure layers (e.g., Node + API).
- **End-to-End Tests**: `pnpm e2e`
  - Playwright-driven test suite for frontend and application workflows.
- **Golden Path Verification**: `make golden-path`
  - Runs complete health validation and tests from a clean state (alias: `make smoke` or `pnpm test:smoke`).

## Debugging Tips

### Service Logs

If an application is unresponsive or failing, stream logs from Docker Compose:

```bash
make logs
```

Or target specific services:

```bash
docker-compose logs -f server neo4j
```

### Checking Health and Observability

Ensure API endpoints and infrastructure are running properly:

```bash
curl http://localhost:4000/health
```

- **Prometheus**: Open `http://localhost:9090` to view active alerts and metrics configurations.
- **Grafana**: View visual traces at `http://localhost:3001` (default credentials are in your `.env`, fallback is `admin/admin`). Check that Jaeger traces are propagating.

### Graph Database (Neo4j)

If GraphRAG endpoints are missing data or the AI isn't finding intent links, inspect Neo4j directly:

```bash
docker exec -it <neo4j-container-name> cypher-shell -u neo4j -p test1234
```

Alternatively, open the Neo4j Browser at `http://localhost:7474`.

## How to Contribute

We follow a structured branch naming and Conventional Commit strategy to ensure automated release logging and clear historical lineage.

### Branch Naming Conventions

Use the format `type/scope/short-desc`:

- **Features**: `feat/ingest/rest-connector`
- **Fixes**: `fix/gateway/cors-issue`
- **Documentation**: `docs/development/setup-guide`
- **Chores**: `chore/deps/update-react`

### Conventional Commits

Commit messages must conform to standard conventions. A pre-commit hook runs `commitlint` on your changes.

- `feat: add new S3 ingestion connector`
- `fix: resolve missing Neo4j index on GraphRAG`
- `docs: update local setup guide`

### Pull Requests

- **PR Template**: Fill out the provided Pull Request template completely. Keep descriptions concise and link to any relevant Jira or GitHub issues (e.g., `Closes #123`).
- **Agent Metadata**: If an AI agent assisted with the PR, ensure the fenced JSON block `<!-- AGENT-METADATA:START -->` is included per the template.
- **CI Tiers**:
  - **PR Gate**: Runs automatically on new PRs for fast feedback on linting, typing, and targeted unit tests.
  - **Full CI**: Runs prior to merging to execute the complete matrix.
- **Review Process**: Changes must be approved by a human owner defined in `.github/CODEOWNERS`. Automated AI agents cannot self-approve.

### Code Style & Governance

- **JavaScript/TypeScript**: 2-space indentation. We use Prettier + ESLint.
- **Python**: Formatted with Ruff.
- **Secret Management**: Never commit secrets. Pre-commit hooks via `gitleaks` will block commits containing passwords or API keys. Ensure defaults in `package.json` and `.env.example` are secure placeholders.
