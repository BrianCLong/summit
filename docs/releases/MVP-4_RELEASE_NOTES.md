# MVP-4 — v4.1.4

Git range: `v2025.10.07..HEAD`

## Highlights

- feat: enable DB pool configuration via environment variables (recreated) (#15678) (35edd9f)
- fix: improve Global Search accessibility and remove conflicting stub (recreated) (#15679) (c268f4d)
- ci(a11y): add paths filter to skip server-only changes (#15788) (40f1009)
- feat(release-ops): add redaction and error budget infrastructure (0b1041d)
- feat(release-ops): add governance-change annotations to SLO reports (5fa09de)

## Detailed Changes

### Server

- feat: enable DB pool configuration via environment variables (recreated) (#15678) (35edd9f)
- perf: add GraphQL throughput benchmarks for Neo4j and Postgres (#15658) (60d35e9)
- chore(deps): bump chromadb from 0.4.15 to 1.4.0 (#15802) (2ca63e0)
- chore(deps): bump sentence-transformers from 2.2.2 to 5.2.0 (#15801) (00bfef3)
- chore(deps): bump paddleocr from 2.7.3 to 3.3.2 (#15800) (7c20e39)
- chore(deps): bump psutil from 5.9.5 to 7.2.1 (#15804) (6e07f3a)
- chore(deps): bump datasets from 2.14.5 to 4.4.2 (#15806) (5d32d6f)
- chore(deps): bump pillow from 10.3.0 to 12.1.0 (#15805) (25818be)
- chore(deps): bump the minor-and-patch group with 60 updates (#15798) (cdb5a54)
- fix(ga): ensure ESM compatibility and correct logger initialization (901d08f)
- test(security): fix tenant isolation tests and add verification suites (d043ecf)
- feat(security): implement evidence collection and verification system (227b8a3)
- Fix TS1005 syntax error: add missing closing brace in getObjectivesByPlan method (8d73b96)
- fix(jest): resolve config validator issues (b12607a)
- fix(jest): wave B - convert auth.test.ts to ESM mocking pattern (f378b04)
- fix(jest): wave B - convert rateLimit and sanitize tests to ESM pattern (9ed66eb)
- fix(jest): wave B - convert 3 more middleware tests to ESM pattern (f9848bf)
- fix(jest): wave B - convert 3 service tests to ESM pattern (9034f4d)
- fix(jest): wave B - convert IngestService and GraphService tests to ESM (0d171d7)
- fix(jest): wave B - convert IntelGraphService and webhooks tests to ESM (745e16b)
- fix(jest): wave B - convert monitoring, actions, tenants route tests to ESM (577c88e)
- fix(jest): wave B - convert ai, compliance, finops route tests to ESM (ad05442)
- fix(jest): wave B - convert partners, disclosures, tenant-usage route tests to ESM (f5a566f)
- fix: remove unnecessary type casts and improve type safety (49c1dd8)
- fix: server and middleware lint/type fixes (3ba53a0)
- fix: remove @ts-nocheck and add proper type annotations (a8af232)
- fix: additional type safety improvements (1646a20)
- fix: code formatting and indentation fixes (74297d5)
- fix: additional service file formatting fixes (2e48ebe)
- fix: route file formatting fixes (0872b81)
- fix: type cast fixes in admin route and extraction service (3762a05)
- fix: conductor formatting and add test mocks (4db1aa7)
- fix: maestro, optimization, and rate limiter formatting (678a717)
- chore: update jest setup and add governance schemas (e1761b0)
- chore: verify branch protection checks (9ad3573)
- fix(tests): improve ESM/CJS mock compatibility (9ad8476)
- fix(server): exclude test files from typecheck and build (20d484c)
- fix(tests): add pg mock and update transformIgnorePatterns (5f938d3)
- fix(tests): type annotations and formatting fixes (5bfdde4)
- fix(server/tests): add eslint-disable and fix test configurations (4307cfe)
- fix(server): update service tests for ESM compatibility (0853b08)

### UI

- fix: improve Global Search accessibility and remove conflicting stub (recreated) (#15679) (c268f4d)
- feat(ui): enhance UX with improved form validation, accessibility, and layout consistency (3bdd837)
- fix: client component type safety and lint fixes (2fd084c)
- fix(client/tests): add eslint-disable for jest type assertions (294535e)
- fix(client/tests): add eslint-disable for remaining test files (f523fd9)

### Infra

- ci(a11y): add paths filter to skip server-only changes (#15788) (40f1009)
- chore: tighten dependency monitoring (recreated) (#15675) (dc99113)
- chore: add agent quality charter and CI format gate (#15648) (a3f621e)
- chore: automate issue triage labeling (#15661) (6b5723f)
- chore: add deterministic triage automation (79efecb)
- feat(jest): implement ESM hardening with CI preflight gate (761381b)
- fix: enhance SBOM scanning with high-severity gate (#1234) (#16133) (1cc7165)
- feat: implement SOC gate and GA readiness artifacts (#16132) (5394878)

### Security

- feat(release-ops): add redaction and error budget infrastructure (0b1041d)
- feat(release-ops): add branch protection drift and reconciliation (82fb49c)
- feat(release-ops): add SLO monitoring, site generation, and GA pipeline (fc604a0)
- feat(ci): add release-ops workflow infrastructure (166bc37)
- docs(ci): update index and integrate release-ops infrastructure (6a82693)
- fix(governance): reconcile branch protection jq parsing + tests (#15789) (94f5e5e)
- docs/test(server): P2 low-risk documentation, config, and test updates (#15785) (d30acfc)
- fix/refactor(server): P1 middleware, services, and runtime updates (#15786) (5121a9e)
- refactor(server): P0 HIGH RISK core library and database modules (#15787) (b1a442c)
- chore(deps): bump the github-actions group across 1 directory with 22 updates (#15784) (0a26440)
- feat(security): implement deterministic security guardrails and audit gate (0c1e6ad)
- fix(security): mitigate production dependency vulnerabilities for GA (0d36bc8)
- feat(ci): implement comprehensive governance gates and hardening (85e3dcd)
- fix(ga): resolve critical test regressions and unify gate scripts (974e839)
- fix(ga): resolve critical test regressions and metric initialization (824b5c1)
- fix: replace console statements with proper stdout/stderr (aa6b68c)
- fix(jest): wave A - add @jest/globals import to 322 test files (e9ee76c)
- chore: monorepo cleanup and GA verification scripts (64361be)
- feat: add OPA ABAC middleware for Apollo Gateway (#1237) (#16128) (8cfd9c5)
- fix(jest): wave B - convert rbac, opa-abac, and security tests to ESM (22f52cb)
- fix: lint and type safety improvements across codebase (1a077c1)
- fix: additional client type safety improvements (a69fc02)
- fix: type annotations and formatting in cache, collaboration, security (705fc97)
- chore: update dependencies and add security mocks (f879458)
- fix(server): resolve TypeScript strict type errors (8b158d4)
- fix(server/tests): add eslint-disable for type assertions (ae4ed41)

### Misc

- feat(release-ops): add governance-change annotations to SLO reports (5fa09de)
- feat(governance): add governance infrastructure for release-ops (1db3801)
- docs: add A1–C2 entries to PR_MERGE_LEDGER.md (deferred placeholders) (#15780) (6af4f77)
- docs(roadmap): reconcile A1–C2 statuses with merge evidence and clear GA blockers (#15779) (5b33e3c)
- docs: add triage process placeholder (recreated) (#15677) (94c4a8f)
- docs: add contribution playbooks and clarify release policies (#15657) (2d43abe)
- docs: add Summit DX orchestration layer blueprint (#15652) (295ae02)
- chore(deps): bump urllib3 from 2.6.0 to 2.6.3 in /modules/connector-sdk-s3csv (#15783) (5dc069d)
- chore(deps): bump urllib3 from 2.6.2 to 2.6.3 (#15702) (49ba33a)
- chore(deps): bump lru from 0.12.5 to 0.16.3 in /rust (#15701) (a234d7e)
- chore(deps): bump aiohttp from 3.13.2 to 3.13.3 (#15690) (8520453)
- chore(deps-dev): bump the dev-dependencies group in /apps/search-engine with 3 updates (#15655) (9a51c97)
- chore(deps-dev): bump @types/node from 20.19.27 to 25.0.3 in /apps/slo-exporter in the dev-dependencies group (#15654) (07e1676)
- chore(deps): bump the minor-and-patch group with 2 updates (#15653) (4ef4deb)
- feat: enhance onboarding with compose presets and hooks (recreated) (#15676) (3c70aa0)
- fix(a11y): hide keyboard hints from screen readers in GlobalSearch (#15650) (c4aa885)
- feat(compliance): GA rails and audit pack (recreated) (#15681) (1590587)
- chore(deps-dev): bump werkzeug from 3.1.4 to 3.1.5 in /modules/connector-sdk-s3csv (#15793) (c5a2602)
- docs: add scaffolded INSLAW/PROMIS affidavit demo artifacts (#15778) (cc21ad2)
- chore(deps): bump the minor-and-patch group with 3 updates (#15797) (1d95faf)
- docs: add contribution playbooks and clarify release policies (#15362) (79770a5)
- chore(deps): bump neo4j from 4.4.1 to 6.0.3 (#15799) (66b9f81)
- chore(deps): bump pytest-asyncio from 0.21.1 to 1.3.0 (#15807) (cd62fee)
- chore(deps): bump redis from 4.3.4 to 7.1.0 (#15803) (1ec69d2)
- chore(deps): bump pydantic from 2.11.10 to 2.12.5 in the minor-and-patch group across 1 directory (#15808) (6bb2e0f)
- chore: recapture closed PR history pack (bb79ef3)
- docs(ga): harden MVP-4 GA evidence map and demo runbook (d0410ad)
- docs(ga): finalize readiness report, checklist, and control registry for MVP-4 (3aab54b)
- docs(compliance): align Control Registry and add missing release libraries (7833eb9)
- feat(release): add artifact inventory generator for deterministic releases (622a678)
- fix(compliance): add missing provenance generation script (3bfccf2)
- feat: add OpenTelemetry Apollo Server plugin (#1240) (#16129) (df93094)
- chore: fix linting issues across monorepo services (9d08ecc)
- feat: implement Golden Path hard gate with Jest+pnpm configuration validation (769f67c)
- fix(lint): remove async from methods without await, fix unused params (ea853e8)
- fix(lint): remove async from methods without await in HE engines (78a8cb6)
- fix(lint): resolve remaining warnings in perf scripts and sample test (e5e86b5)
- fix(tests): add missing beforeEach import in GA verification tests (fa50c85)

## Breaking Changes + Migration

- chore(deps): bump the github-actions group across 1 directory with 22 updates (#15784) (0a26440)

Migration: Not explicitly documented in commits; validate impact before upgrade.

## Verification

- pnpm ga:verify
- pnpm verify:governance
- pnpm verify:living-documents
- pnpm generate:sbom
- pnpm generate:provenance

## Known Limitations

- Not evidenced; update if needed.
