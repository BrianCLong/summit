
## Maestro CLI

A simple CLI to trigger and inspect Maestro runs.

### Setup

Ensure dependencies are installed:
```bash
cd server && npm install
```

### Usage

You can run the CLI using `tsx` (if installed) or via `ts-node`.

**Trigger a run:**

```bash
npx tsx server/orchestrator/cli.ts trigger plan --repo my-app --issue 123
```

**Check status:**

```bash
npx tsx server/orchestrator/cli.ts status <RUN_ID>
```

### Note

Since the current `RunManager` uses in-memory storage for this MVP, the `status` command will only find runs if the process stays alive or if we persist to DB/File (currently configured to be in-memory).

For the `trigger` command in the example CLI, it starts the orchestrator, enqueues the task, and then shuts down. In a real persistent server scenario, you'd query the API.
