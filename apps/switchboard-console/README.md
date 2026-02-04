# Switchboard Console (MVP)

Switchboard Console is Summit's provider-agnostic CLI/TUI surface that sits
above vendor CLIs. It keeps skillsets and governance constant while allowing
hot-swapping between Claude Code, Codex, and Gemini sessions.

## Setup

```bash
pnpm --filter @intelgraph/switchboard-console build
node apps/switchboard-console/dist/index.js
```

### Commands

- `/agent <claude|codex|gemini>`: switch provider adapters.
- `/skillset <name>`: switch skillset profiles stored in `.summit/skillsets/`.
- `/run <command>`: policy-gated command execution.
- `/evidence`: emit an evidence bundle for the current session.
- `/resume <session-id>`: resume using `--resume <session-id>` at startup.

### Policy Gate

Command execution is **deny-by-default**. To allow commands locally:

```bash
export SWITCHBOARD_RUN_MODE=allow
# or
export SWITCHBOARD_RUN_MODE=allowlist
export SWITCHBOARD_ALLOWED_COMMANDS="pnpm,git,ls"
```

## Provider Authentication

Switchboard relies on **existing** vendor CLI authentication. Authenticate using
the vendor's official CLI before starting a session:

- **Codex CLI**: sign in using `codex auth login` (or the vendor's documented
  login flow). Ensure `codex` is on your PATH.
- **Claude Code**: authenticate via the official Claude Code CLI setup (e.g.
  `claude auth login`).
- **Gemini CLI**: authenticate via the Gemini CLI setup (e.g. `gemini auth
login`).

> Switchboard does not implement auth flows; it passes through to vendor CLIs.

## Session Evidence

Sessions are stored under `.summit/switchboard/sessions/<id>/` with event logs,
transcripts, command outputs, and a `git-diff.patch` snapshot. `/evidence`
captures a snapshot bundle under `evidence/<timestamp>/` with a manifest.
