# Release Audit (Ground Truth Snapshot)

## Repository Map (top-level surfaces)

- **server/**: Node/Express backend, GraphQL services, connectors, migrations.
- **client/** and **apps/web/**: Frontend clients (legacy and web app), Playwright/Vite test surfaces.
- **packages/** and **ga-graphai/packages/**: Shared libraries, SDKs, policy engines, provenance ledger, workflow orchestration, and explainability packages.
- **scripts/** and **tools/**: Automation, CI helpers, GA verification scripts, optimization reports.
- **docs/**: Governance, GA testing strategy, legacy mode, release process references.
- **infrastructure and ops**: `terraform/`, `summit_helm_argocd_multiacct_pack/`, `summit_release_env_pack/`, `sealed-secrets/`, deployment/user-data scripts.
- **security and compliance**: `SECURITY/`, `security-hardening/`, `threat-models/`, `COMPLIANCE_*` evidence, `PROVENANCE_SCHEMA.md`.
- **workflows and automation**: `.github/workflows/` for CI/CD entrypoints; `Makefile`, `Justfile*`, `Taskfile.yml` for local automation; `turbo.json` for workspace tasks.

## Package Management & Tooling

- **Workspace manager**: pnpm (`packageManager": "pnpm@10.0.0"`).
- **Node versions**: `.nvmrc` pins **20.19.0**; `.tool-versions` references **nodejs 20.11.0** and **npm 10.8.0**. Prefer `.nvmrc` for runtime alignment and call out the mismatch in build docs.
- **Lockfiles**: `pnpm-lock.yaml` (root) and `Cargo.lock` for Rust components.
- **Monorepo orchestrator**: Turbo (`turbo.json`).

## CI Workflow Map (key gates)

- **Golden path**: `golden-path`, `golden-path-supply-chain.yml`, and reusable `reusable-golden-path.yml` enforce bootstrap + smoke.
- **Release gates**: `ga-release.yml`, `release-ga.yml`, `release-reliability.yml`, `rc-lockdown.yml`, `release-train.yml`, and `post-release-canary.yml` manage GA/RC checks and staged rollouts.
- **Quality gates**: `pr-quality-gate.yml`, `unit-test-coverage.yml`, `schema-compat.yml`, `schema-diff.yml`, `web-accessibility.yml`, `ci.yml` (general), `ci-security.yml`, `compliance.yml`, `doc-link-check.yml`, `weekly-assurance.yml`.
- **Security/supply chain**: `ci-security.yml`, `secret-scan-warn.yml`, `golden-path-supply-chain.yml`, `graph-guardrail-fuzz.yml`, `audit-exception-expiry.yml`, `ga-release.yml` (SLSA build via `_reusable-slsa-build.yml`).
- **Specialized lanes**: `intelgraph-ci.yml`, `hello-service-ci.yml`, `mvp4-gate.yml`, `bidirectional-sync.yml`, `deploy-multi-region.yml`, `docker-build.yml`, `repro-build-check.yml`.
- **Reusable building blocks**: `_reusable-*.yml` cover Node/pnpm setup, toolchain, release, test, perf, and AWS helpers.

## Build / Test Entrypoints

- **Package.json scripts (root)**: `pnpm install`, `pnpm build` (delegates to client/server builds), `pnpm lint`, `pnpm test` (Jest), `pnpm test:server`, `pnpm test:client`, `pnpm test:web`, `pnpm test:e2e` (Playwright), `pnpm test:smoke`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:fuzz:graph-guardrails`, `pnpm optimize:*`, `pnpm config:validate`, `pnpm security:check`, `pnpm release:*` via scripts/deploy.
- **Golden path (Makefile)**: `make bootstrap && make up && make smoke` advertised as the canonical clean-clone flow; `make ga-verify` executes Tier A/B/C GA verification.
- **GA verification**: `node --test testing/ga-verification/*.ga.test.mjs` and `node scripts/ga/verify-ga-surface.mjs` (Tier B/C per `docs/ga/TESTING-STRATEGY.md`).
- **Additional tooling**: `just` recipes (`Justfile*`), `Taskfile.yml`, and `turbo.json` orchestrations for workspace tasks.

## Known Blockers / Fragility

- **Jest/ts-jest instability** noted in `docs/ga/TESTING-STRATEGY.md`; Tier B (node-native) and Tier C (schema) verification required when Jest is unreliable.
- **Package manager divergence**: `.nvmrc` vs `.tool-versions` mismatch for Node may create non-deterministic builds if unspecified; document preferred version.
- **Network-restricted installs**: External npm registry access may fail in sandboxed CI; prefer cached/pinned `pnpm-lock.yaml` and `--frozen-lockfile` flows.

## Release Gating (current implementation)

- **MVP-4 → GA**: `mvp4-gate.yml` and `ga-release.yml` orchestrate GA validation; `release-reliability.yml` and `rc-lockdown.yml` enforce stability before tagging.
- **Agent contract**: `agent-contract.json` and GA Golden Path guardrails require Tier A/B/C artifacts for GA-critical work; enforced via `scripts/ci/verify-prompt-integrity.ts` and `scripts/ci/validate-pr-metadata.ts`.
- **Golden Path**: CI must keep bootstrap + smoke green; supply chain attestations via `_reusable-slsa-build.yml` invoked by release workflows.
