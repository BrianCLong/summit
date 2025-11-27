# Repository Guidelines

## Project Structure & Module Organization

- Apps: `server/` (Node/Express/GraphQL), `client/` (React/Vite).
- Docs: `docs/` (guides) and `docs/generated/` (auto‑generated overviews).
- Data: `server/db/{migrations,seeds}/{postgres,neo4j}`.
- CI/Meta: `.github/`, `scripts/`, `project_management/`.

## Build, Test, and Development Commands

- Install: `npm install && (cd server && npm install) && (cd client && npm install)`.
- Dev: `npm run dev` (runs server and client concurrently).
- Test: `npm test` (server+client), server only: `cd server && npm test`.
- Lint/Format: `npm run lint && npm run format`.
- DB: `npm run db:migrate` and `npm run db:seed` (from repo root or `server/`).
- Docker: `npm run docker:dev` or `npm run docker:prod`.

## Coding Style & Naming Conventions

- JS/TS: 2‑space indent; Prettier + ESLint enforced. Conventional Commits required.
- Filenames: `kebab-case` for files/scripts; `PascalCase` for React components.
- Configs: `.editorconfig`, `.markdownlint.json`, `commitlint.config.js` present.

## Testing Guidelines

- Backend: Jest (`server/tests`), run with coverage: `cd server && npm run test:coverage`.
- Frontend: see client tests; e2e via Playwright: `npm run test:e2e`.
- Naming: `*.spec.ts`/`*.test.js` (client), `*.test.js` (server). Target ≥80% coverage for changed code.

## Commit & Pull Request Guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- PRs: concise description, linked issues (`Closes #123`), screenshots for UI; CI green required.
- Branches: `type/scope/short-desc` (e.g., `feat/ingest/rest-connector`).

## Web Codex Global Guidance

Run the following workflow when preparing scoped CI pull requests for the `feat/mstc`, `feat/trr`, and `feat/opa` branches:

```
set -euo pipefail

# verify required tooling up front so the workflow fails fast
for bin in git gh bash; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    printf 'Required dependency "%s" not found on PATH.\n' "$bin" >&2
    exit 1
  fi
done

# start clean
git fetch --all --prune

# branches to open first
for BR in feat/mstc feat/trr feat/opa; do
  if ! git show-ref --quiet --verify "refs/heads/$BR"; then
    printf 'Skipping branch %s because it does not exist locally.\n' "$BR" >&2
    continue
  fi

  git checkout "$BR"

  # sanitize diffs so PRs never include binaries/large files
  bash scripts/pr_sanitize.sh || true

  # rebase and push safely
  git fetch origin
  git rebase origin/main

  scope=$(printf '%s' "$BR" | cut -d/ -f2)
  if [ -z "$scope" ]; then
    printf 'Unable to derive scope segment from branch %s; skipping.\n' "$BR" >&2
    continue
  fi
  scope_upper=$(printf '%s' "$scope" | tr '[:lower:]' '[:upper:]')

  # push with lease and open PR with scoped title/labels
  git push --force-with-lease -u origin "$BR"

  gh pr create \
    --title "[$scope_upper] Scoped CI: ready for review" \
    --body-file docs/pr-runbook-card.md \
    --label "ci:scoped","ready-for-ci" \
    --base main \
    --head "$BR" || true
done
```

## Security & Configuration Tips

- Use `.env` (copy from `.env.example`); never commit secrets.
- Helmet + CORS defaults are enabled; restrict `CORS_ORIGIN` in prod.
- Run `scripts/bootstrap_github.sh` to set up labels/milestones and import issues.

## Agentic Control Plane

We have introduced an **Agentic Control Plane** to automate the lifecycle of AI tasks.

### CLI Tool: `summitctl`
Use `npx summitctl` to manage agent tasks.
- `init`: Start a new mission.
- `status`: View active tasks.
- `archive`: Close out a task.

See [docs/AGENT_OPS_HANDBOOK.md](docs/AGENT_OPS_HANDBOOK.md) for details.

### Automation
- Branches under `agentic/**` are automatically monitored.
- CI/CD automatically opens PRs when gates (OPA, Security) pass.
- Metrics are available at `/agentic/metrics`.
