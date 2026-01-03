# Policy Simulation Repo Grounding

## Policy configuration loading

- **Tenant policy bundle schema and simulator**: `server/src/policy/tenantBundle.ts` (validates bundles with Zod and provides `simulatePolicyDecision`).
- **Policy bundle loader**: `server/src/policy/loader.ts` (validates extensions, cosign signature verification) and `server/src/policy/bundleStore.ts` (version tracking).
- **Baseline fixture used for simulations**: `server/src/policy/fixtures/tenant-baseline.json` (deterministic, non-production bundle).

## Scenario packs and execution

- **Security evaluation scenarios**: `testpacks/analytics/unauthorized-queries.json` (cross-tenant, PII, and injection denial expectations). Loaded by the simulation runner in `server/src/policy/simulation/runner.ts`.
- **Anomaly fixtures**: `testpacks/anomalies/metrics-latency.json` (deterministic latency spike/stability cases) consumed by the runner for alert-delta checks using `@intelgraph/anomaly-detection`.
- **Simulation harness**: `server/src/policy/simulation/runner.ts` coordinates baseline/proposed bundle runs across suites; CLI entrypoint in `server/src/policy/simulation/cli.ts`.

## CI and automation touchpoints

- **Primary CI workflow**: `.github/workflows/ci.yml` (added `policy-simulation` job for gating when policy/proposal files change).
- **Security CI suite**: `.github/workflows/ci-security.yml` (reference for broader security checks; unchanged but relevant context).
- **Scripts/commands**: `pnpm security:policy-sim --proposal <path>` (runs simulations, emits JSON report and exit codes), `pnpm test -- --runTestsByPath server/tests/policy/policy-simulation-runner.test.ts server/tests/policy/recommendation-engine.test.ts` for determinism and thresholds.

## Integration points

- **Policy proposal spec**: `server/src/policy/simulation/proposal.ts` (Zod schema for in-memory overlays; no disk mutation).
- **Recommendation thresholds**: `server/src/policy/simulation/recommendationEngine.ts` (must-pass IDs, false-positive ceilings, outcome flip guardrails).
- **Evidence and documentation**: `docs/security/policy-simulation-report.md`, `docs/security/policy-simulation-thresholds.md`, `docs/security/policy-sim-cli.md`, `docs/security/evidence/policy-simulation.md` summarize workflow, schema, and attestation locations.
