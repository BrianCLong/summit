# Multi-Product Standards

## Tenancy
All multi-product routers must accept and propagate a tenant context header (planned for Week 2).

## Feature Flags
New products must be guarded by a feature flag in `api/platform_spine/flags.py`.
Flags should default to `false`.

## Health Check
Each product must expose a `/health` endpoint under its own router.
