# Repo Reality Check

## ✅ Verified
*   **Project 19 Exists**: Confirmed via `PR_ITEM_1.md` referencing "Implicit Resilience Debt".
*   **Item 1 Done**: `ErrorFallback.tsx` already has the A11y and focus management changes described in `PR_ITEM_1.md`.
*   **Missing Items 2-5**: `App.tsx` does not have granular error boundaries for `InvestigationCanvas`, `MaestroDashboard`, etc.
*   **Evidence Infrastructure**: `server/src/rag/evidence.ts` defines `EvidenceContract`. `scripts/release/generate_evidence_bundle.mjs` exists.
*   **Governance Gates**: `scripts/ci/` contains various gate scripts. `scripts/project19-enforcement.ts` is missing.

## ⚠️ Assumed (Explicit)
*   **Implicit Items 2-5**: I am assuming the content of Items 2-5 based on "Resilience Debt" context and Summit standards (Granularity, Policy, Evidence, Agentic).
*   **Feature Flagging**: I assume I can use the existing `FeatureFlagProvider` or a simple env var for the new Resilience Engine.
*   **Agentic Stub**: I assume a "Stub" agent response is sufficient for the "Agentic Error Recovery" feature in this MWS.

## Blast Radius List (Do Not Touch)
*   `.github/workflows/ci-template-optimized.yml`
*   `.github/workflows/ci-health-monitor.yml`
*   `server/src/rag/evidence.ts` (Core schema - extend only if necessary, prefer new types)
*   `docs/governance/` (Read-only reference)
