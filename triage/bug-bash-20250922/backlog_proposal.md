# Backlog Ingestion Proposal

## Current State
The `backlog/` directory contains `backlog.json`, which tracks high-level Epics and Stories. It does not currently have a mechanism for tracking individual bug reports or findings from bug bashes.

## Proposal
We should establish a structured directory for bug reports to allow for file-based triage before ingesting them into the formal backlog (JSON/Jira).

### Directory Structure
```
backlog/
  ├── backlog.json         # Existing Epics/Stories
  └── bugs/                # New directory for bug reports
      ├── P0/              # Critical bugs
      ├── P1/              # Major bugs
      └── archive/         # Closed/Fixed bugs
```

### Ingestion Process
1. **Triage**: Convert raw findings (e.g., `failing_cases.txt`) into Markdown tickets in `backlog/bugs/P{X}/`.
2. **Review**: Maintainers review the tickets, assign owners, and link them to `backlog.json` stories if applicable.
3. **Resolution**: Once fixed, move the file to `backlog/bugs/archive/` or delete if synced to an external system.

### File Naming
`{BUG_ID}-{short-description}.md`
Example: `BUG-SEC-001-policy-fuzzer-failures.md`

### Labeling
Use Frontmatter or a specific section for metadata:
- `priority`: P0, P1, P2
- `area`: security, infra, ui, backend
- `source`: bug-bash-20250922
