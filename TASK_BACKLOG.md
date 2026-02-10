# Task Backlog

mode: exploitation

Use this backlog to steer agents. Reorder rows to reprioritize. Keep the list short (≤12 items) and ensure each task has a clear owner and status.

| id    | title                                  | priority | status      | agent_owner | human_owner | restricted | notes                                                       |
| ----- | -------------------------------------- | -------- | ----------- | ----------- | ----------- | ---------- | ----------------------------------------------------------- |
| TB-01 | Harden agent guardrails in CI          | High     | in-progress | Jules       | Owner       | false      | Ship guardrail workflow + contract updates.                 |
| TB-02 | Stand up agent activity ledger         | High     | in-progress | Codex       | Owner       | false      | Keep `AGENT_ACTIVITY.md` synced with new tasks.             |
| TB-03 | Refresh human steering guide           | Medium   | ready       | Codex       | Owner       | false      | Add examples for toggling exploration/exploitation.         |
| TB-04 | Restricted-path coverage audit         | Medium   | ready       | Jules       | Owner       | true       | Human-only check of secrets/security folders.               |
| TB-05 | Prime Brain prompt alignment sweep     | Low      | queued      | Jules       | Owner       | false      | Normalize `.agentic-prompts/` scopes to backlog priorities. |
| TB-07 | GA verification map ordering guardrail | Medium   | in-progress | Codex       | Owner       | false      | Enforce deterministic ordering for GA verification map.     |

## How to use this backlog

- **Promote/demote:** Move rows up/down and change the `priority` field. Agents prioritize `High` first.
- **Assign agents:** Use `agent_owner` to declare the preferred agent. Leave blank to let dispatch pick.
- **Mark human-only work:** Set `restricted` to `true` and log in `AGENT_ACTIVITY.md` as `human-only`.
- **Modes:** Flip the `mode` field above to `exploration` when you want agents to explore or refactor; switch back to `exploitation` to finish planned work.
- **Link to prompts:** Reference `.agentic-prompts/<task>.md` in the `notes` column when a dedicated prompt exists.
