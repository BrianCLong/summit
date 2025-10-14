# Universal PR Creator

## Summary

- Restore the repository to its pre-MVPL spike state by reverting the "Fix MVPL runner determinism" changes.
- Standardize repository hygiene with enforced `.gitattributes` and `.gitignore` rules that prevent large artifacts from entering future diffs.

## Acceptance Criteria Mapping

- **AC-1:** Oversized MapViz/MOTC/CRUL/etc. scaffolding is removed so the diff is reviewable. ✅
- **AC-2:** Global ignore and attributes guardrails match the release engineering spec to block generated assets and binaries. ✅

## Gates

- [BLOCKER] `npm test` (revert-only change; run to confirm no regressions).
- [BLOCKER] `gh workflow run ci.pr.core.yml` (kick off the main CI suite once merged).

## Evidence

- Revert commit `3f26012e` deletes the MVPL/MOTC/CRUL/PRDC/NCSS/BSGD/SBFS/HLCK scaffolding that caused the oversize diff.
- Hygiene commit `a06ffcc6` enforces the sanitized `.gitattributes` and `.gitignore` baselines.

## SBOM / Attestations

- [BLOCKER] `make sbom` (generate refreshed supply-chain artifacts after the revert lands).

## Rollback Plan

- Re-apply commit `db0cc31e` if we need to restore the MVPL runner and related scaffolding.
