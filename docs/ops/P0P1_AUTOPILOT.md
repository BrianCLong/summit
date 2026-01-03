# P0/P1 Autopilot Report

**Date:** 2026-01-03T08:47:39.409Z
**Total Failures:** 30

## Operator Summary
- **P0 Failures:** 0
- **P1 Failures:** 30

## Generated Workstreams


### Claude
- **ID:** ws-claude-20260103-01
- **Objectives:** Resolve GENERIC_FAILURE clusters, Diagnose systemic CI/test failures
- [Manifest](workstreams/Claude/ws-claude-20260103-01.yml) | [Prompt](prompts/Claude/ws-claude-20260103-01.md)


### Codex
- **ID:** ws-codex-20260103-01
- **Objectives:** Resolve LINT_CONFIGURATION clusters, Resolve PNPM_RECURSIVE_FAIL clusters, Fix lint configurations and TS errors across packages
- [Manifest](workstreams/Codex/ws-codex-20260103-01.yml) | [Prompt](prompts/Codex/ws-codex-20260103-01.md)


### Qwen
- **ID:** ws-qwen-20260103-01
- **Objectives:** Resolve GENERIC_FAILURE clusters, Fix specific package runtime issues (metrics, network)
- [Manifest](workstreams/Qwen/ws-qwen-20260103-01.yml) | [Prompt](prompts/Qwen/ws-qwen-20260103-01.md)


### Jules
- **ID:** ws-jules-20260103-01
- **Objectives:** Maintain operational scripts and documentation
- [Manifest](workstreams/Jules/ws-jules-20260103-01.yml) | [Prompt](prompts/Jules/ws-jules-20260103-01.md)


## Failure Clusters


### GENERIC_FAILURE (23)
**Owner:** Claude
**Priority:** P1

