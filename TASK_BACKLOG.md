# Task Backlog

mode: exploitation

Use this backlog to steer agents. Reorder rows to reprioritize. Keep the list short (≤12 items) and ensure each task has a clear owner and status.

| id    | title                              | priority | status | agent_owner | human_owner | restricted | notes                                                    |
| ----- | ---------------------------------- | -------- | ------ | ----------- | ----------- | ---------- | -------------------------------------------------------- |
| TB-01 | Harden agent guardrails in CI      | High     | done   | Jules       | Owner       | false      | Hardened `agent-contract.json`.                          |
| TB-02 | Stand up agent activity ledger     | High     | done   | Codex       | Owner       | false      | Ledger updated in `AGENT_ACTIVITY.md`.                   |
| TB-03 | Refresh human steering guide       | Medium   | done   | Codex       | Owner       | false      | Created `docs/HUMAN_STEERING.md`.                        |
| TB-04 | Restricted-path coverage audit     | Medium   | ready  | Jules       | Owner       | true       | Human-only check of secrets/security folders.            |
| TB-05 | Prime Brain prompt alignment sweep | Low      | done   | Jules       | Owner       | false      | Normalized `.agentic-prompts/` (archived stale prompts). |

## How to use this backlog

- **Promote/demote:** Move rows up/down and change the `priority` field. Agents prioritize `High` first.
- **Assign agents:** Use `agent_owner` to declare the preferred agent. Leave blank to let dispatch pick.
- **Mark human-only work:** Set `restricted` to `true` and log in `AGENT_ACTIVITY.md` as `human-only`.
- **Modes:** Flip the `mode` field above to `exploration` when you want agents to explore or refactor; switch back to `exploitation` to finish planned work.
- **Link to prompts:** Reference `.agentic-prompts/<task>.md` in the `notes` column when a dedicated prompt exists.
