# Prompt: Summit Copilot CLI Wrapper (v1)

## Objective

Add a governed GitHub Copilot CLI wrapper and supporting documentation so Summit lanes are enforced, tool access is gated, and transcripts are retained as evidence artifacts.

## Scope

- Add `tools/copilot/summit-copilot` wrapper.
- Add `docs/dev/copilot-cli.md` documentation.
- Add Makefile targets for explore/plan/task/review lanes.
- Update `docs/roadmap/STATUS.json` with the revision note.
- Update prompt registry and add task spec record for this change.

## Requirements

- Wrapper must use `copilot -p --silent` and export transcripts to `artifacts/copilot/`.
- Enforce a default `--available-tools` allowlist with an override option.
- Support optional MCP config injection via `--additional-mcp-config` using `config/copilot/mcp.json` when present.
- Keep dependencies minimal and the wrapper portable for macOS/Linux.

## Verification

- Ensure the wrapper creates a transcript path on each run.
- Ensure documentation matches actual wrapper behavior.
