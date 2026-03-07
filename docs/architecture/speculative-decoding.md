# Speculative Decoding Architecture (Lane 1)

## Scope

This architecture introduces a deny-by-default speculative decoding abstraction under
`src/agents/inference/spec/` without altering baseline generation behavior.

## Components

- `SpeculativeAdapter`: backend-agnostic adapter contract for capability discovery and generation.
- `SpeculativeConfig`: strict runtime config parser enforcing tenant allowlist and evidence thresholds when enabled.
- `verify/speculative-off-by-default`: CI gate running the deny-by-default tests.

## Runtime Flow

1. Load config via `loadSpeculativeConfigFromEnv`.
2. If `enabled=false`, route all requests to baseline generation.
3. If `enabled=true`, require:
   - backend configured (`http|sglang|vllm`),
   - tenant allowlist entry,
   - evidence ID,
   - performance/acceptance thresholds.
4. Gate request-level access via `canUseSpeculativeMode(config, tenantId)`.

## Boundary Guarantees

- No direct model-server coupling yet; adapter remains interface-only.
- No prompt or completion logging is introduced in this lane.
- Rollback is immediate through `SUMMIT_SPECULATIVE_ENABLED=false`.
