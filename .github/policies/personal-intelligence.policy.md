# Personal Intelligence Policy (Deny-by-Default)

## Scope
This policy governs the Personal Intelligence Layer (PIL) for Summit agents.

## Non-Negotiables
- **Default OFF**: `PERSONAL_INTELLIGENCE_ENABLED` must be false/absent by default.
- **Per-scope OFF**: workspace/project scopes default to `enabled=false`.
- **No cross-scope reads**: workspace profiles must not leak into project scopes unless explicitly enabled for that scope.
- **No logging of sensitive fields**: `customPrompt` and derived preference payloads must never be logged.
- **No tool grants**: profile text cannot grant tools, override policies, or alter permissions.

## Required Evidence IDs
- `EVD-NBLM-PI-SCOPE-001` (cross-scope isolation)
- `EVD-NBLM-PI-PRIV-001` (never-log enforcement)
- `EVD-NBLM-PI-PROMPT-001` (capsule rendering determinism)

## Gate Expectations
- Cross-scope negative fixtures must fail unauthorized reads.
- Redaction tests must confirm logs omit sensitive fields.
- Deterministic rendering snapshots must be stable.

## Rollback Controls
- Global kill switch: `PERSONAL_INTELLIGENCE_ENABLED=0`.
- Per-scope override persists `enabled=false` by default.
