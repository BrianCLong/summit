# Agent Activity Log

This ledger tracks recent agent activity so humans can spot thrash, stalls, or conflicts quickly.

| task_id | branch                         | pr / link | agent | status           | notes                                                     | updated    |
| ------- | ------------------------------ | --------- | ----- | ---------------- | --------------------------------------------------------- | ---------- |
| TB-01   | agentic/jules/task-guardrails  | (pending) | Jules | in-progress      | Guardrail workflow + contract refresh.                    | 2026-01-01 |
| TB-02   | agentic/codex/task-ledger      | (pending) | Codex | in-progress      | Drafting AGENT_ACTIVITY + backlog wiring.                 | 2026-01-01 |
| TB-03   | agentic/codex/task-owner-guide | (pending) | Codex | in-progress      | HUMAN_OWNER_GUIDE.md authored.                            | 2026-01-01 |
| TB-04   | (human-only)                   | n/a       | Human | human-only       | Restricted-path audit; requires override label.           | 2026-01-01 |
| TB-06   | work                           | (pending) | Codex | in-progress      | GenUI plan scaffold + GA verification updates.            | 2026-01-14 |
| TB-07   | work                           | (pending) | Codex | ready-for-review | Browser Ops extension blueprint runbook + roadmap update. | 2026-01-23 |
| GA-REL  | main                           | (tag)     | Agent | done             | Final GA Hardening + Tagging.                             | 2026-02-02 |
| TB-03   | main                           | n/a       | Agent | done             | Created HUMAN_STEERING.md.                                | 2026-02-01 |
| TB-01   | main                           | n/a       | Agent | done             | Hardened agent-contract.json.                             | 2026-02-01 |
| TB-08   | main                           | n/a       | Agent | done             | Integrated Email & Multimodal Vision/Signal services.     | 2026-02-02 |
| SWITCHBOARD_LANE1_EVIDENCE | work | (pending) | Codex | in-progress | Switchboard MCP control-plane evidence scaffolding. | 2026-02-08 |

## How to update

- Add a new row when opening a branch/PR for a backlog item.
- Update `status` to `blocked`, `in-progress`, `ready-for-review`, or `merged` as work moves.
- Include the agent name (`Jules`, `Codex`, or other) and keep dates in `YYYY-MM-DD`.
- When an item merges, add the PR link and move it below any active work if the table grows.
