# Repository Assumptions for OpenClaw-on-Lightsail Subsumption Work

## Verified (from local repository inspection)

- Repository root includes governance, delivery, and runtime surfaces required for an agent-plane proposal (`agents/`, `artifacts/`, `config/`, `RUNBOOKS/`, `SECURITY/`, `__tests__/`, `.ci/`, `.github/`).
- `docs/roadmap/STATUS.json` exists and is used as the active initiative ledger.
- `docs/standards/` exists and is an established location for architecture/standardization briefs.

## Assumptions (explicitly bounded)

1. Summit remains TypeScript-first for new agent subsystem scaffolding.
2. New verification gates can be added incrementally without changing existing branch protection semantics in this slice.
3. Agent evidence output should follow deterministic, machine-validated JSON artifacts (`report.json`, `metrics.json`, `stamp.json`) under `artifacts/agent-runs/`.
4. OpenClaw-style channel adapters are deferred behind feature flags until core browser/session flows and policy controls are proven.
5. Lightsail deployment guidance is treated as a reproducible infrastructure pattern, not as a direct platform lock-in.

## Must-Not-Touch in this planning slice

- Existing production service contracts in `server/`, `apps/`, or shared runtime packages.
- Existing ingestion and GraphRAG behavior contracts.
- Existing CI required-check policy names unless introduced as additive checks.

## Validation Checklist for implementation phase

- Confirm exact package/module boundary for new `agents/openclaw_plane/*` files.
- Confirm schema validator stack used in repository (e.g., Ajv/Zod) before adding artifact schema gates.
- Confirm authoritative benchmark harness path before adding runtime regression thresholds.
- Confirm naming convention for new CI jobs and evidence upload artifacts.

## Outcome Statement

This assumptions file intentionally constrains scope to a governed, additive “agent plane” rollout with deterministic evidence and deny-by-default capability control.
