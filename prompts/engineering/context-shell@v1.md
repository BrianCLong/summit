# Prompt: Context Shell Implementation (Summit)

## Mission

Implement a Summit-native Context Shell toolset with policy gating, evidence
logging, deterministic outputs, and Maestro integration.

## Deliverables

1. New package: `libs/context-shell/node` with:
   - `createContextShell({ root, fsMode, policy, limits, redactions, cache })`
   - `ctx.bash(command)`, `ctx.readFile(path)`, `ctx.writeFile(path, content)`
   - Structured results `{ stdout, stderr, exitCode, filesRead, filesWritten, durationMs, redactionsApplied }`
2. Policy layer: allowlist commands/flags, denylist paths, write justification + patch format gating.
3. Evidence logging: JSONL events with hashes, policy decision id, timing/limits.
4. Maestro integration: tool adapter registering `ctx.*` tools.
5. Tests + docs:
   - policy blocking
   - path denylist
   - deterministic output
   - intercept hooks
   - docs covering enablement + threat model + limits
   - ensure `pnpm test` runs without extra NODE_OPTIONS configuration

## Constraints

- No arbitrary binary execution.
- Safe-by-default filesystem scoping.
- Deterministic behavior in CI.
- Minimal dependencies.
