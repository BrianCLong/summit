# Maestro Next-Set Pack — Policy Explain, Serving Trends, Evidence Export, Build Green (2025‑09‑01)

This pack layers on your latest features with four targeted upgrades:

1. **Router Decision → Policy Explain (full trace)**: a button in the Node Inspector opens a dialog showing allow/deny, reasons, and rule trace using your existing `POST /policies/explain` contract.
2. **Serving Lane mini-trends**: add line charts (qDepth, batch size, KV hit ratio) under Observability’s Serving panel.
3. **Evidence export**: one-click download of the run’s provenance JSON + SBOM artifact deep link when available.
4. **Full-build green (optional)**: provide a typesafe `src/App.tsx` shim and a `tsconfig.build.json` profile to compile the whole repo cleanly without `@ts-nocheck`. (Adjust to your structure if needed.)

## Apply

```bash
git checkout -b feature/maestro-nextset-0901

# Router Decision: Policy Explain
git apply patches/frontend_routerdecision_policy_explain.patch || true
cp new_files/components/PolicyExplainDialog.tsx conductor-ui/frontend/src/maestro/components/PolicyExplainDialog.tsx

# Serving Lane: mini-trends
git apply patches/frontend_observability_serving_trends.patch || true
cp new_files/pages/ServingLaneTrends.tsx conductor-ui/frontend/src/maestro/pages/ServingLaneTrends.tsx

# Evidence: export + SBOM link
git apply patches/frontend_evidence_export.patch || true
cp new_files/utils/download.ts conductor-ui/frontend/src/maestro/utils/download.ts

# (Optional) Full-build green profile
git apply patches/build_full_green_tsconfig.patch || true
git apply patches/build_full_green_app_shim.patch || true

git add -A
git commit -m "feat(maestro): policy explain dialog, serving mini-trends, evidence export, build profile"
```

## Notes

- Charts reuse your existing `recharts` setup; if not installed, our wrapper gracefully degrades to lists.
- The App shim is **optional**; it replaces `src/App.tsx` with a strict-safe shell if your main app still blocks CI.
- All changes are additive within `/maestro` and can be reverted independently.
