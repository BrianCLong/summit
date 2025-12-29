# Summit Flywheel Workflow (Preview)

The flywheel emphasizes fast, safe iteration via parallel agents, task DAGs, and
explicit approvals. This document will expand as installer features land.

## Core Loop (preview)

1. **Spawn**: launch tmux-based sessions for parallel agents.
2. **Plan**: define a task DAG ("beads") with dependencies and owners.
3. **Implement**: execute modules or manual steps with evidence capture.
4. **Review**: peer agents validate outputs; safety gates require approval.
5. **Validate**: run static checks and smoke tests.
6. **Merge**: integrate only when the state file confirms completed checkpoints.

## Upcoming additions

- Detailed module phases for base system, Summit toolchain, and optional
  services.
- Task DAG schema and `sfs print-plan` visualization.
- Memory and knowledge-base conventions for local agent notes.
- Safety wrapper for high-risk commands.
