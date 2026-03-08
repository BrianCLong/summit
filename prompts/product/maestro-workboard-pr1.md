# Maestro Workboard PR-1 Prompt

Implement the Maestro Workboard MVP:

- Create apps/maestro-workboard with a Kanban board UI, API endpoints, and runner shim.
- Persist work items, runs, events, and evidence bundles.
- Enforce capability profiles via a policy gate.
- Use git worktrees for run isolation (single task run).
- Capture structured run events for replayability.
- Add tests and documentation.
- Update docs/roadmap/STATUS.json and add a task spec under agents/examples.

Constraints:

- Prefer existing dependencies (Express only).
- No direct commits to main.
- Capture evidence bundle artifacts with provenance.
- Follow Summit governance requirements.
