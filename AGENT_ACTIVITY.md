# Agent Activity Log

This ledger tracks recent agent activity so humans can spot thrash, stalls, or conflicts quickly.

| task_id | branch                         | pr / link | agent | status           | notes                                                     | updated    |
| ------- | ------------------------------ | --------- | ----- | ---------------- | --------------------------------------------------------- | ---------- |
<<<<<<< HEAD
| TB-01   | agentic/jules/task-guardrails  | (pending) | Jules | done      | Guardrail workflow + contract refresh.                    | 2026-01-01 |
| TB-02   | agentic/codex/task-ledger      | (pending) | Codex | done      | Drafting AGENT_ACTIVITY + backlog wiring.                 | 2026-01-01 |
| TB-03   | agentic/codex/task-owner-guide | (pending) | Codex | done      | HUMAN_OWNER_GUIDE.md authored.                            | 2026-01-01 |
| TB-04   | (done)                   | n/a       | Human | done       | Restricted-path audit; requires override label.           | 2026-01-01 |
| TB-06   | work                           | (pending) | Codex | done      | GenUI plan scaffold + GA verification updates.            | 2026-01-14 |
| TB-07   | work                           | (pending) | Codex | merged | Browser Ops extension blueprint runbook + roadmap update. | 2026-01-23 |
=======
| TB-01   | agentic/jules/task-guardrails  | merged    | Jules | merged           | Guardrail workflow + contract refresh.                    | 2026-03-08 |
| TB-02   | agentic/codex/task-ledger      | merged    | Codex | merged           | Drafting AGENT_ACTIVITY + backlog wiring.                 | 2026-03-08 |
| TB-03   | agentic/codex/task-owner-guide | merged    | Codex | merged           | HUMAN_OWNER_GUIDE.md authored.                            | 2026-03-08 |
| TB-04   | (human-only)                   | n/a       | Human | done             | Restricted-path audit; requires override label.           | 2026-03-08 |
| TB-06   | work                           | merged    | Codex | merged           | GenUI plan scaffold + GA verification updates.            | 2026-03-08 |
| TB-07   | work                           | merged    | Codex | merged           | Browser Ops extension blueprint runbook + roadmap update. | 2026-03-08 |
>>>>>>> origin/terminal-sweep-finalization-12359970174033279518
| GA-REL  | main                           | (tag)     | Agent | done             | Final GA Hardening + Tagging.                             | 2026-02-02 |
| TB-03   | main                           | n/a       | Agent | done             | Created HUMAN_STEERING.md.                                | 2026-02-01 |
| TB-01   | main                           | n/a       | Agent | done             | Hardened agent-contract.json.                             | 2026-02-01 |
| TB-08   | main                           | n/a       | Agent | done             | Integrated Email & Multimodal Vision/Signal services.     | 2026-02-02 |

## How to update

- Add a new row when opening a branch/PR for a backlog item.
- Update `status` to `blocked`, `done`, `merged`, or `merged` as work moves.
- Include the agent name (`Jules`, `Codex`, or other) and keep dates in `YYYY-MM-DD`.
- When an item merges, add the PR link and move it below any active work if the table grows.
