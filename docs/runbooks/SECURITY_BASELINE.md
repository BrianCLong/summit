# Security Baseline Runbook

## Overview
This document outlines the security baseline configured for this repository, including automated scanning (CodeQL) and dependency management (Dependabot).

## Automated Scanning (CodeQL)

### What Runs
- **Tool**: GitHub CodeQL
- **Languages Scanned**:
  - `javascript-typescript`
  - `python`
  - `go`
- **Schedule**:
  - Triggers on `pull_request` (targeting `main`/`master`)
  - Triggers on `push` (to `main`/`master`)
  - Weekly scan (Sundays at 01:30 UTC)
  - Manual trigger via `workflow_dispatch`

### Build Strategy
The workflow attempts to set up a standard environment (`pnpm install --frozen-lockfile`) before running `autobuild`. This ensures `javascript-typescript` analysis has access to type definitions for better accuracy.

### Troubleshooting
If CodeQL analysis fails:
1. Check the "Autobuild" step logs.
2. If the failure is due to missing dependencies, ensure the `pnpm install` step succeeded.
3. If `autobuild` fails to detect the build system, manual build steps may need to be added to `.github/workflows/codeql.yml`.

## Dependency Updates (Dependabot)

### Configuration
- **File**: `.github/dependabot.yml`
- **Ecosystems**: `npm`, `github-actions`, `gomod`, `cargo`
- **Schedule**: Weekly (Mondays)

### Scoped Directories
Due to the monorepo structure and Dependabot limitations (no wildcard directory support), the following key directories are explicitly configured:
- `/` (Root)
- `/server`
- `/client`
- `/apps/web`
- `/apps/search-engine`
- `/apps/slo-exporter`
- Go and Cargo are scanned at Root.

**Note**: If you add a new critical service or app, you must manually add its directory to `.github/dependabot.yml`.

### Grouping Strategy
To reduce PR noise, updates are grouped:
- **`dev-dependencies`**: Groups all `devDependencies` (e.g., eslint, typescript, test libs).
- **`runtime-dependencies`**: Groups all `dependencies` (e.g., react, express).
- **`github-actions`**: Groups all GitHub Action updates.
- **`minor-and-patch`**: Groups updates for Go and Cargo.

### Tuning
- **Open PR Limit**: Set to 10 per directory to prevent flooding.
- **Ignores**: No explicit ignores are currently configured. If a specific package causes issues, add an `ignore` block to `dependabot.yml`.

## Manual Triggers
- **CodeQL**: Go to Actions -> CodeQL -> Run workflow.
- **Dependabot**: Go to Insights -> Dependency graph -> Dependabot -> Check for updates.
