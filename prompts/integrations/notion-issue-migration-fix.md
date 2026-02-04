# Prompt: Notion Issue Migration Fix

Objective: Update Summit's Notion integration readiness by wiring verification and setup guidance for the Issue Migration database.

Required outputs:

- Notion integration verification added to `scripts/verify-integrations.ts`.
- Setup documentation under `docs/integrations/` that captures required env vars and schema expectations.
- Roadmap status metadata update in `docs/roadmap/STATUS.json`.
- Prompt registry entry aligned to this prompt file.
- Task specification recorded under `agents/examples/`.

Constraints:

- Keep changes within approved paths only.
- Follow governance and readiness assertions in `docs/SUMMIT_READINESS_ASSERTION.md`.
- Do not commit secrets; require credentials via environment variables.
