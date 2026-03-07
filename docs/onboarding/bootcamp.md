# New Engineer Bootcamp

Welcome to Summit/IntelGraph! This bootcamp is a two-day guided path to get you productive quickly. It focuses on the happy-path developer environment (macOS + Docker Desktop + pnpm), with notes for Linux/WSL where helpful.

## Outcomes

- ✅ Day 0: Required tools installed, accounts set up, and access confirmed.
- ✅ Day 1: Stack running locally; you can hit key endpoints and run the test suite.
- ✅ Day 2: You make a small change, open a PR, and share learnings.

## Day 0 — Environment Setup

### Tools

- **Node.js**: 18.18+ (LTS recommended). Install via [mise](https://github.com/jdx/mise) or `fnm`.
- **pnpm**: 9.12.0+ (matches `packageManager` in `package.json`).
- **Docker Desktop**: Latest stable with Docker Compose v2.
- **Git**: With SSH configured for GitHub access.
- **Optional**: `mkcert` for HTTPS locally, `psql` and `cypher-shell` for DB troubleshooting.

### Access & Credentials

- GitHub access to the repository with clone permissions.
- Copy `.env.example` to `.env` at repo root; adjust secrets only if provided by ops. **Never commit secrets.**
- Confirm VPN/SSO if required by your org (some cloud endpoints are IP-restricted).

### Fast Setup Checklist

1. Clone the repo and switch to the bootcamp branch you were given.
2. Install tooling: `corepack enable && pnpm env use --global 18` (or `mise use node@18`), then `pnpm install`.
3. Verify: `pnpm --version`, `node -v`, `docker info`, `docker compose version`.
4. Run the automated check: `pnpm bootcamp:check`.

## Day 1 — Run the Stack & Validate

### 1) Install & Seed

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
```

### 2) Start the platform

```bash
pnpm dev
```

- Starts server + client via Turborepo. First run can take a few minutes while caches warm.

### 3) Hit key endpoints

- **Frontend**: http://localhost:3000 (expect the IntelGraph landing view).
- **GraphQL**: http://localhost:4000/graphql → run `{ health }` or a simple `ping` query.
- **Neo4j Browser**: http://localhost:7474 (user `neo4j` / `devpassword` by default).
- **Postgres**: connect via `psql $DATABASE_URL` and `\dt` to list tables.

### 4) Run checks

```bash
pnpm bootcamp:check
pnpm test:quick       # fast confidence pass
pnpm lint && pnpm typecheck
```

If something fails, capture logs (`docker compose logs -f`) and note fixes in your bootcamp doc/issue.

## Day 2 — Guided Change & PR

Pick one of the bootcamp starter tasks (or use the issue template `bootcamp-task`):

- Add a focused unit test that covers an IntelGraph resolver or service utility.
- Improve an endpoint doc (GraphQL SDL or REST markdown) with parameters and sample requests.
- Fix a small bug labeled **good-first-issue** or **bootcamp**.
- Add a metric or log line around a common failure path (wrap with existing logging utilities).

### Workflow

1. Create a branch: `git checkout -b feature/<your-handle>-bootcamp`.
2. Make the change. Keep diffs small and well-documented.
3. Run verification: `pnpm lint`, `pnpm typecheck`, `pnpm test:quick` (or targeted tests).
4. Open a PR with:
   - Summary of change and testing evidence.
   - Notes on any flakes or setup hurdles you hit.
5. Share your PR link in the team channel for async review.

## Common Pitfalls & Fixes

- **Docker not running**: Start Docker Desktop and rerun `pnpm bootcamp:check`.
- **Port conflicts**: Stop other apps using 3000/4000/7474/5432 or adjust `.env` ports.
- **pnpm cache issues**: Run `pnpm store prune` then reinstall.
- **Neo4j auth errors**: Ensure `NEO4J_USER/NEO4J_PASSWORD` in `.env` match docker compose.
- **Flaky tests**: Re-run with `CI=1 pnpm test:quick`; gather logs and note the failing spec in your issue.

## Where to ask for help

- `#eng-devex` (setup issues), `#intelgraph-backend`, `#intelgraph-frontend` for domain questions.
- Ping your onboarding buddy with command outputs and log snippets.
