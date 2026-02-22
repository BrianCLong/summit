# Dependency Delta Report

## Changes
- Added `@types/hapi__catbox` and `@types/hapi__shot` to root devDependencies.
- Aligned project versions to `1.0.0-rc.1`.

## Reasoning
- Fix build/typecheck errors in `analytics-engine` and `desktop-electron`.
- Prepare for GA RC1 release.

## Verification
- `pnpm install` successful.
- `server/src/monitoring/metrics.ts` exports validated.
