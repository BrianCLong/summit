# Prompt: GenUI Plan Scaffold

You are tasked with shipping the Summit-native Generative UI plan scaffolding. Deliver the schema,
registry, linting, repair, and evidence utilities plus GA documentation covering the UI contract,
anti-footguns, and tool manual. Update GA verification artifacts and roadmap status in the same
change. Ensure policy gating and provenance requirements are explicit.

## Scope

- `packages/genui/`
- `docs/ga/genui/`
- `docs/ga/MVP-4-GA-VERIFICATION.md`
- `docs/ga/verification-map.json`
- `scripts/ga/verify-ga-surface.mjs`
- `agent-contract.json`
- `docs/roadmap/STATUS.json`
- `AGENT_ACTIVITY.md`

## Constraints

- Do not modify global test runners or pnpm configuration.
- Plan outputs must be structured JSON, never raw HTML/JS.
- Enforce citations for factual panels.
- Update verification surfaces and evidence references.
