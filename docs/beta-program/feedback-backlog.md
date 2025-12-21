# Feedback Backlog Process

## Ingestion
- All feedback captured in the `beta-feedback` Jira project (or GitHub Issues with label `beta-feedback`).
- Must include context: `customer:{name}`, `feature:{name}`, `severity:{level}`.

## Scoring Rubric
1. **Blocker**: Prevents core use case. (Fix immediately)
2. **Critical**: High friction, no workaround. (Fix before GA)
3. **Major**: High friction, workaround exists. (Prioritize for GA)
4. **Minor**: Low friction / Polish. (Backlog)

## Deduping & Review
- **Weekly Triage**: PM reviews all new items.
- **Deduping**: Link related items to a parent Epic/Theme.
- **Status Updates**: All items must have a status (New, Triaged, Planned, Rejected, Done).
