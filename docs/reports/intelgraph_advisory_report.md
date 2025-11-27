# IntelGraph Advisory Report — Summit Full-Stack Repo Review & Parallel Build Plan

## Consensus Snapshot
- **Character**: Deployable-first Summit/IntelGraph stack with GraphQL API, React client, Neo4j/Postgres/Redis, Prometheus/Grafana, smoke-tested golden path (`./start.sh` → `make up` → `make smoke`).
- **Confidence**: CI already wires lint, typecheck, Jest/Playwright, SBOM/Trivy, CodeQL, and gitleaks; health probes and seed data keep CI/dev parity.
- **Dissents**: Starkey warns about GPU/AI supply-chain drift; Foster urges default privacy/authority gating around biometric CV/ASR; Beria (Oppie) requires feature flags on any auth-touching ZK/ledger changes.

## Chair Synthesis (Guy IG)
- **Inspected**: Golden path, health endpoints (`/health*`, `/metrics`), GraphQL API + React UI, optional AI/Kafka overlay, seed datasets, and tagged releases (e.g., `2025.10.*`).
- **CI/CD & Security**: `ci.yml` covers build/test/lint/typecheck/smoke; `security.yml` runs CodeQL, dependency review, gitleaks; SBOM/Trivy noted. Release gates expected to stay green.
- **Feature Surface**: Real-time Narrative Simulation REST endpoints (`/api/narrative-sim/...`) with tick loop, event injection, and scenario library.
- **Recommendation**: Keep all MVP work behind golden-path validation and health probes, add “fast-fail” docs linking ONBOARDING + COMMAND REFERENCE from README quickstart, and require PR badge screenshots (CI + smoke) per workstream.

## Guarded Code Gate (drop-in)
Use this CI step immediately after services are healthy to enforce the documented golden path:

```bash
# scripts/ci-smoke-gate.sh
set -euo pipefail
curl -sf http://localhost:4000/health && echo "API OK"
curl -sf http://localhost:4000/health/detailed | jq -e '.status=="ok"' >/dev/null
curl -sf http://localhost:4000/metrics | head -n 5 >/dev/null
node scripts/smoke-test.js            # existing harness used by make smoke
echo "SMOKE GREEN"
```

## Risk Matrix
| Threat / Gap | Likelihood | Impact | Mitigation / Gate |
| --- | --- | --- | --- |
| AI CV/ASR enablement without authority | Med | High | Default-off feature flags; require authority claim + access reason in context; CI policy test. |
| Supply-chain drift (containers/models) | Med | Med | SBOM + SLSA provenance; digest pinning; nightly Trivy; CodeQL on main; release gate must be green. |
| Performance regressions on GraphQL p95 | Med | Med | Grafana SLO with p95 guard; smoke regressions; block merges when p95 breaches threshold for three hops. |
| Secrets leakage in PRs | Low | High | gitleaks in CI; pre-commit hook; PR template checkboxes. |
| Narrative Sim test flake | Med | Med | Deterministic seeds; headless replay harness; snapshot diffs on JSON state. |

## Eight Parallel, Merge-Safe Workstreams
Each workstream should run on `feature/<workstream>-<shortslug>`, adhere to Conventional Commits, avoid shared foundations unless noted, and attach to every PR: (1) `make smoke` transcript, (2) Grafana p95 screenshot (if applicable), (3) SBOM diff, (4) docs update, (5) ≥85% coverage on changed files. Required gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `make smoke`, CodeQL, Trivy, dependency review, gitleaks.

1. **Observability Guardrails & SLO Badges**  
   - **Goal**: Publish Summit SLO dashboards and a badge job failing on p95/error-rate regressions.  
   - **Scope**: Add `observability/grafana/provisioning/dashboards/summit-slo.json`, a minimal `apps/slo-exporter` exposing p95/error gauges, and CI badge upload.  
   - **Proof**: k6 micro-load for p95 gate; exporter math unit tests.  
   - **Merge Safety**: Additive dashboard + small exporter; no shared API changes.

