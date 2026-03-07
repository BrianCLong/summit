# Merge Train Status (Snapshot)

> **Note:** This status is a snapshot. Due to environment limitations (`gh` CLI unavailable), live PR data could not be fetched automatically. This table serves as the canonical structure for the merge train.

**Last Updated:** 2026-01-03

| PR              | Category        | Failing check(s) | Root cause signature             | Owner  | Next action            | ETA       |
| :-------------- | :-------------- | :--------------- | :------------------------------- | :----- | :--------------------- | :-------- |
| #1024 (Example) | Merge-ready     | None             | N/A                              | Jules  | Merge now              | Immediate |
| #1025 (Example) | Needs small fix | `lint`           | Unused variable                  | Author | Fix lint               | < 1h      |
| #1026 (Example) | Blocked (Sys)   | `test:unit`      | `ESM module not found`           | Claude | Investigate ESM config | 1d        |
| #1027 (Example) | Blocked (Sys)   | `verify`         | `prom-client` duplicate registry | Qwen   | Singleton cleanup      | 1d        |

## Merge Strategy

1.  **Low-Hanging Fruit**: Merge "Merge-ready" PRs immediately to clear the queue.
2.  **Quick Fixes**: Ping authors of "Needs small fix" PRs.
3.  **Systemic Blockers**: Route complex failures (ESM, Singletons) to specific agents (Claude/Qwen) via the `ci-signature-cluster` script.

## Automation

Run the following to refresh this list (requires `gh` CLI):

```bash
pnpm pr:triage
```
