# PR Notes

## Legacy Evidence Handling
- Existing evidence bundles in `evidence/` (e.g., EVD-*) do not consistently follow the new structure (missing `index.json`).
- The `.github/scripts/verify-evidence.mjs` script has been adapted to:
  1. Verify the integrity of `evidence/index.json`.
  2. Verify that all files referenced in `evidence/index.json` exist.
  3. Strictly enforce the new structure (including `index.json`) ONLY for the new bundle `evidence/ai-platform-dev-2026-02-07`.

## Verification
- Run `pnpm run verify:evidence` locally and in CI.
