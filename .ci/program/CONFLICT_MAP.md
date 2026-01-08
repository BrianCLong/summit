# Conflict Map

## Hard boundaries (no overlap):

- EP1: `server/src/policy/**`, `policies/**`
- EP2: `server/src/provenance/**`, `server/src/maestro/evidence/**`, `server/src/maestro/provenance/**`
- EP3: `server/data-pipelines/**`
- EP4: `client/src/components/workbench/**` + specific UI files
- EP5: `client/src/components/ai/**`
- EP6: `server/src/maestro/**` (routing/runs/pipelines/executors)
- EP7: `server/src/observability/**`
- EP8: `.github/**` (workflows/config only)
- EP9: `server/src/cache/**` (+ optional instrumentation only)

## Known “watch-outs”:

- EP2 vs EP6: both under `server/src/maestro/**` → keep EP2 confined to evidence/provenance subfolders; EP6 confined to routing/runs/pipelines/executors. No shared file edits.
- EP7 vs EP9: both may want metrics → EP9 should only _emit_ metrics via existing observability interface, not modify EP7 core.
