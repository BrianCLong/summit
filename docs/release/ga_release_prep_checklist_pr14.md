# GA Release Prep (PR-14) – Checklist

- RC cut: tag `v1.0.0-rc.1` and changelog snapshot
- Security review: dependency audit, secrets scan, OPA policies review
- Packaging: Docker images for api, graphql/ui, copilot; SBOMs attached
- Perf pass: budget checks, slow query logs on, k6 smoke profiles (see `SLOW_QUERY_MS` and `load/k6_smoke.js`)
- Notes: release notes draft and upgrade guide

## Toggles & Scripts

- Slow query logger: set `SLOW_QUERY_MS=500` (ms) to warn on slow GraphQL requests
- RC tag: `scripts/release/rc_tag.sh v1.0.0-rc.1`
- SBOM: `scripts/release/generate_sbom.sh sbom.json`
- k6 smoke: `k6 run load/k6_smoke.js`
- Perf snapshot: `scripts/perf/snapshot.sh perf_snapshot` (collects /metrics and k6 output)
