# Merge Queue Execution Plan

**Status**: READY
**Window**: GA Merge Window (Immediate)

## 1. Queue Strategy
This queue is ordered to maximize stability. Fixes are applied first to stabilize the base, followed by documentation updates, and finally infrastructure/test validation.

## 2. Priority 0: Critical Fixes
| Sequence | PR # | Title | Owner | Action |
|---|---|---|---|---|
| 1 | 1366 | fix: re-enable diffs for lockfiles | BrianCLong | MERGE |
| 2 | 1602 | fix: sync provenance runtime surfaces | BrianCLong | MERGE |
| 3 | 1610 | fix: correct intelgraph api package metadata | BrianCLong | MERGE |

## 3. Priority 1: Documentation (Risk: Low)
| Sequence | PR # | Title | Owner | Action |
|---|---|---|---|---|
| 4 | 1703 | docs: integrate legal agreements into onboarding | BrianCLong | MERGE |
| 5 | 1614 | docs: add Conductor workstream planning artifacts | BrianCLong | MERGE |
| 6 | 1613 | docs: add day-1 architecture and security governance | BrianCLong | MERGE |
| 7 | 1609 | docs: add conductor summary backlog and raci for workstream 1 | BrianCLong | MERGE |
| 8 | 1605 | docs: add influence network detection framework blueprint | BrianCLong | MERGE |
| 9 | 1585 | docs: capture day-1 topology and decision records | BrianCLong | MERGE |
| 10 | 1434 | docs: correct persona onboarding guides | BrianCLong | MERGE |
| 11 | 1428 | docs: add onboarding tutorial scripts and transcripts | BrianCLong | MERGE |

## 4. Priority 2: Infrastructure & Verification (Risk: Moderate)
*Requires monitoring of CI capacity*

| Sequence | PR # | Title | Owner | Action |
|---|---|---|---|---|
| 12 | 1372 | ci: pin Node 18.20.4; run Jest in-band | BrianCLong | MERGE (Monitor Build) |
| 13 | 1594 | test: add automated quality gates evidence | BrianCLong | MERGE |
| 14 | 1454 | test: add k6 rollout canary scenario | BrianCLong | MERGE |
| 15 | 1378 | ci: add Deploy Dev (AWS) workflow | BrianCLong | MERGE |
| 16 | 1373 | ci: add nightly docker-enabled integration workflow | BrianCLong | MERGE |
| 17 | 1358 | test: expand policy reasoner coverage | BrianCLong | MERGE |

## 5. Execution Instructions
1.  **Check CI** for the top item.
2.  **Merge** via squash-merge.
3.  **Wait** for main branch build to pass (Green).
4.  **Proceed** to next item.
5.  **Stop** if any main build fails.

## 6. Post-Queue Action
*   Re-run `scripts/ci/verify_graph_rag_provenance.mjs`.
*   Generate `FINAL_READINESS_REPORT.md`.
