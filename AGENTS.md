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

## Security & Configuration Tips
- Use `.env` (copy from `.env.example`); never commit secrets.
- Helmet + CORS defaults are enabled; restrict `CORS_ORIGIN` in prod.
- Run `scripts/bootstrap_github.sh` to set up labels/milestones and import issues.
