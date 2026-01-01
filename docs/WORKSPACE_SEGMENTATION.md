# Workspace Segmentation Plan

The repository is now organized into three intentional workspaces managed by Turborepo. The segmentation keeps frontend delivery, backend services, and shared platform capabilities isolated so CI can target only the layers affected by a change.

## Workspace definitions

Workspaces are declared in `workspaces/workspace-manifest.json` and kept stable for CI filters:

- **frontend** – user-facing experiences (client, web/webapp shells, UI kits, and mobile-facing shells).
- **backend** – API and ingestion edges (server, API gateway, graph/search surfaces, analytics and workflow engines, and service bundles).
- **core-services** – shared SDKs, libraries, observability, infra automation, and cross-cutting tools.

You can adjust membership by editing the manifest; Turborepo caches are automatically invalidated when it changes.

## Running scoped tasks

Use the workspace runner to execute tasks only where they are defined:

```bash
# Build only the frontend workspace (filters to packages in the manifest)
npm run workspace:build:frontend

# Lint backend services only
npm run workspace:lint:backend

# Run backend tests without touching UI caches
npm run workspace:test:backend

# Run the same task across every workspace (default)
npm run workspace:run -- build
```

The runner forwards extra Turborepo flags after `--`, e.g. `npm run workspace:build:frontend -- --no-cache`.

## CI guidance

- Prefer `npm run workspace:build:<workspace>` for per-surface pipelines to cut job time.
- Use `npm run workspace:run -- <task> all --filter=<additional>` when a release touches multiple surfaces but needs tighter scoping.
- `turbo.json` includes the workspace manifest as a global dependency so cache keys rotate whenever the topology changes.

## Governance

Keep the manifest and `pnpm-workspace.yaml` aligned when new packages are added. Changes to the manifest should be accompanied by a short note in `docs/roadmap/STATUS.json` so platform owners can track workspace evolution.
