# Prompt: Summit Copilot CLI Wrapper (v2)

## Objective

Harden the Summit Copilot CLI wrapper so lane routing is configurable, transcript output is deterministic, and documentation reflects overrides.

## Scope

- Update `tools/copilot/summit-copilot` with configurable lane flag and transcript directory.
- Update `docs/dev/copilot-cli.md` to describe overrides.
- Update `docs/roadmap/STATUS.json` with the revision note.
- Update prompt registry and add task spec record for this change.

## Requirements

- Wrapper must continue to use `copilot -p --silent` and export transcripts to `artifacts/copilot/` by default.
- Preserve `--available-tools` allowlist with override support.
- Support optional MCP config injection via `--additional-mcp-config` using `config/copilot/mcp.json` when present.
- Add `--share-dir` and `COPILOT_SHARE_DIR` for transcript path overrides.
- Add `COPILOT_AGENT_FLAG` to allow lane flag customization or disabling.

## Verification

- Ensure transcript path is emitted even on non-zero exit.
- Ensure documentation matches wrapper behavior and override options.
