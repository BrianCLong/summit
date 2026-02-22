# Summit Copilot CLI Integration

## Purpose

Summit uses a governed Copilot CLI wrapper to keep agent lanes predictable, tool access constrained, and transcripts preserved as evidence artifacts.

## Install Copilot CLI

Pick the option that matches your OS:

### macOS (Homebrew)

```bash
brew install github/gh-copilot
```

### Windows (Winget)

```powershell
winget install GitHub.Copilot
```

### Linux (Install Script)

```bash
curl -fsSL https://github.com/github/gh-copilot/releases/latest/download/install.sh | bash
```

> Note: If you install via a package manager, ensure the `copilot` binary is on your PATH.

## Summit Wrapper

Use the Summit wrapper to enforce lanes, tool allowlists, and transcript capture.

```bash
tools/copilot/summit-copilot explore -- "Map the current Maestro repo layout"
```

The wrapper:

- Runs `copilot -p --silent` and exports a transcript to `artifacts/copilot/`.
- Enforces a conservative tool allowlist via `--available-tools`.
- Selects a default model per lane (overrideable).
- Injects MCP config from `config/copilot/mcp.json` when present.
- Allows a configurable lane flag and transcript directory for portability.

### Lane Defaults

| Lane    | Default model   |
| ------- | --------------- |
| explore | `gpt-5-mini`    |
| plan    | `gpt-5-mini`    |
| task    | `gpt-5.2-codex` |
| review  | `gpt-5.2-codex` |

Override examples:

```bash
tools/copilot/summit-copilot plan --model gpt-4.1 -- "Draft an execution plan"
```

```bash
tools/copilot/summit-copilot task --tools "bash,git,rg,pnpm,make" -- "Implement change X"
```

You can override the transcript directory or lane flag when needed:

```bash
tools/copilot/summit-copilot review --share-dir /tmp/copilot-transcripts -- "Review server/src/foo.ts"
```

```bash
COPILOT_AGENT_FLAG="" tools/copilot/summit-copilot explore -- "Run without a lane flag"
```

### Makefile Facade

```bash
make copilot-explore PROMPT="Assess PR boundaries" ARGS="--tools bash,git,rg"
make copilot-plan PROMPT="Propose test plan" ARGS="--model gpt-4.1"
make copilot-task PROMPT="Implement feature Y"
make copilot-review PROMPT="Review server/src/foo.ts"
```

## Recommended ~/.copilot/config

Summit defaults to an allowlist-first posture for web access (applies to `web_fetch`, `curl`, and `wget`).

```yaml
allowed_urls:
  - https://docs.github.com/**
  - https://learn.microsoft.com/**
  - https://nodejs.org/**
  - https://pnpm.io/**
  - https://registry.npmjs.org/**
  - https://doc.rust-lang.org/**
  - https://www.rfc-editor.org/**
  - https://kubernetes.io/**
  - https://docs.docker.com/**
  - https://spec.openapis.org/**
  - https://openjdk.org/**
  - https://peps.python.org/**

denied_urls:
  - https://**
```

## Evidence Integration

Transcript files under `artifacts/copilot/` should be attached to release evidence bundles alongside test reports, SBOMs, and policy proofs. This keeps Copilot runs auditable and aligned with Summit governance.

## MCP Injection

If `config/copilot/mcp.json` exists, the wrapper automatically passes it via `--additional-mcp-config`. Use `--mcp-config` to override the path per session.

## Environment Overrides

```bash
COPILOT_BIN=copilot
COPILOT_AVAILABLE_TOOLS=bash,git,rg,pnpm,make
COPILOT_MODEL_EXPLORE=gpt-5-mini
COPILOT_MODEL_PLAN=gpt-5-mini
COPILOT_MODEL_TASK=gpt-5.2-codex
COPILOT_MODEL_REVIEW=gpt-5.2-codex
COPILOT_MCP_CONFIG=config/copilot/mcp.json
COPILOT_SHARE_DIR=artifacts/copilot
COPILOT_AGENT_FLAG=--agent
```
