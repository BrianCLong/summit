# Merge Train Sequencing Report

**Status:** FINAL
**Authority Anchor:** Summit Readiness Assertion (see `docs/SUMMIT_READINESS_ASSERTION.md`).

## Governed Exception

- **Constraint:** `gh` CLI metadata is **Deferred pending gh availability** (network proxy blocks installation).
- **Impact:** Base branch, file overlap, mergeability, and CI checks are **Deferred pending gh** and must be rehydrated before execution.

## Evidence Bundle (UEF)

- **Open PR export:** `pr-open.json` (labels, draft status, updatedAt, reviewDecision).

## Merge Train Strategy

1. **Dependency bumps labeled `risk:low`** first.
2. **Low-risk feature/test/CI changes** next.
3. **Unlabeled/unknown risk** after low-risk train.
4. **`risk:high`** deferred until after low-risk stabilization.

## Execution Preconditions

- **Rehydrate gh metadata** before each merge wave.
- **CI green** per branch protection rules.
- **Rebase** if behind `main` or mergeable status is not clean.

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Tools, Observability, Security.
- **Threats Considered:** stale metadata, hidden conflicts, CI false-greens, toolchain gaps.
- **Mitigations:** evidence-first output, governed exceptions, deterministic ordering, post-merge monitoring.

## Finality

This report is **complete and executable** once gh metadata is rehydrated. All constraints are governed exceptions with explicit prerequisites.
