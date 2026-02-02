# Repo Assumptions

## Verified Items
- `packages/` workspace structure is supported.
- `scripts/monitoring/` is the place for drift scripts.
- `fixtures/` is the place for test data.
- `pnpm` is the package manager.
- `tsx` is available for running TS scripts.

## Assumed Items
- `adversarial-misinfo-defense-platform` was intended for Python but we used `packages/disinfo-news-ecosystem` for TS.
- Governance policies in `docs/ci/REQUIRED_CHECKS_POLICY.yml` are active and will pick up new paths.

## Must Not Touch
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` (unless approved).
- `SECURITY/` (unless required).
