# Speculative Decoding GA Gate Plan

## GA Entry Criteria

- Deny-by-default config parser present and tested.
- Tenant allowlist required before any speculative routing.
- Evidence ID and thresholds required when speculative mode is enabled.
- CI gate `verify/speculative-off-by-default` passing.

## Verification Commands

- `node --test tests/agents/inference/spec/off_by_default.test.mjs`
- `node .github/scripts/verify-speculative-off-by-default.mjs`
- `make ga-verify`

## Rollout Stages

1. **Stage 0 (default):** disabled globally.
2. **Stage 1:** internal tenant allowlist only with strict thresholds.
3. **Stage 2:** expanded allowlist based on evidence trend stability.

## Rollback

- Set `SUMMIT_SPECULATIVE_ENABLED=false`.
- Remove tenant from allowlist.
- Retain baseline generation route.
