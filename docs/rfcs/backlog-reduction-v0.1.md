# RFC: Systemic Backlog Reduction v0.1

## Problem Statement
The current issue backlog has reached a state of "entropy" where the sheer volume of open tickets harms productivity:
* **Triage Cost**: New issues are buried; maintainers spend more time sorting than solving.
* **Review Drag**: Stale PRs and issues create mental overhead for reviewers.
* **Duplicate Work**: High noise makes it difficult to find existing discussions, leading to redundant tickets.
* **Obfuscation**: Critical bugs are hidden among low-priority feature requests or vague feedback.

## Principles
1. **Close by Default**: Issues without an active owner, clear acceptance criteria, or recent activity (within 30 days) should be closed.
2. **Evidence-First**: Issues must have a reproduction case or data-backed evidence to remain open.
3. **Consolidate**: Multiple issues describing the same root cause or goal must be merged into a single Epic or tracking issue.
4. **Label Taxonomy as Control Plane**: Labels are not just metadata; they drive automation and prioritization.

## Policy: The "Keep or Close" Criteria

### Criteria for KEEP
* **Active**: Assigned to a contributor with progress in the last 14 days.
* **Critical**: Security vulnerabilities or P0 regressions with a verified repro.
* **Approved RFC**: Issues linked to an approved RFC in the `docs/rfcs` directory.

### Criteria for CLOSE
* **Stale**: No activity for >30 days and not marked as `pinned`.
* **Vague**: Lacks "Expected vs Actual" behavior or environment details.
* **Duplicate**: Superseded by a more comprehensive issue.
* **No Repro**: Maintainers cannot reproduce the issue and the reporter hasn't responded to queries.

### Criteria for CONVERT TO EPIC
* Large features that require >3 distinct PRs should be moved to an Epic template.

## Process: Weekly Sweep Cadence
1. **Monday (Day Captain)**: Run the "Backlog Burn-down" script/query to identify stale issues.
2. **Tuesday (Maintainer Review)**: Apply `stale-closure-warning` labels.
3. **Friday (Cleanup)**: Bulk-close issues that reached the warning threshold.

## Automation Hooks
* **Stale Bot**: Automatically label issues with no activity after 30 days; close after 7 more.
* **Repro Checker**: Require the `has-repro` label for any `bug` to reach "Priority" status.
* **Label Invariants**: CI checks to ensure every open issue has at least one `status/` and one `type/` label.

## Metrics
* **Backlog Burn-down**: Total open issues vs. closed per week.
* **Mean Issue Age**: Targeted reduction in the average age of open tickets.
* **Repro Rate**: % of bug reports containing a valid reproduction.
* **Reopen Rate**: Monitoring for accidental closures (target <5%).

## Risk + Rollback
* **Accidental Closure**: Use a templated comment: *"Closing due to inactivity. If this is still relevant, please provide [missing info] and reopen."*
* **Audit Trail**: Every bulk action must be tagged with a unique `cleanup-session-ID` label.

## Appendix

### Example Label Set
* `status/triage`: New, unvetted.
* `status/blocked`: Waiting on external factors.
* `status/active`: Work in progress.
* `type/cleanup`: For backlog reduction tasks.

### Closure Comment Template
> "This issue is being closed as part of the [Systemic Backlog Reduction v0.1](docs/rfcs/backlog-reduction-v0.1.md) policy. It has been inactive for 30+ days. If you believe this is an error, please add a reproduction case and reopen the ticket."

---
## How to Adopt Checklist
- [ ] Merge this RFC.
- [ ] Audit existing labels against the taxonomy.
- [ ] Configure GitHub Stale Bot according to the 30/7 day rule.
- [ ] Appoint a "Day Captain" for the first weekly sweep.
