# GA Release State

Current Phase: **P6_DONE**

## Summary

- **v4.1.0 Released**: GA release completed
- **140+ PRs Merged**: Merge train completed
- **139 PRs Remaining**: Post-GA migration items (unrelated histories)

## Phase History

| Phase       | Started    | Notes                                    |
| ----------- | ---------- | ---------------------------------------- |
| P0_DISCOVER | 2026-01-01 | Initial discovery                        |
| P1_QUEUE    | 2026-01-02 | Queue built                              |
| P2_UNBLOCK  | 2026-01-03 | Blockers addressed                       |
| P3_MERGE    | 2026-01-05 | Merge train active                       |
| P6_DONE     | 2026-01-05 | GA v4.1.0 released, merge train complete |

## Post-GA Migration

The remaining 139 PRs cannot be merged due to **unrelated git histories** from a repository restructure. These are **not merge conflicts** - they are migration artifacts.

### Status

- These PRs are labeled: `blocked:unrelated-history`, `needs:recreated-pr`, `post-ga:migration`
- Authors must recreate PRs from current `main`
- See [PR Recreation Playbook](../migration/PR_RECREATION_PLAYBOOK.md) for instructions

### For Maintainers

Run the triage script to label and notify affected PR authors:

```bash
# Dry run (shows what would be done)
./scripts/maintainers/triage-unrelated-history-prs.sh

# Apply labels and post comments
./scripts/maintainers/triage-unrelated-history-prs.sh --apply
```
