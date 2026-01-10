# Agentic Learning Ecosystem (ALE)-Inspired Tooling

This repository slice brings ALE concepts into Summit without any model training. It introduces:

- **ROCK-equivalent sandbox runner**: safe Docker-first execution with read-only filesystems, isolated networks, and image allowlists.
- **Trajectory recording**: JSONL recorder with validated schema for every step of an agent run.
- **Semantic Interaction Chunks (IPA-inspired)**: deterministic chunking of trajectories for credit assignment.
- **Terminal Bench Pro harness**: fetch tasks from Hugging Face, execute inside the sandbox, and emit reports.
- **iFlow-style CLI**: `summit ale` subcommands for recording, replaying, evaluating, and summarizing runs.

## Quickstart

```bash
# Record a sandboxed command
pnpm --filter @summit/cli dev ale record --trajectory /tmp/run.jsonl --cmd echo "hello from sandbox"

# Summarize or replay an existing trajectory
pnpm --filter @summit/cli dev ale summarize /tmp/run.jsonl
pnpm --filter @summit/cli dev ale replay /tmp/run.jsonl

# Run Terminal Bench Pro evaluation (skips gracefully if Docker is missing)
pnpm --filter @summit/cli dev ale eval --limit 5 --out reports/terminal-bench-pro
```

## Mapping to ALE

- **ROCK** → `runInSandbox` in `@summit/ale` with Docker allowlists and network-off defaults.
- **iFlow CLI** → `summit ale` command group (record, replay, eval, summarize).
- **IPA Semantic Interaction Chunks** → `chunkTrajectory` groups multi-step tool use into deterministic chunks.
- **ROLL** → Future hook points enabled by trajectory schemas and recording.

## Troubleshooting

- If Docker is unavailable, sandbox-backed commands log a skip message and emit skipped reports. Use `--require-docker` to fail hard.
- Reports and trajectories are JSONL/JSON; you can inspect them directly or replay with `summit ale replay`.
- Dataset access relies on the Hugging Face datasets-server endpoint: ensure outbound HTTPS is permitted when evaluating.
