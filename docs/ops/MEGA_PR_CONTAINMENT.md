# Mega-PR Containment Strategy

> Generated: 2026-01-03
> Threshold: PRs with >10,000 lines or >100 files

## Executive Summary

| PR     | Title                                | Files | Lines    | Risk         | Recommendation                      |
| ------ | ------------------------------------ | ----- | -------- | ------------ | ----------------------------------- |
| #15486 | Complete Summit Platform Enhancement | 2,358 | +146,826 | **CRITICAL** | Close & re-submit as 6+ focused PRs |
| #15507 | Platform Enhancement Components      | 710   | +81,608  | **HIGH**     | Split into 4 PRs                    |

---

## PR #15507 Analysis

**Title**: Platform Enhancement Components
**Files**: 710 | **Additions**: +81,608 | **Deletions**: -0

### File Breakdown

| Category                    | Files | Lines   | Notes                             |
| --------------------------- | ----- | ------- | --------------------------------- |
| `client/adversarial/*`      | 28    | +10,260 | Adversarial defense UI components |
| `tools/issue-sweeper/*`     | 40    | +6,604  | Tooling data (mostly JSON ledger) |
| `server/src/*`              | 17    | +3,446  | Server-side code changes          |
| `server/*_test_output*.txt` | 10    | +3,115  | **REMOVE** - Generated artifacts  |
| `client/src/*` (other)      | 12    | +123    | Minor client changes              |
| `docs/*`                    | 2     | +138    | Documentation                     |

### Issues Identified

1. **Test output files committed** (10 files, ~3,115 lines)
   - `server/combined_test_output.txt` (+806)
   - `server/combined_test_output_2.txt` (+788)
   - `server/combined_test_output_5.txt` (+725)
   - Plus 7 more similar files
   - **Action**: Remove from PR, add to `.gitignore`

2. **Multiple unrelated features bundled**
   - Adversarial UI components (feature)
   - Issue sweeper tooling (tooling)
   - Server guardrails (feature)

### Recommended Split Strategy

#### Split A: Adversarial UI Components

```
client/src/components/adversarial/*
client/src/components/adversarial/__tests__/*
client/src/components/adversarial/context/*
client/src/components/adversarial/fixtures/*
client/src/components/adversarial/hooks/*
client/src/components/adversarial/services/*
client/src/components/adversarial/types/*
```

- **Est. Size**: 28 files, ~10,260 lines
- **Dependencies**: None (self-contained feature)
- **CI Impact**: Low (isolated components)

#### Split B: Server Guardrails & AI Copilot

```
server/src/ai/copilot/*
server/src/http/metricsRoute.ts
server/src/hunting/*
server/tests/*
```

- **Est. Size**: ~10 files, ~2,500 lines
- **Dependencies**: May depend on shared types
- **CI Impact**: Medium (affects server build)

#### Split C: Issue Sweeper Tooling

```
tools/issue-sweeper/*
```

- **Est. Size**: 40 files, ~6,604 lines
- **Dependencies**: None (standalone tool)
- **CI Impact**: None (not part of build)

#### Split D: Cleanup (Do First)

```
# Remove these files entirely:
server/combined_test_output*.txt
server/guardrails_test_output*.txt
server/vector_test_output*.txt

# Add to .gitignore:
*_test_output*.txt
```

- **Est. Size**: -3,115 lines
- **Action**: Must be done before other splits

---

## PR #15486 Analysis

**Title**: Complete Summit Platform Enhancement - All 6 Epic Capabilities
**Files**: 2,358 | **Additions**: +146,826 | **Deletions**: -236

### Risk Assessment: CRITICAL

This PR is **too large to review safely**. At 2,358 files and 146K+ lines:

- Review fatigue guarantees missed issues
- CI runtime will be excessive
- Merge conflicts highly likely
- Rollback scope is entire platform

### Visible Components (API limited to 100 files)

| Category                    | Files | Lines   |
| --------------------------- | ----- | ------- |
| `tools/issue-sweeper/*`     | 78    | +4,142  |
| `server/*_test_output*.txt` | ~12   | +4,000+ |
| `server/src/*`              | 5     | +183    |
| Other                       | ~5    | +200    |

### Recommended Action

**Close PR #15486** and re-submit as separate PRs by epic:

1. **Epic 1**: Core infrastructure changes
2. **Epic 2**: API/Server enhancements
3. **Epic 3**: Client UI features
4. **Epic 4**: Tooling updates
5. **Epic 5**: Documentation
6. **Epic 6**: Test coverage

Each epic PR should be:

- < 500 files
- < 5,000 lines
- Single reviewable theme
- Independent CI validation

---

## Immediate Actions

### For PR Authors

1. **Do not merge** mega-PRs in current state
2. Create feature branches for each split
3. Cherry-pick relevant commits to each branch
4. Open focused PRs with clear scope
5. Link back to original PR for context

### For Maintainers

1. Add `needs-split` label to mega-PRs
2. Block merge until split complete
3. Provide split guidance per this doc
4. Track split PRs in original PR comments

### Git Commands for Splitting

```bash
# Create split branch from mega-PR branch
git checkout <mega-pr-branch>
git checkout -b split/adversarial-ui

# Interactive rebase to select commits (or cherry-pick specific commits)
git log --oneline -- client/src/components/adversarial/
git cherry-pick <commit1> <commit2> ...

# Or use path-based checkout from mega-pr
git checkout main
git checkout -b split/adversarial-ui
git checkout <mega-pr-branch> -- client/src/components/adversarial/

# Clean up test output files
git rm server/*_test_output*.txt
echo "*_test_output*.txt" >> .gitignore
git add .gitignore
git commit -m "chore: remove test output artifacts, update gitignore"
```

---

## Monitoring

Track mega-PR status with:

```bash
./scripts/ops/pr_queue_snapshot.sh | grep "MEGA"
```

Current mega-PRs (>10k lines):

- #15486 (146,826 lines) - CRITICAL
- #15507 (81,608 lines) - HIGH
- Plus 11 others identified in PR queue

---

## References

- [PR Queue Triage](./PR_QUEUE.md)
- [Merge Train Documentation](./MERGE_TRAIN.md)
