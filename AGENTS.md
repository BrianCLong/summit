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

for scope in mstc trr opa; do
  scope_upper="$(echo "$scope" | tr '[:lower:]' '[:upper:]')"
  BR="feat/${scope}"
  git checkout "$BR" || git checkout -b "$BR" origin/"$BR"
  git pull --rebase origin "$BR"
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

# Agentic Role Ownership Matrix
| Agent                | Orchestration File Responsibility                     | Specialty       | KPIs (Proof-by)            |
| -------------------- | ----------------------------------------------------- | --------------- | -------------------------- |
| Doc IG               | `AGENTS.md`, Runbooks, Delivery Plan                  | Documentation   | Drift<=1 day; 100% xrefs   |
| Maestro Conductor IG | Flow mapping, handoff, orchestration docs             | Workflow Design | p95 handoff<=5m; SLO green |
| Confidential Design  | Security, access, adversarial docs                    | InfoSec/Threat  | 0 critical findings        |
| Topicality/BIZ IG    | Delivery plan, business impact notes in workflow docs | Ops/Business    | ROI<=8w; DP signings       |
| Angleton/Council IG  | Policy & threat analysis; inline risk tags            | Adversarial     | Policy pass rate>=99%      |

## Fast Lane: Agent Chain Handoff Optimization
Critical handoffs (Planner→Scaffolder→Implementer→Tester→Reviewer→Docs) auto‑promote **iff**:
- All SLOs green for current slice
- Provenance manifest attached to artifacts
- Policy simulation passes (OPA allow)

Signals: CI "fastlane.ok" artifact + trace span `maestro.fastlane=true`.

## TODOs: Velocity Patches
- Complete OpenAPI plugin for orchestration API
- Activate VS Code extension for workflow/manifest validation
- Patch CI templates for Maestro ops and "fast lane" auto‑promotion
- Integrate friction/latency monitors into CI dashboards
- Enable auto-rollback on SLO breach detection

## Dashboard & Monitoring Links
- **Main Dashboard**: [GitHub Actions](https://github.com/BrianCLong/summit/actions)
- **CI/CD Pipeline**: [Projects Board](https://github.com/BrianCLong/summit/projects)
- **Issue Tracking**: [Issues](https://github.com/BrianCLong/summit/issues)
- **Pull Requests**: [PRs](https://github.com/BrianCLong/summit/pulls)
- **Discussions**: [Community](https://github.com/BrianCLong/summit/discussions)

## Friction & Latency Alert Thresholds
### Critical Alerts (Page immediately)
- Handoff latency p95 >10m for 2 consecutive intervals
- Policy violation rate >1% over 15m window
- Build failure rate >20% over 1h
- Deployment rollback triggered

### Warning Alerts (Notify on-call)
- Handoff latency p95 >5m for 3 intervals
- Test coverage drop >5% on PR
- CI queue depth >10 jobs for >30m
- Drift detection: orchestration docs out of sync >24h

### Monitoring Best Practices
- All agents log structured telemetry (OpenTelemetry format)
- Trace IDs propagate through entire handoff chain
- SLO dashboards updated real-time via CI artifacts
- Weekly friction reviews: identify top 3 bottlenecks and remediate
