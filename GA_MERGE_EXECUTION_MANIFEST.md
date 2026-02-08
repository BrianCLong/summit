# GA Merge Execution Manifest

**Status:** READY
**Authority:** Jules (Release Captain)
**Merge Strategy:** Serial execution with full CI validation between steps.

## 1. Sequence Overview
The following PRs are identified for promotion from `DRAFT_PR_PROMOTION_LEDGER.md`. They must be merged in the order specified below.

### Phase 1: Critical Fixes & Stability (P0)
| Order | PR # | Title | Validation Command |
| :--- | :--- | :--- | :--- |
| 1 | 1366 | fix: re-enable diffs for lockfiles | `scripts/check-lockfiles.sh` |
| 2 | 1602 | fix: sync provenance runtime surfaces | `pnpm test:provenance` |
| 3 | 1610 | fix: correct intelgraph api package metadata | `pnpm build:intelgraph` |

### Phase 2: Infrastructure & CI (P1)
| Order | PR # | Title | Validation Command |
| :--- | :--- | :--- | :--- |
| 4 | 1372 | ci: pin Node 18.20.4; run Jest in-band | `node -v && pnpm test` |
| 5 | 1373 | ci: add nightly docker-enabled integration workflow | `ls .github/workflows/nightly.yml` |
| 6 | 1378 | ci: add Deploy Dev (AWS) workflow | `ls .github/workflows/deploy-dev.yml` |

### Phase 3: Testing & Quality Gates (P2)
| Order | PR # | Title | Validation Command |
| :--- | :--- | :--- | :--- |
| 7 | 1594 | test: add automated quality gates evidence | `scripts/verify_evidence.py` |
| 8 | 1454 | test: add k6 rollout canary scenario | `ls scripts/k6/canary.js` |
| 9 | 1358 | test: expand policy reasoner coverage | `pnpm test:policy` |

### Phase 4: Documentation & Compliance (P3)
| Order | PR # | Title | Validation Command |
| :--- | :--- | :--- | :--- |
| 10 | 1703 | docs: integrate legal agreements into onboarding | `ls docs/legal/` |
| 11 | 1614 | docs: add Conductor workstream planning artifacts | `ls docs/conductor/` |
| 12 | 1613 | docs: add day-1 architecture and security governance | `ls docs/governance/` |
| 13 | 1609 | docs: add conductor summary backlog and raci | `cat docs/conductor/BACKLOG.md` |
| 14 | 1605 | docs: add influence network detection framework | `ls docs/influence/` |
| 15 | 1585 | docs: capture day-1 topology and decisions | `ls docs/adr/` |
| 16 | 1434 | docs: correct persona onboarding guides | `ls docs/onboarding/` |
| 17 | 1433 | docs: correct persona onboarding guides (Cleanup) | `ls docs/onboarding/` |
| 18 | 1428 | docs: add onboarding tutorial scripts | `ls docs/onboarding/tutorials/` |

## 2. Abort Protocol
1. **CI Red:** Stop train immediately. Do not merge next PR.
2. **Lockfile Conflict:** Re-run `scripts/rebase-fix-lockfiles.sh` on blocked PR.
3. **Evidence Failure:** If `scripts/verify_evidence.py` fails, rollback the last merge.

## 3. Post-Merge Verification
After PR #1428 is merged:
- Run `pnpm ci:full`
- Run `node scripts/verify-ga.sh`
- Generate `FINAL_GA_READINESS_REPORT.md`
