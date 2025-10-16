# Maestro UI — Next Upgrades Patch Pack (2025-09-01)

This pack delivers **four** additive upgrades under `/maestro`:

1. **Graph Diff** visualization: highlights changed nodes, duration/cost deltas, and marks probable critical path.
2. **Grafana Embeds**: reusable `<GrafanaPanel />` + an **Observability** page (`/maestro/obs`) with sample panels.
3. **A11y Dev Toggle**: runtime opt‑in `@axe-core/react` checks (no prod cost) via `window.__MAESTRO_CFG__.a11y = "on"`.
4. **Routing Pin UI**: pin/unpin model with Policy Explain & audit note.

> Designed to work with your dev stub endpoints (runs compare, policy explain, routing pins).

## Apply (from repo root)

```bash
git checkout -b feature/maestro-ui-next-0901b

# 1) Frontend patches (idempotent; ignore if a given file doesn't exist)
git apply patches/frontend_app_routes_obs.patch || true
git apply patches/frontend_rundetail_obs_tab.patch || true
git apply patches/frontend_compare_import_graphdiff.patch || true
git apply patches/frontend_app_axe_toggle.patch || true
git apply patches/frontend_routingstudio_inject_pinpanel.patch || true

# 2) Add new components
mkdir -p conductor-ui/frontend/src/maestro/components conductor-ui/frontend/src/maestro/pages conductor-ui/frontend/src/maestro/utils
cp new_files/GraphDiff.tsx conductor-ui/frontend/src/maestro/components/GraphDiff.tsx
cp new_files/GrafanaPanel.tsx conductor-ui/frontend/src/maestro/components/GrafanaPanel.tsx
cp new_files/Observability.tsx conductor-ui/frontend/src/maestro/pages/Observability.tsx
cp new_files/RoutingPinPanel.tsx conductor-ui/frontend/src/maestro/components/RoutingPinPanel.tsx
cp new_files/a11yDev.ts conductor-ui/frontend/src/maestro/utils/a11yDev.ts

git add -A
git commit -m "feat(maestro-ui): graph diff, grafana embeds, a11y dev toggle, routing pin UI panel"
```

## Configure

In your HTML bootstrap or before app mounts:

```html
<script>
  window.__MAESTRO_CFG__ = Object.assign(window.__MAESTRO_CFG__ || {}, {
    grafanaBase: 'http://localhost:3000',
    grafanaDashboards: {
      slo: 'maestro-slo',
      overview: 'maestro-overview',
      cost: 'maestro-cost',
    },
    a11y: 'on', // remove or set 'off' to disable axe in dev
  });
</script>
```

## Routes

- `/maestro/obs` — Observability page with three sample embeds.
- `/maestro/runs/:id/compare` — now renders a **Graph Diff** section if graphs are provided.
