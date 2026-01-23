# Draft PR Promotion Protocol

**Effective:** 2026-01-23 (Post-Stabilization Baseline)
**Status:** Active
**Owner:** Release Captain

---

## Purpose

Prevent silent queue re-accumulation by establishing clear classification criteria and SLA enforcement for draft PRs. This protocol ensures the merge queue reflects _intentional throughput_ rather than _accumulated debt_.

---

## Current State (Baseline)

| Metric           | Value                           |
| ---------------- | ------------------------------- |
| Total Draft PRs  | 28                              |
| Oldest           | 2026-01-19 (4 days)             |
| Primary Author   | `app/google-labs-jules` (agent) |
| Age Distribution | 16 @ 4d, 4 @ 3d, 3 @ 2d, 5 @ 0d |

---

## Classification Criteria

### Tier 1: PROMOTE TO READY

PRs that meet ALL of the following:

- [ ] Passes CI (or would pass with branch update)
- [ ] Has clear, scoped objective
- [ ] No blocking dependencies
- [ ] Ready for human review

**Action:** Mark ready via `gh pr ready <number>`

### Tier 2: NEEDS WORK

PRs that have:

- [ ] Identifiable technical gaps
- [ ] Missing tests or documentation
- [ ] Dependency on other unmerged work
- [ ] Scope ambiguity requiring clarification

**Action:** Add label `needs-work` + comment with specific next step

### Tier 3: ARCHIVE/CLOSE

PRs that are:

- [ ] Superseded by merged work
- [ ] Exploratory/experimental with no path to merge
- [ ] Stale with no activity > 7 days AND no clear owner
- [ ] Duplicate of existing PR

**Action:** Close with comment explaining supersession/obsolescence

---

## Draft SLA Rules

| Age       | Required Action                                   |
| --------- | ------------------------------------------------- |
| 0-3 days  | Normal review cycle                               |
| 4-7 days  | Must have: owner + next step documented           |
| 8-14 days | Escalation: promote, assign work, or close        |
| 15+ days  | Auto-close candidate (unless explicitly exempted) |

### Exemption Process

Long-running draft PRs may be exempted if:

1. Tagged with `long-running` label
2. Has documented justification in PR description
3. Reviewed weekly by Release Captain

---

## Triage Execution Checklist

Run weekly (minimum) or after major stabilization events:

```bash
# List all drafts sorted by age
gh pr list --repo BrianCLong/summit --state open --json number,title,createdAt,isDraft \
  | jq -r '.[] | select(.isDraft) | "\(.createdAt | split("T")[0]) #\(.number): \(.title | .[0:50])"' \
  | sort

# Count by age bucket
gh pr list --repo BrianCLong/summit --state open --json createdAt,isDraft \
  | jq -r '.[] | select(.isDraft) | .createdAt | split("T")[0]' \
  | sort | uniq -c
```

---

## Category Reference (Current Queue)

Based on title analysis of current 28 draft PRs:

| Category             | Count | Examples                                 |
| -------------------- | ----- | ---------------------------------------- |
| CI/CD Infrastructure | ~8    | Merge queue, golden path, SLSA           |
| Security/Hardening   | ~6    | Multer DoS, gateway headers, CodeBreaker |
| Governance/Evidence  | ~5    | GA evidence, Fresh Evidence Rate         |
| Narrative/OSINT      | ~5    | OSINT slice, narrative detection         |
| UX/Performance       | ~2    | Bolt debounce, Palette search            |
| Strategic/Docs       | ~2    | Total Advantage, Moat the Summit         |

---

## Integration with GA Readiness

Draft PRs classified as **Tier 1 (Promote)** should be evaluated against GA criteria:

- Does this PR close a GA blocker?
- Does this PR add GA-required functionality?
- Is this PR on the critical path?

If yes to any: **Priority promote and merge.**

---

## Metrics to Track

Post-protocol, track weekly:

1. **Draft PR count** (target: < 20)
2. **Average draft age** (target: < 5 days)
3. **Promotion rate** (drafts → ready → merged)
4. **Close rate** (drafts → closed without merge)

---

## Revision History

| Date       | Change                                          |
| ---------- | ----------------------------------------------- |
| 2026-01-23 | Initial protocol established post-stabilization |
