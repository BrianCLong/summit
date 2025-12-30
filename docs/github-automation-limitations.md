# GitHub Automation Limitations

This environment cannot reach GitHub services or authenticate against the repository, so automated issue/project updates are not possible from within this sandbox. Any state reconciliation, card moves, or issue edits must be performed manually from a networked workstation with appropriate credentials.

To keep work tracking accurate:

- Re-run the requested GitHub orchestration steps from an environment with network access.
- Ensure all issues are linked to Project 19 with correct status, labels, and acceptance criteria.
- Confirm security findings are represented as tracked issues and placed into the project board.

This note documents the limitation to avoid false assumptions about automation coverage in offline runs.