**Sample Signatures:**
- `WARN  131 deprecated subdependencies found: @apollo/server-gateway-interface@1.1.1, @babel/plugin-proposal-async-generator-functions@7.20.7, @babel/plugin-proposal-class-properties@7.18.6, @babel/plugin-proposal-nullish-coalescing-operator@7.18.6, @babel/plugin-proposal-numeric-separator@7.18.6, @babel/plugin-proposal-object-rest-spread@7.20.7, @babel/plugin-proposal-optional-catch-binding@7.18.6, @babel/plugin-proposal-optional-chaining@7.21.0, @graphql-tools/prisma-loader@8.0.17, @humanwhocodes/config-array@0.13.0, @humanwhocodes/object-schema@2.0.3, @mui/base@5.0.0-beta.42, @npmcli/move-file@2.0.1, @opentelemetry/exporter-jaeger@1.15.2, @opentelemetry/otlp-proto-exporter-base@0.41.2, @opentelemetry/otlp-proto-exporter-base@0.45.0, @opentelemetry/otlp-proto-exporter-base@0.46.0, @opentelemetry/otlp-proto-exporter-base@0.48.0, @react-native-community/async-storage@1.12.1, @types/hapi__catbox@12.1.0, @types/hapi__shot@6.0.0, @types/minimatch@6.0.0, @types/pino-pretty@5.0.0, @types/pino-std-serializers@4.0.0, abab@2.0.6, acorn-import-assertions@1.9.0, apollo-cache-control@0.15.0, apollo-datasource@0.10.0, apollo-datasource@3.3.2, apollo-reporting-protobuf@0.8.0, apollo-reporting-protobuf@3.4.0, apollo-server-caching@0.7.0, apollo-server-core@2.26.2, apollo-server-core@3.13.0, apollo-server-env@3.2.0, apollo-server-env@4.2.1, apollo-server-errors@2.5.0, apollo-server-errors@3.3.1, apollo-server-plugin-base@0.14.0, apollo-server-plugin-base@3.7.2, apollo-server-types@0.10.0, apollo-server-types@3.8.0, apollo-tracing@0.16.0, are-we-there-yet@1.1.7, are-we-there-yet@2.0.0, boolean@3.2.0, deep-assign@3.0.0, domexception@4.0.0, esri-loader@3.7.0, gauge@2.7.4, gauge@3.0.2, geojson-area@0.2.1, geojson-normalize@0.0.0, graphql-extensions@0.16.0, graphql-tools@4.0.8, har-validator@5.1.5, ipfs-core-types@0.14.1, ipfs-core-utils@0.18.1, lodash.get@4.4.2, lodash.isequal@4.5.0, multibase@4.0.6, node-domexception@1.0.0, npmlog@4.1.2, npmlog@5.0.1, puppeteer@19.7.5, q@1.5.1, querystring@0.2.0, request@2.88.2, rimraf@2.4.5, rimraf@2.6.3, rimraf@2.7.1, rimraf@3.0.2, rollup-plugin-terser@7.0.2, semver-diff@5.0.0, source-map@0.8.0-beta.0, sourcemap-codec@1.4.8, subscriptions-transport-ws@0.9.19, superagent@8.1.2, three-mesh-bvh@0.7.8, turf-along@3.0.12, turf-area@3.0.12, turf-bbox-polygon@3.0.12, turf-bbox@3.0.12, turf-bearing@3.0.12, turf-bezier@3.0.12, turf-buffer@3.0.12, turf-center@3.0.12, turf-centroid@3.0.12, turf-circle@3.0.12, turf-collect@3.0.12, turf-combine@3.0.12, turf-concave@3.0.12, turf-convex@3.0.12, turf-destination@3.0.12, turf-difference@3.0.12, turf-distance@3.0.12, turf-envelope@3.0.12, turf-explode@3.0.12, turf-flip@3.0.12, turf-helpers@3.0.12, turf-hex-grid@3.0.12, turf-inside@3.0.12, turf-intersect@3.0.12, turf-invariant@3.0.12, turf-isolines@3.0.12, turf-kinks@3.0.12, turf-line-distance@3.0.12, turf-line-slice@3.0.12, turf-meta@3.0.12, turf-midpoint@3.0.12, turf-nearest@3.0.12, turf-planepoint@3.0.12, turf-point-grid@3.0.12, turf-point-on-line@3.0.12, turf-point-on-surface@3.0.12, turf-random@3.0.12, turf-sample@3.0.12, turf-simplify@3.0.12, turf-square-grid@3.0.12, turf-square@3.0.12, turf-tag@3.0.12, turf-tesselate@3.0.12, turf-tin@3.0.12, turf-triangle-grid@3.0.12, turf-union@3.0.12, turf-within@3.0.12, uuid@3.4.0, whatwg-encoding@2.0.0, whatwg-encoding@3.1.1, workbox-cacheable-response@6.6.0, workbox-google-analytics@6.6.0` (unknown)
- `WARN  Failed to create bin at /app/packages/deception-detector/node_modules/.bin/kpw-verify. ENOENT: no such file or directory, open '/app/packages/kpw-media/dist/cli.js'` (unknown)
- `WARN  Failed to create bin at /app/services/federation-service/node_modules/.bin/ig-prov. ENOENT: no such file or directory, open '/app/packages/prov-ledger-client/dist/bin/ig-prov.js'` (unknown)


### LINT_CONFIGURATION (3)
**Owner:** Codex
**Priority:** P1

**Sample Signatures:**
- `apps/analytics-engine lint: ESLint: 9.39.1` (apps/analytics-engine)
- `apps/desktop-electron lint: ESLint: 9.39.2` (apps/desktop-electron)
- `apps/command-console lint: ESLint: 9.39.1` (apps/command-console)


### PNPM_RECURSIVE_FAIL (4)
**Owner:** Codex
**Priority:** P1

**Sample Signatures:**
- `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @intelgraph/analytics-engine@2.0.0 lint: `eslint src`` (apps/analytics-engine)
- `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @intelgraph/tenant-api@2.0.0 typecheck: `tsc --noEmit`` (companyos/services/tenant-api)
- `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @intelgraph/mobile-interface@2.0.0 build: `next build`` (apps/mobile-interface)


## Operator Commands
- **Regenerate:** `pnpm ops:p0p1:autopilot:offline`
- **Run Fixtures:** `node scripts/ops/p0p1-autopilot.ts --mode=offline`

## Next Actions for CI (Claude)
- Wire `pnpm ops:p0p1:autopilot:offline` into a non-blocking CI step to track drift.