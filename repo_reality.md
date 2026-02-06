# Repo Reality Report

## A. Verified Facts

| Item             | Value | Evidence |
| ---------------- | ----- | -------- |
| Primary language | TypeScript (Node.js 18+) | `package.json` engines, `tsconfig.json`, `list_files` |
| Package manager  | pnpm (v10.0.0) | `package.json` engines, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| Monorepo tool    | pnpm workspaces + Turbo | `package.json` workspaces, `turbo.json` |
| CI system        | GitHub Actions | `.github/workflows/` directory populated |
| Test runner(s)   | Jest (backend), Playwright (E2E), Vitest (utils) | `jest.config.cjs`, `playwright.config.ts`, `vitest.config.ts` |

## B. CI / Workflow Reality

| Workflow filename | Workflow name (exact) | Trigger | Required-check candidate |
| ----------------- | --------------------- | ------- | ------------------------ |
| `pr-quality-gate.yml` | (Unknown, likely "PR Quality Gate") | `pull_request` (implied by name/AGENTS.md) | **YES** (Source of Truth per AGENTS.md) |
| `ci.yml` | (Unknown, likely "CI") | `push`, `pull_request` | Yes |
| `ci-pr.yml` | (Unknown, likely "CI PR") | `pull_request` | Yes |
| `agent-guardrails.yml` | (Unknown) | Likely PR/Push | Relevant for context |

## C. File-Path Verification

| Planned Path | Exists? (Y/N) | Actual Path | Notes |
| ------------ | ------------- | ----------- | ----- |
| `AGENTS.md` | Y | `AGENTS.md` | **CRITICAL**: Already exists with governance rules. |
| `docs/` | Y | `docs/` | Extensive documentation present. |
| `src/` | N | `server/src` / `client/src` | Monorepo structure: `server/src`, `client/src`, `packages/*/src`. |
| `scripts/` | Y | `scripts/` | |
| `.github/workflows/` | Y | `.github/workflows/` | |
| `summit/` | Y | `summit/` | Likely Python module root? |
| `package.json` | Y | `package.json` | |
