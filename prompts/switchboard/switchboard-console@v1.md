# Switchboard Console MVP

## Mission
Deliver a Summit-native Switchboard Console MVP that provides a stable
presentation-layer CLI/TUI above vendor CLIs (Claude Code, Codex, Gemini),
with skillsets, governance logging, and evidence bundles.

## Inputs
- Session commands: `/agent`, `/skillset`, `/run`, `/evidence`, `/resume`.
- Provider adapters: implement Codex CLI integration; stub Claude/Gemini.
- Skillsets stored under `.summit/skillsets/`.

## Required Outputs
- `apps/switchboard-console` with CLI entrypoint, adapters, policy gate, event
  log schema, and evidence bundle generation.
- Tests validating adapter contract, log schema, and fake-provider integration.
- Documentation for setup and provider authentication.
- Update `docs/roadmap/STATUS.json` with the revision note.

## Constraints
- Deterministic, auditable, safe-by-default execution.
- No auth hacks; rely on existing vendor CLI sessions.
- All file writes and command executions are recorded in the event trail.
