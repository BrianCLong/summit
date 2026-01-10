# Agent Session Explorer

The Agent Session Explorer surfaces local Claude Code sessions in the Summit UI.

## Enabling

Set the feature flag and optional history root before starting the server:

```bash
export AGENT_SESSION_EXPLORER_ENABLED=true
export SUMMIT_AGENT_HISTORY_ROOT="/path/to/.claude" # defaults to ~/.claude
```

Enable the UI route in the web app build:

```bash
export VITE_AGENT_SESSION_EXPLORER_ENABLED=true
```

Only authenticated admin users can access the `/api/agent-sessions`, `/api/agent-projects` endpoints and the `/ops/agent-sessions` page.

## Capabilities (MVP)

- Browse recent Claude Code sessions with project filtering and full-text search
- View full transcripts with collapsible tool calls
- Live updates via server-sent events while a session is still writing
- Copy a ready-to-run resume command (`claude --resume <sessionId>`) from the UI
- Optional “continue latest” affordance (`claude --continue`)

## Notes

- Only Claude Code history is supported in this MVP
- The backend attempts to redact obvious secret patterns but avoid exposing sensitive transcripts to non-admins