2. **GraphQL Contract Tests & Persisted Queries**  
   - **Goal**: Enforce persisted queries with resolver contract snapshots.  
   - **Scope**: New `packages/graphql-contract-tests` (Jest snapshots against local schema) and persisted-query middleware in `apps/api` behind `PERSISTED_QUERIES=true`.  
   - **Proof**: Resolver breakage fails CI; smoke path exercises persisted queries.  
   - **Merge Safety**: Additive package + opt-in middleware.

3. **Provenance Manifest Export (Core Evidence Pack)**  
   - **Goal**: Verifiable manifest export (hash tree, inputs, transforms) per investigation.  
   - **Scope**: Create `packages/provenance-manifest` + CLI `pnpm prov:export --case <id>`; read-only composition; SHA-256 over artifacts; optional audience filters.  
   - **Proof**: Golden manifest fixtures; tampering makes verifier fail; smoke emits sample manifest.  
   - **Merge Safety**: New package and CLI only.

4. **Read-Only Graph-XAI Overlay (Paths/Saliency)**  
   - **Goal**: Explainable overlay returning k-shortest policy-aware paths and saliency scores without mutating state.  
   - **Scope**: `services/graph-xai` REST on port 4101 (GET only) using Neo4j read-replica; Swagger doc; front-end toggle to overlay paths.  
   - **Proof**: Deterministic graph fixture; stable top-k paths under seed.  
   - **Merge Safety**: New service + feature-flagged UI.

5. **Narrative Sim Headless Replay & Fixtures**  
   - **Goal**: Regression-proof Narrative Simulation.  
   - **Scope**: `packages/narrative-replay` with deterministic seeds and JSON state snapshots; fixtures under `apps/api/scenarios/narrative/fixtures/`; CI `pnpm sim:replay`.  
   - **Proof**: Snapshot diffs and tick-by-tick invariants.  
   - **Merge Safety**: Additive package + fixtures.

6. **Connector Hardening (STIX/TAXII + CSV Wizard)**  
   - **Goal**: Harden ingestion with schema-aware CSV mapping and TAXII puller backoff + license notes.  
   - **Scope**: `services/ingest-wizard` and UI wizard page under `apps/client` (feature-flagged); demo CSV + golden sample; rate-limit policy.  
   - **Proof**: Golden IO fixtures; simulated license block; false-positive ceiling validated.  
   - **Merge Safety**: New service + gated UI; no shared schema changes.

7. **Supply-Chain: SBOM + SLSA + Digest Pinning**  
   - **Goal**: Systematic SBOM/provenance in release gate with pinned images/models.  
   - **Scope**: `.github/workflows/security.yml` updates: Syft SBOM per service, cosign attestations, Trivy diff; fail on new criticals; publish verification docs under `docs/supply-chain/`.  
   - **Proof**: Intentional vuln sample should fail PR; attestations stored in `artifacts/`.  
   - **Merge Safety**: CI/workflow-only.

8. **Admin Telemetry: Health/Ready/Live Consistency Linter**  
   - **Goal**: Enforce canonical schema across `/health*` endpoints (status, dependencies, uptime, version, gitSha).  
   - **Scope**: `packages/health-linter` library + CLI; CI hook adds PR comment with diffs; schema JSON in package.  
   - **Proof**: Fixture services; missing/bad field fails CI.  
   - **Merge Safety**: Additive package + CI hook.

## Attachments & OKRs (Optional)
- **OKRs (Q1)**: KR-1 merge all eight PRs with green CI; KR-2 maintain GraphQL p95 ≤ 1.5s under demo load; KR-3 100% services export SBOMs and pass Trivy/CodeQL.
- **Release Goal**: After landing eight streams, tag a release mirroring `2025.10.*` with human-readable notes and p95 SLO badge.
