# Docker Build Context Minimization

This document explains the minimized Docker build context strategy implemented to reduce build times and ensure determinism.

## Overview

Instead of sending the entire repository (which can be huge due to `node_modules`, artifacts, docs, etc.) to the Docker daemon, we generate a **Staged Context** in CI.

This context contains *only* the source code required to build the application.

## Staged Context Structure

The staged context is generated at `.out/docker-context/` and includes:

*   `Dockerfile` (copied from root)
*   `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json` (Root configs)
*   `server/` (Filtered source code, excluding `node_modules`, `dist`, `tests`)
*   `packages/` (Filtered source code, excluding `node_modules`, `tests`)

Everything else (`apps/`, `docs/`, `scripts/` (unless crucial), `infra/`) is excluded.

## How to Build

### Local Development

You can still build using the standard command from the root, which relies on `.dockerignore` to filter the context:

```bash
docker build .
```

The `.dockerignore` has been updated to strictly exclude `node_modules`, `out`, `artifacts`, etc.

### CI Build (Staged)

In CI, we first run the staging script:

```bash
node scripts/ci/stage_docker_context.mjs
```

Then we build using the staged context:

```bash
docker build -f .out/docker-context/Dockerfile .out/docker-context
```

This ensures that the build context is small (~60MB vs potentially GBs) and deterministic.

## Files

*   `scripts/ci/stage_docker_context.mjs`: Script to generate the context.
*   `.dockerignore`: Defines exclusions for local/root builds.
*   `.out/docker-context/MANIFEST.json`: Generated manifest of included files (CI only).
