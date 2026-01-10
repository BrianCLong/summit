# Agent Session Explorer Hardening

Implement targeted fixes to the Agent Session Explorer (Claude history) so the MVP is
production-ready for the Summit golden path. Keep changes scoped to the existing
backend/frontend feature, update documentation, and ensure prompt integrity metadata
and task spec artifacts are produced. Focus on:

- Correct project discovery and filtering for Claude history layouts.
- Support cursor-based pagination for session lists.
- Redact sensitive values in tool call inputs/outputs.
- Add a dedicated agent projects endpoint (`/api/agent-projects`).
- Improve UI streaming resilience (SSE reconnect with backoff) and auto-scroll behavior.
- Keep feature flags and admin-only access intact.
- Update docs and roadmap status.
