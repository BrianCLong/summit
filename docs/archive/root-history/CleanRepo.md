````md
# Summit / Maestro Conductor — Sprint 27 “Clean Merge, Clean Build, Clean Test”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Goal:** From this sprint onward, every branch and PR merges, builds, and tests **100% clean** with deterministic artifacts, supply-chain provenance, and model-orchestrator safety. We will finish hardening CI/CD + Developer Experience (DevEx), unify the Maestro Conductor (MC) build-orchestrator, and eliminate all flaky tests and non-determinism.

---

## North Stars (Sprint-level Outcomes)

1. **Green by Default:** All required checks green on `main` and all protected branches; zero flaky tests; zero “allowed failures.”
2. **Deterministic Artifacts:** Reproducible builds with pinned bases, SBOM + SLSA provenance, and SHA-only third-party actions.
3. **MC Orchestrator Baseline:** One-click “orchestrate → build → verify → publish” pipeline with policy gates and rollbacks.
4. **Safety & Policy Guardrails:** NL→Cypher read-only defaults in non-privileged contexts; OPA ABAC enforced; WebAuthn step-up for privileged actions; model routing guardrails with time/cost budgets.
5. **DevEx:** Fast local loops (≤90s `make check`), hermetic toolchain bootstrap, devcontainers ready, Grafana dashboards lit end-to-end.
6. **Observability & SLOs:** p95 build time, NLQ latency, and ingest latency tracked; burn alerts wired; golden tests for Prom/AM rules.

---

## Definition of Ready (DoR)

- Linked issue/PR with acceptance criteria and roll-back plan.
- Repro steps and scope of impact documented.
- Test plan defined (unit/integration/e2e) with data fixtures (if applicable).
- Security & compliance notes updated if touching policies, authN/Z, or supply chain.

## Definition of Done (DoD)

- All required checks green (CI, lint, type, unit/integration/e2e, license/vuln scan, SBOM, provenance).
- New/changed dashboards, runbooks, and playbooks added.
- Backwards-compatible schema changes (migrations + down-migrations).
- Rollback verified (dry run) and documented.
- Changelog entry added.

---

## Workstreams & Deliverables

### A) CI/CD & Supply Chain Hardening

**Objectives**

- Enforce SHA-only GitHub Actions with `actions/…@<40-char SHA>`.
- Hermetic builds: locked base images, exact tool versions, reproducible tarballs.
- SBOM (CycloneDX/SPDX), `cosign` attestations, SLSA3 provenance on release.
- Freeze windows honored with override + audit trail; prod env protection configured.

**Tasks**

- Pin all actions; enable GitHub Dependency Review (fail on High/Critical).
- Container base digests pinned (`FROM ghcr.io/...@sha256:<digest>`).
- Generate SBOMs (`syft` or `cyclonedx`), sign + attach to artifacts.
- Add workflow: `.github/workflows/verify-provenance.yml` to verify on publish.
- Actionlint, ShellCheck, Ajv schema validation included in required checks.

**Acceptance Criteria**

- A1: Running `make ci` locally passes all checks in ≤10 min on a dev laptop.
- A2: Release publish generates SBOM + provenance, and verification job passes.
- A3: Attempt to use a non-pinned action fails CI with helpful guidance.

---

### B) Maestro Conductor (MC) Build Orchestrator Baseline

**Objectives**

- Declarative pipeline spec (`orchestrations/mc/*.yaml`) to build all services.
- One-command local orchestrations: `mc run build --all` (or `make mc-build`).
- Canary publish with automated rollback and artifact retention policy.

**Tasks**

- Define canonical DAG (build → test → package → attest → publish).
- Implement `orchestrations/mc/build.yaml` with per-service steps, caching hints.
- Add canary channel (`edge`/`rc`) with automated health gates.
- Wire provenance checks as a gate prior to `publish:stable`.

**Acceptance Criteria**

- B1: `make mc-build` builds all services successfully on a clean machine.
- B2: `make mc-publish-canary` pushes signed images to the registry; rollback tested.
- B3: Canary promotion blocked if SLO burn or alerts breach thresholds.

---

### C) NL→Cypher Guardrails & OPA ABAC

**Objectives**

- Read-only NL→Cypher default in non-privileged contexts; explainable violation messages.
- OPA ABAC policy bundle enforced in Gateway + services; DLP redactions intact.
- WebAuthn step-up on privileged mutations; audit log with reason codes.

**Tasks**

- Finalize constraints: `services/gateway/src/nl2cypher/guardrails/constraints.ts`
- Human-readable “explain” path remains; unit & integration tests for deny cases.
- OPA bundle packaging + signature; bootstrap in CI and on service start.
- WebAuthn middleware wired to sensitive endpoints with policy hints.

**Acceptance Criteria**

- C1: Mutation attempts in non-privileged contexts return policy error + explain().
- C2: Policy updates require signed bundle; tampered bundles fail to load.
- C3: Security tests cover privilege escalation attempts and DLP masking.

---

### D) Model Orchestration Safety (MCP & Routing)

**Objectives**

- Budget caps per environment (3-hour / daily) with graceful degradation.
- Deterministic prompt templates; temperature/seed pinned in CI tests.
- Golden transcripts for model interactions (smoke and regression).

**Tasks**

- Introduce `config/model_budgets.yaml` with env-tier caps + sampling rules.
- Implement routing pre-flight checks (cost, policy, model availability).
- Create `tests/golden/model_interactions/*.jsonl` with hashes for determinism.
- Fail closed on unknown providers/models; provide operator override w/ audit.

**Acceptance Criteria**

- D1: Budget breach triggers downgrade path and emits structured event.
- D2: Golden transcript drift fails CI with diff output.
- D3: Unknown model/provider usage fails with actionable error.

---

### E) DevEx: Fast Local Loops & Devcontainers

**Objectives**

- ≤90s `make check` on typical laptop; devcontainer with pinned toolchain.
- Pre-commit hooks (lint/type/format/secrets) and consistent editorconfig.

**Tasks**

- Add `.devcontainer/devcontainer.json` + Dockerfile with all tools preinstalled.
- Provide `scripts/bootstrap.sh` for hermetic setup; cache node/go/python toolchains.
- Configure `pre-commit` with eslint, prettier, mypy/ruff (or ts-typecheck), secret scan.

**Acceptance Criteria**

- E1: Fresh clone → `./scripts/bootstrap.sh` → ready to dev in ≤10 min.
- E2: Pre-commit blocks format/type/lint violations locally and in CI.
- E3: VS Code Remote-Containers opens green; tasks/run configs available.

---

### F) Observability, SLOs & Golden Alerts

**Objectives**

- Prometheus/Alertmanager/Grafana fully wired in demo and staging.
- Golden alert tests validate rules; dashboards for p95 NLQ/ingest/build.

**Tasks**

- Provision datasources & dashboards via code; pin Grafana UIDs.
- Add alert rule tests (promtool) for each P0/P1 alert; include fixtures.
- Load generator for demo to light up panels; k6 profiles for NLQ and ingest.

**Acceptance Criteria**

- F1: `make promtest` passes; CI fails on invalid rules or missing labels.
- F2: Dashboards load with non-null series in demo & staging.
- F3: k6 “go/no-go” gate runs on pre-release; breaches block promotion.

---

### G) Security Posture & Access Controls

**Objectives**

- WebAuthn step-up for privileged paths; secrets rotated and centralized.
- CODEOWNERS and required reviews enforced; protected branch wait timers.

**Tasks**

- Implement step-up challenge & caching TTL; test MFA failures & recovery paths.
- Migrate secrets to approved store; add “break-glass” documented procedure.
- Tighten CODEOWNERS to ensure security/policy changes require Security review.

**Acceptance Criteria**

- G1: Privileged ops without step-up are blocked in staging/prod.
- G2: Secrets scanned; leaked secret test (synthetic) triggers pipeline fail.
- G3: Security team required for policy/secret/workflow changes.

---

## Required Artifacts (end of sprint)

- `orchestrations/mc/build.yaml` (and service DAGs), `Makefile` targets: `mc-build`, `mc-publish-canary`, `mc-promote`.
- `.github/workflows/*.yml`: pinned actions, provenance verify, promtool, k6 gate, dependency review.
- `security/policy/abac.rego`, `security/policy/policy-bundle.tar.gz.sig`, `security/policy/trust-policy.yaml`.
- `config/model_budgets.yaml`, `tests/golden/model_interactions/*.jsonl`.
- `.devcontainer/*`, `scripts/bootstrap.sh`, `.pre-commit-config.yaml`, `.editorconfig`.
- `ops/observability/` (datasource/dashboards), `ops/alerts/*.rules.yml`, `tests/prometheus/*.test.yml`.
- Runbooks: `RUNBOOK-CI-CD.md`, `RUNBOOK-MC-Orchestrator.md`, `RUNBOOK-Rollback.md`.

---

## Branch/Env Strategy

- **Branches:** `main` (protected), `develop`, feature branches `feat/*`, hardening `hardening/*`.
- **Envs:** `dev` → `staging` → `prod`; promotion only via MC orchestrator; canary channel `rc/*`.
- **Protection:** Required checks: `lint`, `typecheck`, `unit`, `integration`, `e2e`, `promtest`, `k6-gate`, `sbom`, `provenance-verify`, `dep-review`.

---

## How to Run (Developer Quickstart)

```bash
# 0) One-time bootstrap
./scripts/bootstrap.sh

# 1) Fast local loop
make check           # lint+type+unit in ≤90s
make test            # full unit
make itest           # integration (spins compose if needed)

# 2) Orchestrated build
make mc-build        # builds all services deterministically
make mc-publish-canary REGISTRY=ghcr.io/org APP_VERSION=0.27.0-rc.1

# 3) Verify supply chain
make sbom            # generate SBOMs
make attest          # cosign attestations + provenance
make verify-provenance ARTIFACT=dist/app-0.27.0.tgz

# 4) Observability gates
make promtest        # golden alert tests
make k6-gate         # go/no-go perf test pre-promotion
```
````

---

## Test Matrix (must be green)

| Suite         | Scope                                      | Gate |
| ------------- | ------------------------------------------ | ---- |
| Lint/Format   | eslint/prettier/ruff/shellcheck/actionlint | Req  |
| Types         | TS/mypy                                    | Req  |
| Unit          | All services                               | Req  |
| Integration   | Gateway↔Neo4j, Ingest, Export, MC         | Req  |
| E2E           | NL→Cypher read-only + step-up mutation     | Req  |
| Security      | OPA ABAC + DLP + secret scan               | Req  |
| Supply Chain  | SBOM + dep-review + provenance verify      | Req  |
| Observability | promtool golden tests                      | Req  |
| Performance   | k6 NLQ/ingest thresholds                   | Req  |
| Determinism   | Golden transcripts hash match              | Req  |

---

## Risk, Rollback, and Freeze

- **Risk:** Build cache invalidation, model-cost regressions, policy misconfig.
- **Mitigations:** Canary channel, budget guardrails, feature flags, dark-launch.
- **Rollback:** `RUNBOOK-Rollback.md` defines `mc rollback --env <staging|prod>`; verify images by digest and revert within 5 minutes.
- **Freeze Windows:** Enforced via `ops/freeze-windows.yaml` with on-call approvers and audit.

---

## Assignments (suggested)

- **CI/CD & Supply Chain:** 2 eng (Platform)
- **MC Orchestrator:** 2 eng (Build/Release)
- **NL→Cypher & OPA:** 2 eng (Gateway/Sec)
- **MCP Safety & Routing:** 1 eng (AI Platform)
- **DevEx & Devcontainers:** 1 eng (DX)
- **Observability & k6:** 1 eng (SRE)
- **Security & Access:** 1 eng (Security)

---

## Acceptance Demo (E2E)

1. Fresh clone on a clean laptop → `./scripts/bootstrap.sh` → `make check` green ≤90s.
2. `make mc-build` builds all services; SBOM & attestations generated.
3. Canary publish → k6 gate → promtest → auto-promotion to `rc` only if green.
4. Attempted privileged mutation without WebAuthn step-up → policy deny with explain().
5. Golden transcript drift intentionally introduced → CI fails; revert → green.
6. Live Grafana shows build p95/NLQ p95/ingest p95; synthetic alert test passes.

---

## Reporting & Daily Rituals

- **Daily:** Post CI heatmap + red/green status; top 3 blockers; burn-down screenshot.
- **Mid-sprint Checkpoint (Sep 25):** Canary pipeline live; ≥80% tests passing; no flakies.
- **Sprint Review (Oct 2):** Demo acceptance flow; publish signed artifacts and release notes.

---

## Success Criteria (Exit)

- 0 flaky tests; 100% required checks pass on protected branches.
- Reproducible build artifacts with SBOM + verified provenance.
- MC orchestrator “build→verify→publish→promote/rollback” proven in demo.
- Guardrails (OPA/NL→Cypher/WebAuthn) enforced with logs and dashboards.
- DevEx improvements documented; new-hire setup ≤10 minutes to green `make check`.

```

```

````md
# Summit / Maestro Conductor — Sprint 27B “Merge Everything Clean”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Land all outstanding work safely: merge/close every pending PR/branch, delete dead code, eliminate flaky tests, and finish repo hygiene so `main` stays perpetually green with deterministic, policy-guarded artifacts.

---

## North-Star Outcomes

1. **Zero PR Drift:** All open PRs either merged, split, or closed with rationale; no PR older than 7 days by end of sprint.
2. **Perma-Green:** `main` required checks are 100% green for 5 consecutive days; zero allowed-failures.
3. **No Flakies:** Flaky tests quarantined → fixed or removed with coverage replacement; flakiness tracker goes to 0.
4. **Repo Hygiene:** Orphan branches pruned; CODEOWNERS & branch protection enforced; license/compliance passes across all packages.
5. **Determinism:** Reproducible builds verified twice on clean machines; SBOM + provenance verification passes on promotion.
6. **Docs & Runbooks:** Up-to-date runbooks for merge strategy, test triage, rollback, and release notes.

---

## Workstreams

### A) PR Battlefield Triage & Merge

**Tasks**

- Build a PR heatmap (stale, conflicted, failing checks, missing review).
- Create `MERGE-PLAN.md` with a sorted list: (1) clean & trivial, (2) requires rebase, (3) conflicts, (4) split needed, (5) close.
- Add an “Auto-Rebase + Re-run Checks” label + GH Action that:
  - Rebases from `main`, re-runs required checks, comments status, and re-assigns.
- Enforce “one PR, one purpose” (split feature + refactors).
- Require issue links in PR templates; missing links block merge.
- Mandate “rollback note” and “operational impact” sections in PR body.

**Acceptance Criteria**

- A1: 100% PRs are in `MERGE-PLAN.md` with disposition + owner + ETA.
- A2: 90%+ PRs merged or closed; remaining ones converted into fresh atomic PRs.
- A3: Auto-Rebase bot comment present on all PRs that needed a rebase.

---

### B) Flaky Test Kill-List

**Tasks**

- Turn on CI flake detector (repeat failed tests x3, mark flaky on non-determinism).
- Create `tests/FLAKE-KILL-LIST.md` with root cause hypothesis and assignees.
- Quarantine flakies using `@quarantined` tag; add a CI job that fails if quarantined count > 0 at sprint end.
- Replace removed flakies with deterministic coverage (mocks/fixtures/golden outputs).
- Harden async/time-sensitive tests with fake timers, seeded RNG, fixed network timeouts.

**Acceptance Criteria**

- B1: `quarantined_count == 0` by sprint end; CI gate enforces it.
- B2: Flake rate = 0% over last 200 CI runs (rolling window).
- B3: Coverage delta ≥ baseline (no regression after removing flakies).

---

### C) Repo Hygiene & Policy Enforcement

**Tasks**

- Prune orphan branches >30 days old (auto PR to delete with 72h grace).
- Update `CODEOWNERS` to require Security for policy/secret/workflow changes; Platform for CI/CD; Data for schema changes.
- Require signed commits/tags; enforce `statusChecks` set in branch protection.
- Secret scanning as a required check (synthetic secret to validate fail-closed).
- License scanning: deny GPLv3+ unless pre-approved; record exceptions in `SECURITY/THIRD_PARTY_LICENSES.md`.

**Acceptance Criteria**

- C1: `git branch -r` shows only active patterns; pruning report committed to `ops/reports/branch_prune_YYYYMMDD.md`.
- C2: Attempt to push unsigned tag → rejected in CI with actionable message.
- C3: Dependency/License review passes with no unapproved licenses.

---

### D) Deterministic Builds & Repro Checks

**Tasks**

- Pin toolchain versions in `.tool-versions`/`asdf` or `devcontainer.json`.
- Lock Docker bases by digest; cache warms via `make warm-cache`.
- Add “repro job” that rebuilds on a separate runner and diff-checks SBOM + artifact hashes (allowlist of expected deltas like timestamps stripped).
- Verify cosign attestations + SLSA provenance on release candidates.

**Acceptance Criteria**

- D1: Two independent clean runners produce identical artifact hashes (± approved metadata).
- D2: SBOM diff is empty across repro run; provenance verify job green.
- D3: Any unpinned tool causes CI fail with remediation hint.

---

### E) Data & Schema Safety

**Tasks**

- Audit pending migrations; ensure idempotent up/down; generate `MIGRATION-RUNBOOK.md`.
- Add pre-deploy dry-run (`--noop`) in staging with row counts + timing.
- Collect p95 migration timings; add guard: block promotion if estimated > SLO.

**Acceptance Criteria**

- E1: All migrations reversible, timed, and documented.
- E2: Staging dry-run green; prod estimate within SLO threshold.
- E3: Rollback tested on staging snapshot.

---

### F) Documentation & Runbooks

**Artifacts to deliver**

- `MERGE-PLAN.md` — live tracker with statuses/owners.
- `FLAKE-KILL-LIST.md` — test table (suite, owner, root cause, fix).
- `RUNBOOK-Merge-Strategy.md` — atomic PR rules, labels, automation.
- `RUNBOOK-Rollback.md` — `mc rollback` steps + verification.
- `RELEASE-NOTES_TEMPLATE.md` — change categories, risks, ops notes.
- `CONTRIBUTING.md` — local loop, commit rules, review rubric.

**Acceptance Criteria**

- F1: All runbooks present and referenced from `README.md`.
- F2: Sprint review uses these docs for live demo (merge → release-candidate).

---

## Required CI Gates (Protected Branches)

- `lint`, `typecheck`, `unit`, `integration`, `e2e`
- `promtest` (golden alerts), `k6-gate` (NLQ/ingest)
- `sbom`, `provenance-verify`, `dep-review`, `license-scan`
- `determinism-repro` (cross-runner build diff)
- `flake-detector` (must be zero)

---

## Command Quickstart

```bash
# Update PR heatmap + plan
make pr-heatmap                     # emits ops/reports/pr_heatmap.json
make pr-plan                        # seeds MERGE-PLAN.md from GitHub

# Flake work
make test-flake-scan                # repeat failed specs x3
make test-quarantine pattern="..."  # tag + quarantine
make test-drift-report              # golden output drift

# Deterministic build
make clean && make mc-build
make sbom attest verify-provenance
make determinism-repro              # second-runner repro + diff

# Repo hygiene
make branch-prune-dryrun            # report only
make branch-prune-apply             # opens PR to delete stale branches
```
````

---

## Acceptance Demo (Sprint Review)

1. Walk through `MERGE-PLAN.md`: show all PRs dispositioned and owners.
2. Merge a conflicted PR live using Auto-Rebase; show checks turning green.
3. Introduce a flaky test; CI flags it; quarantine → fix → green again.
4. Run `determinism-repro`: show identical hashes + SBOM diff = Ø.
5. Promote `rc` build with provenance verification; demonstrate rollback.
6. Display Grafana panels for CI pass rate, build p95, NLQ p95, ingest p95.

---

## Assignments (Suggested)

- **PR Triage & Auto-Rebase:** Platform (2)
- **Flaky Kill-List & Testing:** QA/Dev (2)
- **Determinism & Supply Chain:** Platform/Sec (2)
- **Repo Hygiene & Policies:** Sec/Platform (1+1)
- **Docs & Runbooks:** Eng Prod (1)

---

## Definition of Done (Sprint 27B)

- All PRs dispositioned; 90% merged/closed; remainder re-filed as atomic PRs.
- `main` green 5 days straight; quarantined tests = 0.
- Deterministic builds verified on two clean runners; SBOM + provenance pass.
- Branches pruned; CODEOWNERS and protections enforced.
- Runbooks published and used in review demo.

```

```

````md
# Summit / Maestro Conductor — Sprint 27C “DevEx Turbo & Orchestrator E2E”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Make every developer fast and fearless. Ship a hermetic, one-command dev environment; wire the Maestro Conductor (MC) pipeline end-to-end (build→test→attest→observe→promote/rollback); and light up dashboards with real signals from a demo stack.

---

## North-Star Outcomes

1. **10-minute Onboarding → Green:** Fresh clone to a working environment with `make check` green in ≤10 minutes.
2. **90-second Local Loop:** `make check` (lint+type+unit) ≤90s on a typical laptop.
3. **One-Command Orchestration:** `make mc-build` + `make mc-publish-canary` works on clean machines and CI.
4. **Live Observability:** Demo stack emits usable metrics/logs/traces; dashboards show non-null series; golden alert tests pass.
5. **Reproducible Toolchain:** Devcontainer/asdf pin all tools; “works on my machine” class of bugs eliminated.

---

## Tracks & Deliverables

### A) Hermetic Dev Environment & Bootstrap

**Tasks**

- Add `.devcontainer/devcontainer.json` + `Dockerfile.dev` with pinned Node, Go, Python, OpenJDK, neo4j-client, jq, yq, k6, promtool, cosign, syft/grype.
- Create `scripts/bootstrap.sh` for non-devcontainer users (macOS + Linux).
- Wire `pre-commit` with eslint, prettier, ruff/mypy (or tsc), shellcheck, actionlint, secret-scanner.
- Provide `.editorconfig` and VS Code config: `.vscode/settings.json`, `tasks.json`, `launch.json`.

**Acceptance Criteria**

- A1: Fresh clone → `./scripts/bootstrap.sh` completes ≤10 minutes on a clean laptop.
- A2: `pre-commit` blocks formatting/type/lint issues locally and in CI.
- A3: Devcontainer opens green with prewired terminals, tasks, and extensions.

**Artifacts**

- `.devcontainer/*`, `scripts/bootstrap.sh`, `.pre-commit-config.yaml`, `.editorconfig`, `.vscode/{settings.json,tasks.json,launch.json}`.

---

### B) Orchestrator E2E (Build→Test→Package→Attest→Publish→Promote/Rollback)

**Tasks**

- Define canonical DAG in `orchestrations/mc/build.yaml` (per-service steps, cache hints, test gates).
- Add `Makefile` targets: `mc-build`, `mc-test`, `mc-package`, `mc-attest`, `mc-publish-canary`, `mc-promote`, `mc-rollback`.
- Attach SBOM generation (CycloneDX/SPDX) and `cosign` attestations; verify SLSA provenance on RCs.
- Implement dry-run promotion with health checks, and a “break-glass” documented override.

**Acceptance Criteria**

- B1: `make mc-build` succeeds from a clean checkout without manual setup.
- B2: RC publish produces SBOM + provenance; `make verify-provenance` passes.
- B3: `make mc-rollback` reverts a canary to the previous digest in ≤5 minutes (staging demo).

**Artifacts**

- `orchestrations/mc/build.yaml`, `Makefile` expansions, `ops/runbooks/RUNBOOK-MC-Orchestrator.md`.

---

### C) Demo Stack + Golden Observability

**Tasks**

- Commit `docker-compose.demo.yml` with: core services, Prometheus, Alertmanager, Grafana, load generator, and a sample Neo4j/Postgres.
- Provision Grafana (datasource+dashboards) via code with stable UIDs; include CI pass rate, build p95, NLQ p95, ingest p95.
- Add promtool rule tests + fixtures; create k6 profiles for NLQ/ingest with go/no-go thresholds.

**Acceptance Criteria**

- C1: `make demo-up && make demo-smoke` yields non-null panels; alert rules validate with `make promtest`.
- C2: k6 profiles execute via `make k6-gate` and enforce thresholds.
- C3: CI fails on invalid Prom rules or missing labels; passes with current rules.

**Artifacts**

- `docker-compose.demo.yml`, `ops/observability/{datasources,dashboards}/*.json`, `ops/alerts/*.rules.yml`, `tests/prometheus/*.test.yml`, `tests/k6/*.js`.

---

### D) Deterministic Tests & Golden Artifacts

**Tasks**

- Seed RNGs; freeze time for time-sensitive tests; set fixed network timeouts.
- Introduce golden transcripts for model interactions: `tests/golden/model_interactions/*.jsonl` with hash checks.
- Add “determinism” CI job rebuilding artifacts on an isolated runner and diffing SBOM + hashes (timestamp/nonce fields stripped).

**Acceptance Criteria**

- D1: Re-running tests locally/CI yields identical results (aside from allowed deltas).
- D2: Transcript drift triggers CI failure with a concise diff and remediation hint.
- D3: Hash mismatch in cross-runner build fails CI.

**Artifacts**

- `tests/golden/model_interactions/*.jsonl`, `tools/determinism/diff.py`, CI job configuration.

---

### E) Developer Experience Highlights

**Tasks**

- Introduce `make check` (≤90s) bundling lint+types+fast-unit; `make test` for full suite; `make itest` integration with ephemeral services.
- Write concise READMEs per service: how to run, test, and debug in 60 seconds.
- Add `CONTRIBUTING.md` with commit message convention, PR rubric, and review checklist.

**Acceptance Criteria**

- E1: `make check` ≤90s on a typical laptop; documented benchmarks in `ops/reports/devex_bench_YYYYMMDD.md`.
- E2: Each service README includes “Run/Debug/Test” snippets that work as-is.
- E3: PR template enforces issue link, risk/rollback section, and test evidence.

**Artifacts**

- `CONTRIBUTING.md`, updated `README.md` files, `.github/pull_request_template.md`, `ops/reports/devex_bench_*.md`.

---

## Required CI Gates (added/confirmed this sprint)

- `lint`, `typecheck`, `unit`, `integration`, `e2e`
- `promtest` (golden alert rules)
- `k6-gate` (NLQ/ingest performance)
- `sbom`, `provenance-verify`
- `determinism-repro` (cross-runner hash & SBOM diff)
- `secret-scan`, `license-scan`, `dep-review`

---

## Quickstart Commands

```bash
# 0) Bootstrap (outside devcontainer)
./scripts/bootstrap.sh

# 1) Fast local loop
make check             # ≤90s lint+types+unit
make test              # full unit suite
make itest             # integration with ephemeral services

# 2) Orchestrator E2E
make mc-build
make mc-test
make mc-package sbom attest
make mc-publish-canary REGISTRY=ghcr.io/org APP_VERSION=0.27.0-rc.2
make verify-provenance ARTIFACT=dist/app-0.27.0-rc.2.tgz

# 3) Demo stack & observability
make demo-up
make demo-smoke        # hits key endpoints; emits metrics
make promtest          # alert rule tests + fixtures
make k6-gate           # perf go/no-go
make demo-down
```
````

---

## Review & Demo Script (Sprint Close)

1. Fresh clone → `./scripts/bootstrap.sh` → `make check` green in ≤10 minutes.
2. `make mc-build` → attest → publish canary; show SBOM/provenance artifacts.
3. Run `make demo-up`; open Grafana → show CI pass rate, build p95, NLQ p95.
4. Execute `make k6-gate` and `make promtest` (pass); break a rule → fail-closed → revert → green.
5. Trigger `make mc-rollback` on staging canary; verify digest rollback in logs.
6. Show `ops/reports/devex_bench_*.md` with ≤90s check and improved times.

---

## Risks & Mitigations

- **Risk:** Toolchain drift between devcontainer and CI.
  **Mitigation:** Pin versions; CI asserts same devcontainer image digest.
- **Risk:** k6 thresholds flaky on small laptops.
  **Mitigation:** Provide CI baselines; local mode runs at reduced VUs with advisory only.
- **Risk:** Prom rule churn breaks tests.
  **Mitigation:** Golden fixtures + rule test harness; review gate for rule changes.

---

## Definition of Done (27C)

- Onboarding ≤10 minutes to green `make check`; devcontainer usable by all roles.
- Orchestrator E2E path demonstrated; attest & provenance verified in CI.
- Demo stack produces live metrics; dashboards and alert tests pass.
- Deterministic tests and cross-runner reproducibility enforced in CI.
- DevEx docs/templates merged; PRs show improved cycle time.

```

```

````md
# Summit / Maestro Conductor — Sprint 27D “Security, Policy & Data Safeguards”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Lock down policy enforcement end-to-end (OPA ABAC, NL→Cypher RO-by-default), harden credentials and supply chain, prove auditability (tamper-evident logs, provenance), and enforce data protections (DLP, PII, secrets) across pipelines and runtime.

---

## North-Star Outcomes

1. **Policy Always-On:** ABAC + DLP redactions enforced in Gateway/services; all privileged ops require step-up (WebAuthn) or policy exception with audit.
2. **Data Minimization by Default:** RO queries in non-privileged contexts; mutation pathways gated by policy + explicit business reason.
3. **Secrets & Keys Hygienic:** No inline secrets; centrally managed; rotation runbook executed on staging.
4. **Supply Chain Trusted:** SBOM+SLSA3+cosign on all artifacts; verify on promote; fail-closed on mismatch.
5. **Tamper-Evident Observability:** Structured, signed audit logs with time-source pinning; dashboards for deny/allow/redact rates.

---

## Tracks & Deliverables

### A) OPA ABAC + Policy Bundle Signing

**Tasks**

- Finalize ABAC policies (`security/policy/abac.rego`) for entity/field-level controls: role, purpose, data sensitivity, tenant, environment.
- Package signed policy bundle: `policy-bundle.tgz` + `.sig` via cosign; verify signature on service startup and in CI.
- Add policy version header to responses; expose `/policy/health` and `/policy/version`.

**Acceptance Criteria**

- A1: Gateway refuses to boot with unsigned/invalid bundle (negative test in CI).
- A2: `/policy/health` returns `ok`, includes policy digest and signer identity.
- A3: Attempt to load modified bundle → startup fails with actionable error.

**Artifacts**

- `security/policy/abac.rego`, `security/policy/bundle/policy-bundle.tgz(.sig)`, `services/gateway/src/policy/loader.ts`.

---

### B) NL→Cypher Guardrails (RO-by-Default + Explain)

**Tasks**

- Default read-only in non-privileged contexts; mutation verbs require `purpose=admin|ops` and step-up token.
- Enrich `explain()` with human-readable denial reasons and suggested escalation path.
- Add test fixtures for deny/allow/redact triads; assert no direct-identifier projection without purpose flag.

**Acceptance Criteria**

- B1: Non-privileged mutation denied with `explain()` describing violated clauses.
- B2: Privileged mutation with valid step-up + purpose header succeeds and is audited.
- B3: CI suite `nl2cypher-policy` passes with ≥95% branch coverage on constraint paths.

**Artifacts**

- `services/gateway/src/nl2cypher/guardrails/{constraints.ts,explain.ts,tests/*}`.

---

### C) WebAuthn Step-Up + AuthZ Hooks

**Tasks**

- Implement WebAuthn for sensitive endpoints with short-lived step-up grants (TTL, audience, scope); cache & revoke on logout.
- Add `x-stepup-reason` and `x-purpose` headers to audit trail; block if missing for privileged ops.
- Incident recovery path: backup code flow; enforced in staging DR drill.

**Acceptance Criteria**

- C1: Attempt privileged op without step-up → 401 with remediation link.
- C2: Stolen cookie simulation blocked by missing bound step-up token (negative test).
- C3: DR drill executes backup code flow successfully; logged with `reason=DR_TEST`.

**Artifacts**

- `services/common/auth/webauthn/*`, `RUNBOOK-WebAuthn-StepUp.md`.

---

### D) Secrets, Keys, and Rotation

**Tasks**

- Move all secrets to approved store (e.g., GH Encrypted Secrets + cloud KMS) referenced only by env; remove plaintext from repo/compose.
- Create rotation playbook; rotate staging secrets/keys (JWT signing, DB, API providers).
- Add CI synthetic secret to assert fail-closed secret scanning.

**Acceptance Criteria**

- D1: Repo scan yields **0** secrets; synthetic leak causes CI fail with pointer to remediation.
- D2: Staging rotation completed; `ROTATION-YYYYMMDD.md` contains digests/timestamps/owners.
- D3: All services boot with rotated materials; old materials revoked.

**Artifacts**

- `SECURITY/SECRETS.md`, `RUNBOOK-Secrets-Rotation.md`, `ops/reports/ROTATION-*.md`.

---

### E) Data Protection & DLP

**Tasks**

- Define PII field taxonomy and tagging (`schema/tags.yml`): direct (SSN, phone, email), quasi (DOB, ZIP), sensitive (credentials).
- Enforce field-level redaction/masking in responses and logs; prohibit exporting raw PII unless `purpose=legal|compliance` + step-up.
- Add export gate with OPA check; require justification ID and case record.

**Acceptance Criteria**

- E1: Attempt to export PII without purpose → deny + explain; with purpose+step-up → allow + audit.
- E2: Structured log events include `actor`, `purpose`, `policy_version`, `fields_redacted`, `dlp_rules`.
- E3: DLP tests cover 100% of tagged fields (table-driven test).

**Artifacts**

- `security/dlp/rules.yml`, `services/*/middleware/dlp.ts`, `tests/dlp/*.spec.ts`.

---

### F) Tamper-Evident Audit & Time Source

**Tasks**

- Implement append-only audit log with periodic hash-chain checkpoints; sign checkpoint manifests.
- Pin service time to NTP source, detect skew >Δ, and refuse privileged ops until healthy.
- Create Grafana panels for allow/deny/redact rates; alert on spikes or policy version drift.

**Acceptance Criteria**

- F1: Hash-chain verification tool `tools/audit/verify_hashchain.ts` validates logs; tampering yields failure.
- F2: Time skew injection test blocks privileged ops and emits `policy_time_skew` alert.
- F3: Grafana panels populated in demo + staging; golden alert tests green.

**Artifacts**

- `tools/audit/{hashchain.ts,verify_hashchain.ts}`, `ops/observability/dashboards/policy.json`, `ops/alerts/policy.rules.yml`.

---

### G) Supply Chain Enforcement (Verify on Promote)

**Tasks**

- Promotion job verifies: image digest pinned, SBOM present, cosign attestations valid, SLSA provenance compliant with `security/policy/trust-policy.yaml`.
- Block on missing/weak provenance; expose remediation in logs and PR comment.

**Acceptance Criteria**

- G1: Promote with missing attestation fails; with valid materials passes.
- G2: PR comment includes provenance summary (builder id, materials, subjects).
- G3: `make verify-provenance` required on protected branches.

**Artifacts**

- `.github/workflows/verify-provenance.yml`, `security/policy/trust-policy.yaml`.

---

## CI Gates (must pass on protected branches)

- `nl2cypher-policy` (constraints+explain coverage ≥95%)
- `opa-bundle-verify` (signature + digest match)
- `secret-scan` (fail-closed with synthetic secret)
- `dlp-tests` (table-driven coverage of PII tags)
- `audit-hashchain-verify`
- `provenance-verify` + `sbom`
- Existing: `lint`, `typecheck`, `unit`, `integration`, `e2e`, `promtest`, `k6-gate`, `determinism-repro`, `dep-review`, `license-scan`

---

## Quickstart (Dev & CI)

```bash
# Policy bundle
make policy-bundle          # builds & signs bundle
make policy-verify          # verifies signature locally

# NL→Cypher guardrails
make test-nl2               # policy/constraints/explain tests

# WebAuthn step-up (local)
make stepup-dev             # seeds credentials; prints test flow
make stepup-drill           # exercises backup code path

# Secrets & rotation
make secret-scan            # repo scan (expects 0)
make rotate-staging         # executes rotation runbook in staging

# DLP & audit
make dlp-test               # table-driven DLP checks
make audit-verify           # validate hash-chain integrity

# Supply chain on promote
make sbom attest
make verify-provenance      # checks attestation + SLSA policy
```
````

---

## Review & Demo Script (Sprint Close)

1. **Policy Health:** Show `/policy/version` & `/policy/health`; restart with tampered bundle → boot fails.
2. **Guardrail Live:** Non-privileged mutation → deny with `explain()`; repeat with step-up + purpose → allow; inspect audit log event.
3. **DLP Gate:** Attempt PII export without purpose → deny; with `purpose=legal` + case ID → allow; verify redaction counts in Grafana.
4. **Secrets Rotation:** Walk through `ROTATION-*.md`; demonstrate old JWT key rejected.
5. **Tamper-Evident Logs:** Run `make audit-verify`; inject log mutation → verification fails; revert → passes.
6. **Provenance on Promote:** Run promotion check; show failure on missing attestation; re-run with signed materials → pass.

---

## Risks & Mitigations

- **Policy Misconfig → Outage:** Canary + break-glass policy signed by Security; rollback via MC orchestrator.
- **Step-Up Friction:** Cache short-lived grant; developer bypass only in `dev` env, never propagated to `staging|prod`.
- **Secret Store Drift:** Periodic drift detector compares env → store; alert on mismatch.

---

## Definition of Done (27D)

- Signed OPA bundle enforced in all services; invalid bundles fail-closed.
- NL→Cypher RO-by-default with explainable denials; privileged path requires step-up + purpose.
- Repo free of plaintext secrets; staging rotation completed & documented.
- DLP tagging + gates operational with tests and dashboards.
- Audit hash-chain and provenance verification integrated; promotion blocked without trusted materials.

```

```

````md
# Summit / Maestro Conductor — Sprint 27E “Performance, Cost & Reliability”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Hit our SLOs with headroom, lock in per-env cost budgets, and make the system boringly reliable. We will optimize the hot paths (NL→Cypher, ingest, export), right-size infra, and wire automated reliability drills and cost guards into CI/CD + MC promotion.

---

## North-Star Outcomes

1. **SLOs Met with 30% Headroom:** NLQ p95 ≤ 900 ms; Ingest p95 ≤ 1.5 s; Export p95 ≤ 1.2 s (staging, steady load).
2. **Cost Budgets Enforced:** Per-env monthly run-rate within targets with auto-throttle/downgrade; budget breach alerts and auto-actions.
3. **Reliability Drills Pass:** Chaos and dependency loss drills pass (brownout tolerances, timeouts, backoff/jitter); zero data loss under tested failure modes.
4. **Indexing & Caching:** Query plans stable and documented; DB/graph indexes and app caches reduce tail latency ≥25%.
5. **MC Promotion Gate:** Promotion blocks on SLO/cost non-compliance; rollback policy verified.

---

## Tracks & Deliverables

### A) Baseline & Targets (SLO/SLA/SLI)

**Tasks**

- Define/confirm SLIs: NLQ latency, ingest latency, export latency, error rate, saturation (CPU/mem), and cost per 1k NLQ.
- Add `ops/slo/slo.yaml` with thresholds and alerting policies; expose `/metrics/slo_targets` for audit.
- Record 48-hour baseline on staging with current workloads (k6 profiles).

**Acceptance Criteria**

- A1: `ops/slo/slo.yaml` merged; Grafana “SLO Overview” shows live status.
- A2: Baseline report `ops/reports/slo_baseline_YYYYMMDD.md` committed.
- A3: Alertmanager routes for P0/P1 breaches configured and tested.

**Artifacts**

- `ops/slo/slo.yaml`, Grafana SLO dashboard JSON, baseline report.

---

### B) Hot-Path Optimization (NL→Cypher / Gateway / DB)

**Tasks**

- Instrument NL→Cypher phases: parse → constrain → plan → execute; export histograms and spans.
- Capture top 10 slow queries; `EXPLAIN/PROFILE` (Neo4j/SQL) and add/adjust indexes.
- Introduce read-replica routing and result-cache (TTL + keying by normalized query + purpose).
- Add adaptive timeouts and circuit breakers per downstream (graph, search, vector, RDBMS).

**Acceptance Criteria**

- B1: p95 NLQ reduced ≥25% vs. baseline; no increase in error rate.
- B2: Query plans checked in `ops/query-plans/*` with before/after profiles.
- B3: Cache hit-rate ≥ 60% for eligible NLQ; stale-while-revalidate working.

**Artifacts**

- `services/gateway/src/nl2cypher/metrics.ts`, `ops/query-plans/*.md`, cache middleware, replica routing config.

---

### C) Ingest & Export Throughput

**Tasks**

- Batch sizes and concurrency tuned; backpressure signals surfaced (queue depth, lag).
- Idempotent ingest with dedupe keys; retry policy with DLQ for poison messages.
- Streaming export chunking + compression; progressive responses for large sets.

**Acceptance Criteria**

- C1: Ingest p95 ≤ 1.5 s under target k6 workload; zero duplicates under retry storms.
- C2: DLQ drain runbook validated; metrics for DLQ size and age.
- C3: Export p95 ≤ 1.2 s for 90th percentile payloads.

**Artifacts**

- `RUNBOOK-DLQ.md`, ingest/export tunables in `config/perf.yaml`, k6 profiles.

---

### D) Cost Guardrails & Auto-Throttling

**Tasks**

- Finalize `config/model_budgets.yaml` with per-env, per-provider hard/soft limits.
- Compute cost/req in Gateway (prom metric + PR comment on heavy diffs).
- Implement auto-throttle: degrade to cheaper model or reduce context window when soft limit hit; block on hard limit with on-call override.
- Infra rightsizing: autoscaling policies and instance types re-selected; spot/fleet where safe.

**Acceptance Criteria**

- D1: Cost per 1k NLQ reduced ≥20% vs. baseline at equal SLOs.
- D2: Soft-limit breach observed in staging triggers downgrade and alert, with recovery.
- D3: MC promotion fails if projected monthly run-rate > budget by ≥10%.

**Artifacts**

- `config/model_budgets.yaml`, cost estimator `tools/cost/project.py`, autoscaling policy docs.

---

### E) Reliability & Chaos (Brownouts, Time Skew, Dependencies)

**Tasks**

- Add chaos suite: inject latency, drop 5–10% of calls, and kill replicas during k6 runs.
- Verify exponential backoff/jitter; set per-call budgets; bulkhead isolation between hot paths.
- Simulate time skew and NTP loss; ensure privileged ops blocked (ties to policy from 27D).

**Acceptance Criteria**

- E1: All chaos scenarios pass without breaching SLOs more than 5 consecutive minutes.
- E2: No error amplification (retry storms) observed; retry budget dashboard green.
- E3: Time skew drill blocks privileged ops, logs audit event, and self-recovers.

**Artifacts**

- `tests/chaos/*.sh|.ts`, Grafana “Chaos & Retry Budget” dashboard, Alert rules.

---

### F) Promotion Gate Wiring (SLO/Cost)

**Tasks**

- Extend MC orchestrator gate: `mc promote` requires green SLO report + cost projection.
- CI job `slo-cost-gate` composes last 24h metrics + k6 smoke → pass/fail with summary PR comment.

**Acceptance Criteria**

- F1: Attempt promotion with SLO red or budget red → blocked with actionable comment.
- F2: Successful promotion includes signed SLO+cost summary artifact.
- F3: Rollback path verified after forced SLO regression.

**Artifacts**

- `.github/workflows/slo-cost-gate.yml`, `orchestrations/mc/gates/slo_cost.yaml`, signed summary artifact.

---

## Required CI Gates (added/confirmed this sprint)

- `k6-slo` (NLQ/ingest/export thresholds)
- `slo-cost-gate` (24h metrics + projection)
- `retry-budget-check`
- Existing: `lint`, `typecheck`, `unit`, `integration`, `e2e`, `promtest`, `determinism-repro`, `sbom`, `provenance-verify`, `secret-scan`, `dep-review`, `license-scan`

---

## Quickstart Commands

```bash
# Baseline & SLOs
make slo-baseline                 # run 48h collection (CI schedules)
make slo-dash                     # open SLO dashboard locally

# Hot path profiling
make nlq-top10                    # dumps slowest queries + plans
make nlq-profile query="..."      # explain/profile one query
make cache-report                 # cache hit/miss summary

# Load & chaos
make k6-nlq                       # NLQ perf profile
make k6-ingest                    # ingest perf profile
make chaos-brownout pct=10        # drop traffic + add latency
make chaos-kill-replica           # kill one service instance

# Cost controls
make cost-project env=staging     # monthly projection
make budget-test soft             # simulate soft-limit downgrade
make budget-test hard             # simulate hard-limit block

# Promotion
make slo-cost-gate                # compose PR summary + gate
make mc-promote                   # will block if gate red
make mc-rollback                  # verify rollback path
```
````

---

## Review & Demo Script (Sprint Close)

1. Show baseline vs. current SLO dashboard; headroom ≥30% on all tracked SLIs.
2. Live NLQ optimization: profile before/after; show index addition and p95 drop.
3. Run `k6-nlq` and `k6-ingest` with chaos enabled; watch retry-budget and error rates stay within bounds.
4. Trigger soft budget breach; observe model downgrade and successful completion; trigger hard breach → promotion gate blocks.
5. Attempt `mc-promote` with red SLO; gate blocks with signed summary; fix → green → promote; then execute `mc-rollback`.

---

## Risks & Mitigations

- **Over-tight timeouts → false negatives:** Use per-dependency budgets + hedged requests only where safe.
- **Cache staleness:** SWR + explicit invalidation on mutation; TTL tuned by entity volatility.
- **Autoscaling thrash:** Stabilize with cooldowns and request-rate based policies.

---

## Definition of Done (27E)

- SLOs achieved with ≥30% headroom in staging under target load.
- Cost per 1k NLQ reduced ≥20%; per-env budgets enforced with auto-throttle/downgrade.
- Chaos suite green; retry budgets respected; no data loss in drills.
- MC promotion wired to SLO/cost gate; rollback demonstrated.
- All artifacts, dashboards, and runbooks merged and referenced from `README.md`.

```

```

````md
# Summit / Maestro Conductor — Sprint 27F “Data Quality, Provenance UX & GA Enablement”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Make data trustworthy at first sight. Ship end-to-end provenance surfacing, entity-resolution quality gates, dataset versioning, and GA-ready packaging/docs so stakeholders can validate any graph fact in <10s and reproduce results exactly.

---

## North-Star Outcomes

1. **10-Second Trust Check:** Any node/edge shows source lineage, policy, and transform steps in ≤10s via UI/CLI.
2. **ER Quality Guard:** Automatic gates for entity resolution (precision/recall/F1) block promotion below thresholds.
3. **Versioned Datasets:** Immutable dataset IDs with diffs and rollbacks; queries bind to dataset version.
4. **Reproducible Exports:** Exports include manifest (schema, dataset, policy digest, model matrix) + signatures.
5. **GA Kit:** One-click docs/SDKs/runbooks published; release notes and upgrade guide complete.

---

## Tracks & Deliverables

### A) Provenance Surface & Explainability

**Tasks**

- Add `/provenance/{id}` API returning: source URIs, ingest job, transforms (with commit SHAs), policy bundle digest, data sensitivity tags.
- Graph UI “Info Panel” displays provenance timeline + “Copy Repro Command”.
- CLI `igctl prov show <node|edge>` prints a reproducible query + dataset pin.

**Acceptance Criteria**

- A1: UI loads provenance panel in <500ms (cached) and includes copy-ready `igctl` command.
- A2: API returns signed provenance envelope with cosign verification in client.
- A3: Broken/missing provenance surfaces “unverified” state and blocks export.

**Artifacts**

- `services/api/provenance/*`, `ui/components/ProvenancePanel.tsx`, `cli/igctl/commands/prov.ts`.

---

### B) Entity Resolution (ER) Quality Gates

**Tasks**

- Define labeled holdout sets per entity type; add metrics jobs producing precision/recall/F1.
- Introduce `ops/quality/er_thresholds.yaml`; wire `er-gate` CI job with per-type thresholds.
- Add confusion matrix and error buckets (merge-wrong, split-wrong, attribute-drift) to Grafana.

**Acceptance Criteria**

- B1: ER F1 ≥ target (e.g., 0.92 people, 0.95 orgs) on holdouts; gate fails if below.
- B2: PRs changing ER rules/models must attach a quality diff artifact.
- B3: Nightly job posts trend chart; regression >1.5σ pages Sec/Platform channel.

**Artifacts**

- `ops/quality/er_thresholds.yaml`, `tests/quality/er_*_holdout.jsonl`, `.github/workflows/er-gate.yml`, dashboards.

---

### C) Dataset Versioning, Diff, and Rollback

**Tasks**

- Implement immutable dataset IDs: `ds-YYYYMMDD.hhmmss-<digest>`.
- Add `igctl ds diff <old> <new>` (counts, entity types, changed attributes, ER deltas).
- Enforce query pinning: Gateway requires `x-dataset-id` or supplies `latest-stable` alias; promotion updates alias atomically.

**Acceptance Criteria**

- C1: Queries without pin in `staging|prod` are rejected (with remediation).
- C2: Dataset diffs render in UI and CLI; large diffs stream paginated.
- C3: `igctl ds rollback <id>` restores previous alias and invalidates caches safely.

**Artifacts**

- `services/gateway/src/dataset/pinning.ts`, `cli/igctl/commands/dataset.ts`, `ui/pages/DatasetDiff.tsx`, runbook.

---

### D) Reproducible Export Manifests

**Tasks**

- Export produces `MANIFEST.json` with: dataset id, query hash, policy digest, model matrix, SBOM refs, signatures.
- Add `igctl export verify <bundle>` to check signatures/provenance against trust policy.
- Provide CSV/Parquet/JSONL with consistent types & null semantics; embed schema version.

**Acceptance Criteria**

- D1: Tampered bundle fails `export verify` with clear reason.
- D2: Re-running export with same inputs yields identical hash.
- D3: Downstream load (sample Airflow/DBT) uses manifest to validate before ingest.

**Artifacts**

- `services/export/*`, `cli/igctl/commands/export.ts`, `security/policy/export_trust.yaml`, sample Airflow/DBT templates.

---

### E) GA Enablement: Docs, SDKs, and Upgrade Path

**Tasks**

- Generate SDKs (TS/Python/Java) from OpenAPI; include provenance & dataset APIs.
- Author `GA-README.md`, `UPGRADE_GUIDE.md` (27 → GA), `RUNBOOK-Data-Versioning.md`, `RUNBOOK-Provenance.md`.
- Build docs site with versioned docs; publish as an artifact + static site.

**Acceptance Criteria**

- E1: SDKs compile/install; quickstart demos run green locally and in CI.
- E2: Docs site builds reproducibly; link checks & examples tests pass.
- E3: Release notes enumerate breaking changes, migrations, and feature flags.

**Artifacts**

- `sdks/*`, `docs/**`, `.github/workflows/docs-build.yml`, `CHANGELOG.md`, `RELEASE_NOTES.md`, `GA-README.md`.

---

### F) Promotion & MC Gates (Quality + Provenance)

**Tasks**

- Extend MC gate to require: green ER gate, dataset pinned, export manifest verify, provenance chain intact.
- PR comment bot posts: dataset id, ER deltas, provenance digest, export verify status.

**Acceptance Criteria**

- F1: Promotion without dataset pin or with ER regression is blocked.
- F2: Gate artifact signed and attached to release; includes command to reproduce.
- F3: Rollback restores `latest-stable` alias and invalidates caches within 2 minutes.

**Artifacts**

- `orchestrations/mc/gates/quality_provenance.yaml`, `.github/workflows/quality-prov-gate.yml`.

---

## Required CI Gates (added this sprint)

- `quality-er-gate` (thresholds per entity type)
- `dataset-pin-check` (reject unpinned queries in non-dev)
- `export-manifest-verify`
- Existing: `lint`, `typecheck`, `unit`, `integration`, `e2e`, `promtest`, `k6-gate`, `determinism-repro`, `sbom`, `provenance-verify`, `secret-scan`, `dep-review`, `license-scan`, `slo-cost-gate`

---

## Quickstart Commands

```bash
# Provenance
igctl prov show node:123               # show lineage + copy repro
igctl prov verify node:123             # verify cosign signatures

# Entity Resolution quality
make er-holdout-eval                   # compute P/R/F1 and upload artifact
make er-gate                           # CI-style threshold gate

# Datasets
igctl ds create --notes "Sep batch"    # new immutable dataset
igctl ds diff ds-A ds-B                # summarize changes
igctl ds promote ds-B --alias latest-stable
igctl ds rollback ds-A                 # restore alias safely

# Exports
igctl export run --query q.cypher --dataset ds-B --out out.tgz
igctl export verify out.tgz            # trust-policy verification

# Docs / SDKs
make sdks                              # TS/Python/Java clients
make docs-build                        # static docs with checks
```
````

---

## Review & Demo Script (Sprint Close)

1. Open a node → show Provenance Panel; copy repro command → run CLI; verify signatures.
2. Run ER evaluation on holdouts; show dashboard & PR comment with deltas; demonstrate gate block then fix to green.
3. Create new dataset, run `ds diff`, promote alias, execute pinned query; attempt unpinned query → blocked with guidance.
4. Export bundle; tamper manifest → `export verify` fails; re-export → verify passes; load into sample pipeline.
5. Build docs + SDKs; run the TypeScript quickstart against staging; link checker passes.
6. MC promotion with quality/provenance gates green; force ER regression → block; rollback alias within 2 minutes.

---

## Risks & Mitigations

- **Large provenance payloads:** Cache & paginate; lazy-load transforms beyond N steps.
- **ER drift due to data mix changes:** Nightly drift alerts + shadow evaluation; feature flags for rule/model changeovers.
- **Alias mistakes:** Atomic updates with two-phase alias swap + health check, immediate cache bust.

---

## Definition of Done (27F)

- Provenance surfaced in UI/CLI/API with signed envelopes and repro commands.
- ER quality gates operational; dashboards + nightly trends live.
- Dataset versioning + aliasing enforced; queries pin to dataset in non-dev.
- Reproducible, signed export bundles with manifest verification.
- GA kit (SDKs, docs, runbooks, release notes) published and validated.

```

```

````md
# Summit / Maestro Conductor — Sprint 27G “Tri-Pane UX (Graph • Timeline • Map), Search, and Error-Proofing”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Ship a fast, accessible, and trustworthy UI: a tri-pane Graph/Timeline/Map workspace with global search, provenance overlays, and bulletproof error states. Reduce cognitive load, make provenance discoverable in <10s, and guarantee A11y + perf budgets.

---

## North-Star Outcomes

1. **Tri-Pane E2E:** Users pivot entities across Graph⇄Timeline⇄Map with <150 ms pane-switch latency and synchronized selection.
2. **Find Anything:** Global search (entity, attribute, query) returns ranked results in <400 ms p95 with keyboard-first flows.
3. **Trust at a Glance:** Provenance badges + quick-peek panel everywhere an entity appears (hover/cmd-k), visible in ≤300 ms.
4. **Error-Proof UX:** Standardized error, empty, and loading states; zero unhandled promise rejections; recoverable flows for all fetches.
5. **A11y + Perf:** WCAG 2.2 AA across core screens; Lighthouse ≥ 95 (PWA on/disabled as configured); input latency ≤ 100 ms p95.

---

## Tracks & Deliverables

### A) Tri-Pane Workspace (Graph/Timeline/Map)

**Tasks**

- Implement `Workpane` shell with resizable panes, snap presets (1-1-1, 2-1-1, 1-2-1), and persisted layout (per user/project).
- Selection bus (`/ui/state/selectionBus.ts`): single source of truth for active entity, time window, and geo focus.
- Graph pane: client-side level-of-detail (LOD) + edge bundling at scale; highlight policy-restricted fields with lock glyph.
- Timeline pane: virtualized intervals; zoom to selection; anomaly markers and ER change ticks.
- Map pane: tile/canvas hybrid; cluster at zoom<8; heat overlay; draw bounding box → filters all panes.

**Acceptance Criteria**

- A1: Selecting an entity in any pane syncs the other two in ≤150 ms.
- A2: Layout persists across reloads; “Reset to Default” restores 1-1-1 with saved presets.
- A3: 50k-node synthetic graph demo: p95 pan/zoom ≤ 16 ms frame budget; no layout thrash.

**Artifacts**

- `ui/app/Workpane/*`, `ui/state/selectionBus.ts`, `ui/panes/{Graph,Timeline,Map}/*`, `ui/styles/tokens.json`.

---

### B) Global Search (Cmd/Ctrl-K)

**Tasks**

- Unified `/search` endpoint: entities, attributes, saved queries, datasets; BM25 + typo tolerance + purpose filtering.
- Client search command palette with keyboard-first UX, recency re-rank, and scoped search (`@dataset:`, `type:org`, `is:restricted`).
- Result preview cards show provenance chip + “copy repro” button.

**Acceptance Criteria**

- B1: p95 server response < 250 ms; end-to-end (keystroke→results) < 400 ms p95 on staging.
- B2: Accessible listbox & shortcuts; screen-reader announces counts and scopes.
- B3: Security: restricted items hidden unless policy allows; audited “search-viewed” events.

**Artifacts**

- `services/api/search/*`, `ui/components/CommandK/*`, `ui/lib/search/filters.ts`.

---

### C) Provenance Everywhere (Quick-Peek)

**Tasks**

- Hover/Focus quick-peek with minimal payload: source count, last ingest job, policy digest; “Expand” opens full Provenance Panel (from 27F).
- Inline badges: `verified`/`unverified`/`redacted` with tooltips and keyboard focus states.
- Contextual actions: “Copy Repro”, “Open in Dataset Diff”, “File an Issue with Evidence”.

**Acceptance Criteria**

- C1: Quick-peek loads ≤300 ms p95 with cached envelope; badge reflects real verification state.
- C2: Unverified toggles export button to disabled with explain-why popover.
- C3: Analytics: provenance-open events logged with policy_version hash.

**Artifacts**

- `ui/components/ProvenanceBadge.tsx`, `ui/components/ProvenancePeek.tsx`, analytics events schema.

---

### D) Error/Empty/Loading States & Retry Patterns

**Tasks**

- Standard components: `<ErrorView kind=…/>`, `<EmptyView reason=…/>`, `<LoadingSkeleton/>`; adopt across panes and lists.
- Idempotent retries with backoff/jitter; abort controllers for stale requests; offline/slow-network banners.
- Global boundary catches any unhandled promise rejection; route-level boundaries per pane.

**Acceptance Criteria**

- D1: Zero unhandled promise rejections across navigation smoke tests.
- D2: Network chaos test (±10% drop, +300 ms latency) keeps UI responsive; banners show; retries bounded.
- D3: All list/detail views show meaningful empty states with next-action CTAs.

**Artifacts**

- `ui/components/{ErrorView,EmptyView,LoadingSkeleton}.tsx`, `ui/lib/net/retry.ts`, chaos test suite.

---

### E) Accessibility & Design System Hardening

**Tasks**

- Expand tokens (spacing/typography/contrast/motion) with prefers-reduced-motion; focus rings and skip-links.
- ARIA roles & labeling for graph canvas, timeline list, and map interactions; keyboard panning/zooming.
- Color-safe ramps for provenance and policy states; dark/light parity.

**Acceptance Criteria**

- E1: Axe CI: zero serious/critical violations; manual screen-reader pass on tri-pane.
- E2: WCAG 2.2 AA verified for focus, contrast, target size, and shortcuts.
- E3: Lighthouse ≥95 Perf/Best-Practices/SEO; Accessibility ≥ 95 on tri-pane route.

**Artifacts**

- `ui/styles/tokens.json`, `ui/a11y/tests/*.spec.ts`, Lighthouse report artifact.

---

### F) Maestro UI (Operability Panel)

**Tasks**

- “Operations Drawer” in the workspace: shows SLO tiles (NLQ/ingest/export p95), cost budget status, gate status (quality/provenance/SLO), and last promote/rollback with digests.
- One-click: “Promote RC”, “Rollback”, “Open Runbook”. Respect policy; greyed if user lacks rights.

**Acceptance Criteria**

- F1: Live tiles update ≤10 s latency; click opens detailed Grafana or runbooks.
- F2: Promote/rollback actions require step-up; audit event logged with reason.
- F3: Gate status mirrors MC gates from 27E/27F; mismatch test fails UI e2e.

**Artifacts**

- `ui/components/OperationsDrawer.tsx`, `ui/hooks/useGates.ts`, e2e specs.

---

## CI Gates (UI/UX)

- `ui-typecheck`, `ui-lint`, `ui-unit`
- `ui-a11y-axe` (no serious/critical)
- `ui-lighthouse` (≥95/95/95/95 thresholds)
- `ui-e2e-tri-pane` (sync, selection, error states)
- `contract-search` (API schema pact tests)
- Existing platform gates remain in effect.

---

## Quickstart (Dev)

```bash
# Install + run
pnpm i && pnpm dev            # or make ui-dev
pnpm test:ui                  # unit + axe
pnpm e2e:tri-pane             # playwright tri-pane suite
pnpm lh:tri-pane              # lighthouse CI on /workpane

# Feature flags (env)
UI_TRI_PANE=1 UI_OPS_DRAWER=1 UI_PROV_QUICKPEEK=1 pnpm dev
```
````

---

## Review & Demo Script (Sprint Close)

1. **Tri-Pane Flow:** Search (Cmd-K) → select entity → panes sync; adjust time window and map bbox; verify 150 ms sync.
2. **Provenance Peek:** Hover badge → quick-peek in <300 ms → copy repro; open full panel; export disabled when unverified.
3. **Resilience:** Toggle slow-network/chaos; observe banners, skeletons, and successful retries without jank.
4. **A11y Tour:** Keyboard-only navigation of tri-pane; screen-reader announces context; show axe + Lighthouse reports.
5. **Ops Drawer:** Show live SLO/cost/gate tiles; attempt promote without step-up (blocked) → step-up → promote; audit log event appears.

---

## Risks & Mitigations

- **Canvas A11y complexity:** Provide parallel DOM representations and descriptive regions; document known limitations.
- **Perf regressions with large graphs:** LOD + culling; workerized layouts; memoized layers.
- **Search leakage:** Purpose-scoped search + OPA checks; server-side audits for sensitive result types.

---

## Definition of Done (27G)

- Tri-pane workspace shippable: synchronized selection, persisted layouts, and smooth interactions at scale.
- Global search keyboard-first and fast; provenance badges + quick-peek pervasive.
- Standardized error/empty/loading states; zero unhandled promise rejections in e2e.
- WCAG 2.2 AA across core flows; Lighthouse ≥95; dark/light parity.
- Maestro Operations Drawer live with gate status and step-up-guarded actions.

```

```

````md
# Summit / Maestro Conductor — Sprint 27H “Enterprise Readiness (SSO/SCIM, Tenancy, BYOK, DR, Residency & Billing)”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Ship the core enterprise features customers expect on Day-0: SSO/SAML & OIDC, SCIM user/group provisioning, hard tenant isolation with automated proofs, customer-managed keys (BYOK/KMS), disaster recovery (RPO/RTO backed by drills), data residency controls, and usage/billing with quotas & alerts.

---

## North-Star Outcomes

1. **SSO & SCIM Live:** SAML 2.0 + OIDC login with just-in-time (JIT) roles; SCIM 2.0 creates/updates/deactivates users & groups reliably.
2. **Provable Isolation:** Every API & data path is tenant-scoped by construction; isolation tests run in CI and produce machine-readable proofs.
3. **BYOK Everywhere:** Each tenant can bring a KMS key (AWS/GCP/Azure); envelope encryption enforced at-rest; rotation & revocation tested.
4. **Resilient by Drill:** Documented RPO ≤ 5m (hot paths) / 30m (bulk) and RTO ≤ 30m; DR run verified end-to-end on staging.
5. **Residency Guaranteed:** Datasets & derived artifacts pinned to chosen region; policy blocks cross-region egress without override.
6. **Transparent Usage:** Accurate usage metering → budgets/alerts → invoices; promotion gate blocks when quota/budget hard-red.

---

## Tracks & Deliverables

### A) SSO (SAML/OIDC) + JIT Roles

**Tasks**

- Add identity providers: SAML (IdP-metadata upload) and OIDC (well-known discovery); support multiple IdPs per tenant.
- Map IdP claims → roles & purpose scopes (OPA ABAC sync); enforce step-up on sensitive groups.
- JIT provisioning (on first login) with default role + policy group.

**Acceptance Criteria**

- A1: SAML & OIDC logins succeed on staging; logout/invalidate sessions on IdP side.
- A2: Role claim changes reflected on next login; privilege drop effective immediately.
- A3: Audit events include `idp`, `roles_from_claims`, and policy version.

**Artifacts**

- `services/auth/{saml,oidc}/*`, `RUNBOOK-SSO.md`, admin UI for IdP config.

---

### B) SCIM 2.0 Provisioning

**Tasks**

- Implement `/scim/v2/Users` & `/Groups` with filtering, pagination, soft-delete → deprovision.
- Group→role binding configurable per tenant; conflict resolution & idempotency.
- Backfill job to reconcile directory with local state.

**Acceptance Criteria**

- B1: Create/Update/Deactivate via SCIM reflected in <60s; deactivated users lose access instantly.
- B2: Race conditions (SCIM vs. local edits) resolved deterministically.
- B3: SCIM conformance tests green; audit trails complete.

**Artifacts**

- `services/scim/*`, `tests/scim/conformance.spec.ts`, `RUNBOOK-SCIM.md`.

---

### C) Tenant Isolation & Proofs

**Tasks**

- Enforce tenant context propagation (JWT → request ctx → DB/graph/search clients).
- Add data-level guards: schema tenant_id + row-level security; graph labels by tenant.
- Build isolation test harness that attempts cross-tenant reads/writes/side-channels.

**Acceptance Criteria**

- C1: Isolation harness finds **0** cross-tenant leaks (API, logs, metrics, caches).
- C2: CI job `tenant-isolation-proof` emits signed report (hash-chain + failing repro if any).
- C3: Observability: metrics tagged with tenant but aggregated safely (no PII).

**Artifacts**

- `security/isolation/harness/*`, `tests/isolation/*.spec.ts`, `ops/reports/tenant_isolation_proof.json`.

---

### D) BYOK / Customer-Managed Keys (CMK)

**Tasks**

- Per-tenant KEK references external KMS (AWS KMS, GCP KMS, Azure Key Vault); local DEKs rotated & stored as wrapped blobs.
- Key lifecycle: create, rotate, revoke; “break-glass” and escrow docs.
- On revoke, render data inert (deny decrypt) with clear operator guidance.

**Acceptance Criteria**

- D1: Encrypt/Decrypt covered for blobs, search indices, graph snapshots, and exports.
- D2: Rotation drill completes with zero data loss; old DEKs quarantined.
- D3: Revocation test blocks reads within 60s; audit captures scope & reason.

**Artifacts**

- `crypto/byok/*`, `RUNBOOK-BYOK.md`, `ops/reports/key_rotation_YYYYMMDD.md`.

---

### E) Backup, Restore & DR (RPO/RTO)

**Tasks**

- Continuous backups (WAL/tx logs) for DB/graph/object storage; snapshot & point-in-time restore.
- DR plan: region-to-region failover, infra as code, data bootstrap, DNS cutover; quarterly drill script.
- Synthetics validating “system healthy” during failover.

**Acceptance Criteria**

- E1: Staging DR drill meets RPO/RTO targets (≤5m/≤30m) with signed report.
- E2: Restore verification script validates checksums & dataset IDs.
- E3: k6 smoke passes on DR endpoint before primary resumes.

**Artifacts**

- `RUNBOOK-DR.md`, `tools/dr/drill.sh`, `ops/reports/drill_YYYYMMDD.md`.

---

### F) Data Residency & Egress Controls

**Tasks**

- Residency policy: dataset creation requires region; derived artifacts inherit region.
- Egress guardrails: deny cross-region compute/storage unless `purpose=transfer` + approval.
- Residency dashboard per tenant.

**Acceptance Criteria**

- F1: Attempt to run cross-region job without approval → blocked with explain().
- F2: Exports carry residency tag; load to other region denied by default.
- F3: Dashboard shows residency posture & exceptions.

**Artifacts**

- `security/policy/residency.rego`, UI “Residency” card, tests & fixtures.

---

### G) Usage Metering, Quotas & Billing

**Tasks**

- Meter NLQ, ingest, storage, export, and model tokens; per-tenant counters with cardinality controls.
- Budgets: soft (degrade) / hard (block) with PR comments and Ops alerts.
- Invoice generator (summary CSV/JSON + PDF) and webhook for external billing.

**Acceptance Criteria**

- G1: Meter deltas match golden fixtures within 1%; idempotent replay safe.
- G2: Hard-limit breach blocks with clear error; soft-limit triggers downgrade.
- G3: Invoices contain itemized usage with provenance (period, digest, signer).

**Artifacts**

- `services/metering/*`, `tools/billing/invoice.*`, `config/quotas.yaml`, `RUNBOOK-Billing.md`.

---

## CI Gates (added/confirmed this sprint)

- `sso-smoke` (SAML/OIDC flows)
- `scim-conformance`
- `tenant-isolation-proof` (signed)
- `byok-crypto-tests` + `key-rotation-sim`
- `dr-drill-sim` (non-destructive)
- `residency-policy-tests`
- `metering-golden` (accuracy ±1%)
- Existing platform gates remain enforced.

---

## Admin & Dev Quickstart

```bash
# Configure SSO
igctl admin idp add --tenant TEN --saml metadata.xml
igctl admin idp add --tenant TEN --oidc https://idp/.well-known/openid-configuration

# SCIM
igctl admin scim token create --tenant TEN
curl -H "Authorization: Bearer <token>" https://.../scim/v2/Users

# Tenant isolation proof
make isolation-proof

# BYOK
igctl admin byok link --tenant TEN --kms arn:aws:kms:... --region us-west-2
igctl admin byok rotate --tenant TEN

# DR
make dr-drill           # simulates failover + smoke
make restore-verify     # checksum + dataset-id checks

# Residency
igctl ds create --region eu-central-1
igctl job run --dataset ds-... --region eu-central-1  # cross-region will block

# Quotas/Billing
make metering-golden
igctl billing invoice --tenant TEN --period 2025-09
```
````

---

## Review & Demo (Sprint Close)

1. **Login & Provisioning:** SAML login → JIT role mapping; SCIM push adds group & user; access reflected within 60s.
2. **Isolation Proof:** Run `make isolation-proof`; show signed zero-leak report.
3. **BYOK Rotation/Revocation:** Rotate keys live; read continues; revoke → reads blocked; audit shows scope/reason.
4. **DR Drill:** Trigger staging DR; meet RPO/RTO; k6 smoke passes on DR region; switch back cleanly.
5. **Residency Gate:** Attempt cross-region export → deny with explain(); approved run passes; dashboard updates.
6. **Quotas & Billing:** Soft breach → degrade; hard breach → block; generate invoice with signed digest.

---

## Risks & Mitigations

- **IdP Misconfig:** Safe preview mode + health checks; rollback to local auth for admins only.
- **Key Mismanagement:** Dual-control for revoke; escrow & documented recovery; staging drills.
- **Isolation Regressions:** Harness runs on every PR; fail-closed with repro.
- **Metering Drift:** Golden fixtures + replay tests; periodic reconciliation job.

---

## Definition of Done (27H)

- SSO/OIDC and SCIM live with audit & JIT role mapping.
- Tenant isolation proven in CI with signed report and zero leaks.
- BYOK implemented with rotation & revocation drills; all at-rest data under KEK/DEK.
- DR plan executed; RPO/RTO met & documented; restore verification automated.
- Residency controls enforced; exports and jobs region-pinned with explainable denials.
- Accurate metering, quotas, and invoice artifacts delivered; promotion blocks on hard-red quota/budget.

```

```

````md
# Summit / Maestro Conductor — Sprint 27I “Compliance, Risk & Trust Center (SOC 2, GDPR/CCPA, IR, VM, Vendor)”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Achieve audit-ready posture for GA: SOC 2 Type I readiness package, privacy program (GDPR/CCPA) with DPIA/DPA templates, incident response & vulnerability management operationalized, access reviews automated, vendor risk and change-management codified, and a public Trust Center with live controls evidence.

---

## North-Star Outcomes

1. **SOC 2 Type I Ready:** Controls defined, implemented, evidenced, and mapped; “point-in-time” readiness report and auditor handoff bundle complete.
2. **Privacy Operational:** DPIA & DPA templates live; data inventory, ROPA, retention + deletion SLOs enforced; user data requests runnable E2E.
3. **IR & VM Real:** Incident Response (IR) on-call + runbook executed in a tabletop; Vulnerability Management (VM) SLAs enforced with policy and CI gates.
4. **Least Privilege Proven:** Quarterly access review automated; break-glass paths tested; logs tamper-evident and queryable.
5. **Vendor & Change Mgmt:** Third-party risk assessments and contract clauses standardized; change-management process enforced in CI/CD.
6. **Trust Center Live:** Public site shows policies, uptime, SLOs, SBOMs, and attestation artifacts with automatic refresh.

---

## Tracks & Deliverables

### A) SOC 2 Type I Control Set & Evidence

**Tasks**

- Define control catalog (security, availability, confidentiality) mapped to Summit systems; create `controls.yaml` with owners, test steps, evidence sources.
- Evidence collectors: CI artifacts (provenance/SBOM), infra state (IaC drift), alert tests, access reviews, backup/DR reports.
- Generate readiness bundle: control matrix, policies, procedures, screenshots, immutable hashes.

**Acceptance Criteria**

- A1: `ops/compliance/controls.yaml` complete with owners and evidence pointers.
- A2: `make soc2-bundle` emits signed archive with control matrix + evidence.
- A3: Auditor handoff checklist satisfied; 0 open P0 control gaps.

**Artifacts**

- `ops/compliance/{controls.yaml,control_matrix.xlsx}`, `tools/compliance/collect_evidence.ts`, `SOC2-READINESS.md`.

---

### B) Privacy Program (GDPR/CCPA) — DPIA, DPA, ROPA & Deletion SLOs

**Tasks**

- Data inventory & Records of Processing Activities (ROPA) generated from schema tags and pipeline metadata.
- DPIA template & workflow for high-risk processing; standard DPA (processor) template for customers.
- Implement deletion controller: hard/soft delete flows, TTLs, backups purge, and attestations; DSAR (access/erase) CLI.

**Acceptance Criteria**

- B1: `make ropa` outputs signed ROPA report; DPIA runbook exercised on a sample feature.
- B2: DSAR flow completes within target SLO (export ≤ 7d, erasure ≤ 30d) in staging; artifacts logged.
- B3: Deletion propagates to backups/replicas; `deletion-attest.json` generated.

**Artifacts**

- `privacy/ROPA.json`, `privacy/DPIA_TEMPLATE.md`, `legal/templates/DPA.md`, `tools/privacy/dsar.ts`, `RUNBOOK-Deletion.md`.

---

### C) Incident Response (IR) — Org, Runbook, Tabletop

**Tasks**

- Define roles (Incident Commander, Comms, Scribe); create severity matrix (P0–P5) and notification tree.
- Tabletop exercise with scenario: credential leak + policy bypass attempt; produce After Action Report (AAR).
- Status page + comms templates; breach notification thresholds documented.

**Acceptance Criteria**

- C1: `RUNBOOK-IR.md` merged; paging via PagerDuty/ops tool verified.
- C2: Tabletop executed; AAR with action items and owners committed.
- C3: Status page dry-run published; comms templates pass legal review.

**Artifacts**

- `RUNBOOK-IR.md`, `ops/ir/severity_matrix.yaml`, `ops/reports/AAR_YYYYMMDD.md`, `status/`.

---

### D) Vulnerability Management (VM) — SLAs & CI Gates

**Tasks**

- Define VM SLAs (Critical: 7d, High: 14d, Medium: 30d) and exceptions workflow.
- Pipeline gates for osv-scan/trivy/grype + dependency review; nightly drift report.
- Asset inventory (services/images) with CVE coverage and owner mapping.

**Acceptance Criteria**

- D1: CI fails on new Critical/High vulns without approved exception.
- D2: `ops/reports/vuln_sla_dashboard.json` shows 0 overdue High/Critical.
- D3: Exceptions carry expiry and justification; auto-remind before expiry.

**Artifacts**

- `.github/workflows/vuln-sla.yml`, `security/vm/sla.yaml`, `ops/reports/vuln_coverage.csv`.

---

### E) Access Governance — Reviews, Break-Glass & Audit

**Tasks**

- Quarterly access review automation: pull roles from IdP/SCIM and app DB; diff vs. policy; file review tasks; capture attestations.
- Break-glass accounts: separate realm, hardware-key enforced, time-boxed; evidence logging.
- Tamper-evident audit queries: canned searches for privilege changes and data exports.

**Acceptance Criteria**

- E1: `make access-review` generates review packets; sign-off recorded per team.
- E2: Break-glass test proves time-boxed elevation + automatic reversion.
- E3: Audit queries produce expected events with hash-chain proof.

**Artifacts**

- `ops/access/review_playbook.md`, `tools/access/review.ts`, `security/break-glass.md`, `tools/audit/queries.sql`.

---

### F) Vendor Risk & Change Management

**Tasks**

- Standardize vendor intake (CAIQ-lite questionnaire), data flows, and DPA requirements; tier vendors by risk.
- Change-management: require risk note + rollback in PRs that modify infra, auth, or data flows; CAB lightweight checklist.
- Vendor registry with posture (SOC2/ISO) and renewal reminders.

**Acceptance Criteria**

- F1: New vendor onboarding runs through registry + CAIQ with approvals.
- F2: CI blocks infra/auth/data PRs lacking change-risk/rollback section.
- F3: Renewal reminders created ≥30 days before expiry.

**Artifacts**

- `ops/vendor/registry.csv`, `ops/vendor/caiq_lite.md`, `.github/pull_request_template.md` (risk/rollback), `CHANGE-MGMT.md`.

---

### G) Trust Center Site (Public)

**Tasks**

- Build static Trust Center with: policies, uptime/SLO snapshots, SBOM links, SOC2 readiness summary, DR posture, data residency, and security contact.
- Auto-publish via CI on evidence refresh; include hash digests and timestamps.
- Provide private customer portal link for detailed evidence (NDA).

**Acceptance Criteria**

- G1: `trust-center/` builds reproducibly; links validated; no PII leaks.
- G2: Evidence pages auto-update on new artifacts (SBOM, SLO, drills).
- G3: Security.txt and contact flow tested; response SLA documented.

**Artifacts**

- `trust-center/**`, `.github/workflows/trust-center-build.yml`, `SECURITY.txt`, `RESPONSE-SLA.md`.

---

## CI Gates (added/confirmed this sprint)

- `soc2-bundle` (evidence completeness & signatures)
- `privacy-dpia-required` (for flagged features)
- `dsar-e2e` (staging dry-run)
- `ir-tabletop-artifact` (AAR present with owners)
- `vuln-sla` (no overdue High/Critical)
- `access-review` (attestations up to date)
- `change-mgmt-check` (risk/rollback present)
- `trust-center-validate` (links, hashes, no PII)

---

## Quickstart Commands

```bash
# SOC 2 readiness
make soc2-bundle

# Privacy
make ropa
igctl privacy dsar --tenant TEN --type export --user USER_ID
igctl privacy erase --tenant TEN --user USER_ID

# IR & VM
make ir-tabletop
make vuln-sla

# Access governance
make access-review
make break-glass-drill

# Vendor & change mgmt
make vendor-intake name="Acme" tier=high
make change-check

# Trust Center
make trust-center-build && make trust-center-publish
```
````

---

## Review & Demo Script (Sprint Close)

1. **SOC2 Bundle:** Show control matrix, evidence hashes, and signed archive; auditor checklist green.
2. **Privacy Ops:** Run a DSAR export and erase in staging; show deletion attestation and ROPA entries.
3. **IR Tabletop:** Present severity matrix; walk through scenario; highlight AAR actions created.
4. **VM SLAs:** Trigger a synthetic High CVE; CI blocks; approve exception with expiry; unblock after patch.
5. **Access Review:** Generate review packets; demonstrate break-glass elevation and auto-revert logs.
6. **Vendor & Change Mgmt:** Onboard a mock vendor; open infra PR without risk/rollback (blocked) → fix → merge.
7. **Trust Center:** Publish site; verify SBOM & SLO links; confirm security.txt and contact flow.

---

## Risks & Mitigations

- **Evidence Drift:** Nightly collectors + hash digests; alerts on missing proofs.
- **Deletion in Backups:** Purge indices + cryptographic erasure; attestations recorded.
- **Process Fatigue:** Automate forms, pre-fill evidence, and keep checklists short; quarterly reviews scheduled.

---

## Definition of Done (27I)

- SOC 2 Type I readiness package complete with signed evidence; 0 P0 gaps.
- GDPR/CCPA operational: DSAR & deletion runbooks exercised with attestations.
- IR and VM programs active with CI gates; no overdue High/Critical findings.
- Access reviews automated; break-glass tested; audit queries operational.
- Vendor risk and change-management enforced in pipelines.
- Trust Center live with auto-refreshed evidence and no PII leakage.

```

```

````md
# Summit / Maestro Conductor — Sprint 27J “Connectors, Pipelines & Knowledge Fusion”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Light up a robust ingest layer with **policy-aware connectors**, **streaming/batch pipelines**, and **fusion enrichments** that land clean, provenance-rich entities into the graph at scale. Ship first-class connectors (files/APIs/feeds), schema mapping, normalization, de-dup/ER hooks, and backfill/redo mechanics — all observable, reproducible, and gated by quality.

---

## North-Star Outcomes

1. **10 Connectors Online:** Priority sources flowing end-to-end (pull/stream), each with provenance, schema mapping, retry/backoff, and DLP.
2. **Schema Registry & Mapping:** Canonical model + per-connector mappings with versioning; breaking change detection in CI.
3. **Normalization & Enrichment:** Names/addresses/geos/dates standardized; geocode + NER + link-hints added with explainable transforms.
4. **Quality & Fusion Gates:** Duplicate suppression + ER pre-hints drop dup-rate ≥ 60% on hot sources; fusion accuracy meets thresholds.
5. **Operate at Scale:** Backfill, catch-up, and re-ingest (idempotent) proven on ≥ 500k docs/events with SLOs and dashboards.

---

## Tracks & Deliverables

### A) Connector Framework & Priority Sources

**Tasks**

- Build `connector-sdk` (retry/jitter, metrics, heartbeat, DLP hooks, provenance envelope).
- Ship priority connectors (v1):
  - **HTTP/Feed:** JSON/CSV, Atom/RSS, webhook listener.
  - **STIX/TAXII & MISP:** Collections/push-pull, incremental tokens.
  - **Docs:** PDF/HTML/Text loader with content hashing, chunking, OCR toggle.
  - **Cloud Storage bucket** (prefix filters, event notifications).
- Per-connector **HEALTH** endpoint + backoff policy; idempotent checkpoints.

**Acceptance Criteria**

- A1: 10 connectors ingest to staging with non-null metrics and health.
- A2: Connector crash/restart resumes from last checkpoint (≤1 min replay).
- A3: DLP pre-filters exercised; redacted fields never hit raw sink.

**Artifacts**

- `ingest/connectors/*`, `sdk/connector/*`, `RUNBOOK-Connector.md`, sample configs in `ingest/config/*.yaml`.

---

### B) Schema Registry, Mapping & Contracts

**Tasks**

- Define canonical types (Person, Org, Location, Event, Asset, Document, Relationship) in `schema/`.
- Create **Mapping DSL** (YAML) for field → canonical with transforms (trim, normalize, parse, regex, unit/locale fixes).
- **Contract tests**: connector emits sample → mapping → canonical → pact verified.

**Acceptance Criteria**

- B1: `schema/*.yml` versioned with semver and changelog; breaking changes block until all mappings updated.
- B2: Each connector has a mapping file and passes pact tests.
- B3: CI renders mapping docs (before/after examples).

**Artifacts**

- `schema/canonical/*.yml`, `schema/mappings/*`, `.github/workflows/schema-contract.yml`, `docs/schema-mapping.md`.

---

### C) Normalization, Enrichment & Fusion Hints

**Tasks**

- Implement standardizers: names (Unicode/diacritics), addresses (libpostal-like), dates (ISO 8601), phones/emails/URLs.
- Enrichers: geocoding, language detect, NER (people/orgs/places), simple link-hints (same-as by keys/domains).
- Output **fusion hints** (candidate keys, confidence) for ER to consume (ties into 27F ER gates).

**Acceptance Criteria**

- C1: Normalization coverage ≥ 95% for target fields (report per connector).
- C2: Enricher latency p95 < 200 ms per doc (batchable); cached results hit-rate ≥ 50%.
- C3: Fusion hint pipeline improves pre-ER dup suppression ≥ 60% on two hot sources.

**Artifacts**

- `enrich/*`, `normalize/*`, `tests/normalize/*.spec.ts`, `ops/reports/normalization_coverage.md`.

---

### D) Pipeline Orchestration (Batch + Stream) & Repro

**Tasks**

- DAGs under `orchestrations/ingest/*.yaml` (extract→normalize→enrich→map→land→emit).
- **Backfill/Redo** primitives: run by date/key range, resume tokens, idempotent sinks (exactly-once via content-hash keys).
- **Cold→Hot Path** switch: backfills use batch compute; streaming uses workers with autoscale.

**Acceptance Criteria**

- D1: Backfill 500k mixed docs in ≤ 8h on staging infra; correctness spot-checked with hashes.
- D2: Redo (schema v+1) reprocesses a slice and produces identical outputs except expected mapped deltas.
- D3: Stream catch-up after 30-min outage completes ≤ 20 min without data loss.

**Artifacts**

- `orchestrations/ingest/*.yaml`, `Makefile` targets (`ingest-backfill`, `ingest-redo`, `ingest-catchup`), `RUNBOOK-Ingest-Backfill.md`.

---

### E) Observability: Lineage, Metrics & Cost

**Tasks**

- Expose per-connector SLIs: lag, throughput, error rate, transform latency, cost/unit (tokens/CPU/GB).
- Grafana “Ingest & Fusion” dashboards; golden alert tests.
- Lineage view: doc → transforms → entity/edge ids (+ mapping version, policy digest).

**Acceptance Criteria**

- E1: Dashboards show non-null series for all connectors; golden prom tests pass.
- E2: Cost per 1k docs reported with top contributors; k6 smoke for ingest path green.
- E3: Lineage deep-link from any graph node opens source doc trail in ≤ 1s (cached).

**Artifacts**

- `ops/observability/dashboards/ingest.json`, `ops/alerts/ingest.rules.yml`, lineage API under `services/api/lineage/*`.

---

### F) Policy, DLP & Residency in Pipelines

**Tasks**

- Policy hooks during mapping/enrichment enforce field-level allow/deny/redact; residency tag carried from source → artifact.
- **Quarantine** queue for policy violations with moderator UI and explain().
- Export/forward rules block egress if residency or sensitivity violated.

**Acceptance Criteria**

- F1: Attempt to ingest restricted fields without purpose → quarantined with explain(); moderator path releases or drops.
- F2: Residency tags preserved across all derived artifacts; failing case reproduced in CI and fixed.
- F3: No PII in raw logs/metrics; synthetic PII test fails closed until redaction fixed.

**Artifacts**

- `security/policy/ingest.rego`, `ui/admin/QuarantineQueue.tsx`, tests & fixtures.

---

### G) Quality & Fusion Gates (ER-Aware)

**Tasks**

- Per-connector goldens (sample → canonical) with checksums; drift detector.
- Pre-ER duplicate detection (blocking keys, fuzzy bands) with confidence thresholds; feed ER gate from 27F.
- A/B compare fusion on holdouts; publish precision/recall deltas.

**Acceptance Criteria**

- G1: Connector goldens stable; drift alerts created on schema/source changes.
- G2: Pre-ER dup suppression ≥ 60% on two hot sources; false-merge rate ≤ 1%.
- G3: Fusion quality report attached to PRs touching mappings/enrichers.

**Artifacts**

- `tests/goldens/connectors/*`, `tools/fusion/report.py`, `.github/workflows/fusion-quality.yml`.

---

## CI Gates (added/confirmed this sprint)

- `schema-contract` (mapping pact tests + semver guard)
- `connector-goldens` (sample→canonical checksums)
- `ingest-promtest` (golden alert rules)
- `ingest-e2e` (backfill/redo/catch-up smoke)
- `fusion-quality` (dup-suppression & false-merge thresholds)
- Existing platform/security/provenance gates remain enforced.

---

## Quickstart Commands

```bash
# Run a connector locally
make connector-run name=rss         # or stix, misp, http, docs, bucket
make connector-health name=rss

# Pipeline orchestration
make ingest-backfill src=rss from=2025-08-01 to=2025-09-15
make ingest-catchup src=stix window=30m
make ingest-redo schema=v1.3 sample=10000

# Quality & mapping
make schema-contract
make connector-goldens
make fusion-quality src=rss

# Observability & lineage
make ingest-dash
curl :8080/lineage/entity?id=node:123  # provenance trail
```
````

---

## Review & Demo Script (Sprint Close)

1. **Live Flow:** Start 3 connectors → watch dashboards populate; open lineage on a new node → show transforms & mapping version.
2. **Backfill/Redo:** Run backfill (date-bounded) and redo (schema v+1) → verify identical hashes except mapped deltas.
3. **Normalization & Enrichment:** Show before/after examples; latency and cache hit-rate panels; A/B geocode/NER improvements.
4. **Quality & Fusion:** Present dup-suppression metrics and holdout precision/recall; demonstrate gate blocking on regression.
5. **Policy/DLP/Residency:** Attempt restricted field ingest → quarantine UI with explain(); approve with purpose → proceed; export blocked cross-region until approved.
6. **Resilience:** Kill a connector; resume from checkpoint; simulate 30-min outage → catch-up within target.

---

## Risks & Mitigations

- **Source Schema Drift:** Contract tests + drift alerts; mapping semver and auto-PR to update.
- **Enricher Latency Spikes:** Batch + cache + circuit breaker; degrade to “normalize-only” on soft budget breach.
- **Duplicate/False Merge:** Conservative thresholds, shadow-mode fusion, and manual review on sensitive entity classes.

---

## Definition of Done (27J)

- Ten priority connectors live with health, metrics, and DLP; end-to-end to graph.
- Canonical schema + mapping DSL in place with contract tests and docs.
- Normalization/enrichment/fusion hints operational; pre-ER dup suppression ≥ 60% on hot sources.
- Backfill, catch-up, and redo flows proven at ≥ 500k docs/events with SLOs.
- Lineage UI/API shows source→transform→entity trail; policy/residency enforced across the pipeline.

```

```

````md
# Summit / Maestro Conductor — Sprint 27K “GA Release Engineering, Packaging & Launch Ops”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Cut our **first GA release** with bulletproof packaging (Helm/Terraform/OCI bundles), crisp semantic versioning, one-click installs, upgrade/migration safety nets, and 24×7 launch operations. Ship support workflows, SLAs, and customer-facing artifacts (runbooks, diagnostics, sizing guides, ref architectures). No surprises: green gates, deterministic artifacts, reversible upgrades.

---

## North-Star Outcomes

1. **GA Tag & Provenance:** `v1.0.0` signed with SBOM + SLSA provenance; reproducible on two independent runners.
2. **Install in 30 Minutes:** Fresh cloud deploy (EKS/GKE/AKS) to a green health state using **one** reference path (Helm+TF) in ≤30 min.
3. **Zero-Downtime Upgrade:** `v1.0.0-rc → v1.0.0` rolling upgrade with automated preflight, data migrations, and instant rollback.
4. **Support-Ready:** Ticket triage, diagnostics bundle, severity matrix, and on-call rotations activated; RFO/AAR templates in place.
5. **Customer Artifacts:** Reference architectures, sizing calculator, and guided runbook validated by a non-author engineer.

---

## Tracks & Deliverables

### A) Versioning, Tagging & Release Automation

**Tasks**

- Lock semver policy (`MAJOR.MINOR.PATCH`); map commit/PR labels → release notes categories.
- Implement `release.yml` that: builds artifacts, generates SBOMs, attaches cosign attestations, verifies SLSA policy, and drafts notes.
- Create **RC channel** (`v1.0.0-rc.N`) with promotion task → `v1.0.0` after gates.

**Acceptance Criteria**

- A1: Two clean runners reproduce identical hashes for images/tarballs.
- A2: Release notes auto-generated with PR links + breaking change callouts.
- A3: `verify-provenance` job green; missing attestation = hard fail.

**Artifacts**

- `.github/workflows/release.yml`, `CHANGELOG.md`, `RELEASE_NOTES.md`, `security/policy/trust-policy.yaml`.

---

### B) Packaging: Helm, Terraform & OCI Bundles

**Tasks**

- Helm charts (`charts/summit`) with values for: tenancy, BYOK, residency, MC gates, SSO/SCIM toggles.
- Terraform modules (`deploy/terraform`) for baseline cloud infra (VPC, DB, Neo4j/Postgres, buckets, Grafana, KMS).
- Publish **OCI bundle** of the chart and values presets to `ghcr.io/brianclong/charts/summit`.

**Acceptance Criteria**

- B1: `helm install summit -f values-ga.yaml` → green health in ≤30 min on EKS/GKE/AKS blueprints.
- B2: `terraform apply -auto-approve` idempotent; `terraform destroy` cleans with zero orphans.
- B3: Charts pass `helm lint`, `helm unit` (chart-testing), and `kubeconform`.

**Artifacts**

- `charts/summit/**`, `deploy/terraform/**`, `.github/workflows/chart-ci.yml`.

---

### C) Install Paths & Reference Architectures

**Tasks**

- Three supported paths: **Cloud Native (EKS/GKE/AKS)**, **Single-Node (Docker Compose)**, **Air-gapped (OCI + offline registry)**.
- Reference architectures: small, medium, large (HA options); cost estimates and SLO targets per tier.
- Sizing calculator script based on load inputs (NLQ/min, ingest eps, dataset size).

**Acceptance Criteria**

- C1: Non-author engineer installs **small** ref arch from scratch in ≤30 min.
- C2: Air-gapped install validated with offline Helm/OCI bundle and private registry.
- C3: Sizing tool outputs node counts, storage, and cost within ±15% of benchmark.

**Artifacts**

- `docs/reference-architectures/**`, `tools/sizing/calc.py`, `install/**` (step-by-step guides).

---

### D) Upgrade/Migration Safety & Rollback

**Tasks**

- Preflight checks (`igctl preflight`) for: schema drift, policy bundle signatures, free disk, residency constraints.
- Online migrations with backfill tracker; canary read/write verification; feature flags for risky changes.
- Instant rollback: `mc rollback` restores previous images/digests and dataset alias atomically.

**Acceptance Criteria**

- D1: `rc → GA` upgrade: zero failed requests > 1 min; no data loss; SLOs respected.
- D2: Induced failure mid-migration auto-halts and rolls back cleanly.
- D3: Preflight denies upgrade on missing policy signatures or residency conflicts.

**Artifacts**

- `cli/igctl/commands/{preflight,upgrade,rollback}.ts`, `RUNBOOK-Upgrade.md`, `RUNBOOK-Rollback.md`.

---

### E) Diagnostics, Support & SLAs

**Tasks**

- `igctl diag collect` bundles logs, metrics snapshots, config, policy digests, and provenance summaries (PII-safe).
- Support workflow: ticket intake form, severity matrix, response/restore SLAs, escalation tree; on-call calendar wired.
- RFO/AAR template with time-boxed follow-ups and owner fields.

**Acceptance Criteria**

- E1: Diagnostics bundle <100 MB, redacts secrets/PII, validates against schema.
- E2: Support runbook exercised via dry-run; on-call receives page; comms templates used.
- E3: Post-incident AAR produced from simulated P1 with action items.

**Artifacts**

- `tools/diag/collect.sh`, `SUPPORT.md`, `SLA.md`, `ops/ir/AAR_TEMPLATE.md`, canned issue templates.

---

### F) Docs, Demos & Launch Readiness

**Tasks**

- “Day-0 to Day-2” docs: install, verify, upgrade, backup/restore, DR drill, provenance UX tour.
- Demo scripts: tri-pane UX, provenance, ER gate, SLO/cost gate, MC promote/rollback.
- Final QA checklist: a11y, security, compliance, residency, metering, isolation proofs.

**Acceptance Criteria**

- F1: Docs link check & runnable snippets CI: **green**.
- F2: Video/script demo completes in <12 minutes; sample data pack loads via `make demo-up`.
- F3: GA readiness checklist signed by Platform, Security, Compliance, Product.

**Artifacts**

- `docs/ga/**`, `.github/workflows/docs-validate.yml`, `demo/data/**`, `demo/script.md`.

---

### G) Launch Ops Runbook & Comms

**Tasks**

- T-timeline (T-14d → T+7d): freezes, dry-runs, status page prep, rollback criteria, comms to customers.
- Release guard dashboard: gates, SLOs, error budget, quota/cost status, promotion/rollback buttons (Ops Drawer hookup).
- “Known Issues & Workarounds” page; rapid-patch path (`v1.0.1`) with hotfix workflow.

**Acceptance Criteria**

- G1: Dry-run follows timeline; all checkpoints pass; go/no-go meeting notes archived.
- G2: Guard dashboard red/green accurately mirrors gates; alert routes tested.
- G3: Hotfix `v1.0.1` RC cut & validated in ≤2 hours during drill.

**Artifacts**

- `RUNBOOK-Launch-Timeline.md`, `ops/dashboards/ga-guard.json`, `.github/workflows/hotfix.yml`, `KNOWN_ISSUES.md`.

---

## CI Gates (added/confirmed this sprint)

- `release-repro` (cross-runner hash parity)
- `chart-ci` (lint/unit/install on kind)
- `tf-plan-apply` (plan drift + policy check)
- `preflight-check` (blocks upgrade on failures)
- `airgapped-pack` (offline bundle build/verify)
- `docs-validate` (links/snippets)
- Existing security/provenance/quality/SLO gates remain required.

---

## Quickstart Commands

```bash
# Cut RC
make release-rc VERSION=1.0.0-rc.1

# Install (reference small on EKS)
make tf-apply env=eks-small
helm upgrade --install summit charts/summit -f install/values-ga-small.yaml

# Verify
igctl preflight
make promtest && make k6-slo && make slo-cost-gate

# Promote GA
make release-promote VERSION=1.0.0
make verify-provenance

# Upgrade & rollback
igctl upgrade --to 1.0.0
igctl rollback --to previous

# Diagnostics & support
igctl diag collect --out diag_$(date +%F).tgz
```
````

---

## Review & Live Demo (Sprint Close)

1. **RC → GA:** Cut `v1.0.0-rc`, install on clean EKS via TF+Helm, promote to `v1.0.0` after green gates.
2. **Upgrade Drill:** Run preflight, perform rolling upgrade, inject fault, show auto-halt/rollback; verify no data loss.
3. **Air-gapped Path:** Deploy from OCI bundle to private registry; confirm health & provenance checks.
4. **Diagnostics & Support:** Generate diagnostics, open a mock P1, page on-call, publish status update, close with AAR.
5. **Docs & Demos:** Run the 12-minute GA demo script; validate doc snippets via CI.
6. **Hotfix Path:** Cut `v1.0.1-rc`, pass gates, promote, and show guard dashboard green.

---

## Risks & Mitigations

- **Chart/TF drift between clouds:** Kind/CI installs + cloud blueprints per provider; conformance tests.
- **Upgrade edge cases:** Preflight + feature flags + canary window; instant rollback.
- **Support overload at GA:** Clear severity matrix, good diagnostics, templated comms, and on-call rotations.

---

## Definition of Done (27K)

- `v1.0.0` released with signed artifacts, SBOM, and SLSA provenance.
- One-click install validated on EKS/GKE/AKS; offline bundle path proven.
- Zero-downtime upgrade & rollback demonstrated; preflight blocks unsafe paths.
- Support program active with diagnostics, SLAs, and AAR template.
- GA docs, demos, ref architectures, and sizing tools published and verified.

```

```

````md
# Summit / Maestro Conductor — Sprint 27L “Post-GA Adoption Flywheel, Field Reliability & Customer Onboarding”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Convert GA into durable adoption. Ship zero-friction onboarding, in-product guidance, telemetry & feedback loops, field reliability fixes, and a partner/integration pathway. Close the loop: learn from production, act automatically, and prove measurable time-to-value.

---

## North-Star Outcomes

1. **TTV ≤ 60 minutes:** A new tenant reaches first value (ingest → query → provenance verify) in under 60 minutes.
2. **Guidance Everywhere:** Contextual guides, checklists, and “fix-it” wizards yield ≥70% task completion without docs.
3. **Field Reliability:** Top 10 production issues resolved; crash-free sessions ≥ 99.5%; P0/P1 MTTR ≤ 30 min.
4. **Telemetry → Roadmap:** Instrumentation feeds a weekly insights report; at least 3 improvements shipped based on real usage.
5. **Ecosystem Lift:** 5 turnkey integrations (Auth, Data, Observability, Storage, ITSM) with one-click installers.

---

## Tracks & Deliverables

### A) Zero-Friction Onboarding (Tenant Bootstraps & “First-Value” Path)

**Tasks**

- Tenant bootstrap wizard: SSO/SCIM, residency, BYOK, sample dataset toggle, and “choose a path” (demo vs. real data).
- In-product checklist (“Get to First Value”) with progress tracking; deep-links to actions.
- “Golden Path” seed: sample connectors + dataset + saved queries + dashboards preloaded.

**Acceptance Criteria**

- A1: Fresh tenant → first value (ingest small sample → tri-pane view → provenance verify) in ≤ 60 minutes.
- A2: Checklist completion events logged; ≥70% of new tenants finish all steps in staging dogfood.
- A3: Abort/resume supported; wizard is idempotent and re-runnable.

**Artifacts**

- `ui/onboarding/*`, `services/api/onboarding/*`, `seed/golden-path/**`, `RUNBOOK-Onboarding.md`.

---

### B) In-Product Guidance, Docs Inline & “Fix-It” Wizards

**Tasks**

- Contextual helpers: inline docs, hover hints, “why blocked?” explainers for policy/residency/step-up denials.
- Troubleshooters: “Connector won’t start,” “Provenance failing,” “Policy deny,” with one-click remediation.
- Command Palette recipes (`Cmd/Ctrl-K`): “Create dataset,” “Verify export,” “Run ER gate.”

**Acceptance Criteria**

- B1: Guide step completion tracked; abandonment < 20% per flow.
- B2: Common failure states auto-suggest working fixes; 80% of cases resolved without leaving the app (staging dogfood).
- B3: A11y pass on all helpers (keyboard/focus/ARIA).

**Artifacts**

- `ui/guides/*`, `ui/fixit/*`, `ui/command/recipes.ts`, analytics schemas.

---

### C) Telemetry, Product Analytics & Weekly Insights

**Tasks**

- Instrument critical funnels: onboard, ingest start→success, first NLQ, provenance verify, ER gate, promote/rollback.
- Define event schema + privacy controls (PII-safe, tenant-scoped, opt-out per contract).
- Weekly Insights report: usage, errors, cost per value event, feature adoption, NPS/CSAT.

**Acceptance Criteria**

- C1: Event loss < 0.1%; schema versioned; privacy redactions verifiably enforced.
- C2: “Top 5 frictions” auto-computed; PRs opened with suggested fixes.
- C3: Insights report generated & delivered each Monday 09:00 MT with signed artifact.

**Artifacts**

- `analytics/schema.yaml`, `services/telemetry/*`, `ops/reports/weekly_insights_*.md`, `.github/workflows/weekly-insights.yml`.

---

### D) Field Reliability: Top 10 Issues & Guardrails

**Tasks**

- Analyze GA incidents & support tickets; create a Top-10 issue list with owners.
- Ship hotfixes or guardrails (timeouts, retries, circuit breakers, backpressure) where patterns recur.
- Add feature flags to degrade gracefully (e.g., “normalize-only mode” on enricher saturation).

**Acceptance Criteria**

- D1: Top-10 list resolved or mitigated with measurable impact (error/timeout reductions ≥ 50% each).
- D2: Crash-free sessions ≥ 99.5% (rolling 7d); UI unhandled-rejection = 0.
- D3: MTTR P0/P1 ≤ 30 min demonstrated in staging drills.

**Artifacts**

- `ops/reliability/top10.md`, patches/flags, `ops/dashboards/field-reliability.json`.

---

### E) Customer Feedback & Support UX

**Tasks**

- In-product feedback widget (thumbs/NPS/comment with context & logs opt-in).
- “Request Help” flow: bundles diagnostics + redacts PII + opens ticket with severity rubric.
- Success plan template per tenant; QBR pack generator.

**Acceptance Criteria**

- E1: Feedback response rate ≥ 20% of weekly active admins; sentiment correlated with features used.
- E2: Support widget creates tickets with complete diagnostics ≥ 95% of the time.
- E3: QBR pack auto-build includes usage, SLOs, ER quality, cost, and ROI proxy.

**Artifacts**

- `ui/feedback/*`, `tools/diag/collect.sh` (inline trigger), `tools/qbr/build.py`, `templates/success_plan.md`.

---

### F) Ecosystem: One-Click Integrations (5 Targets)

**Tasks**

- Ship installers for: **Okta/Azure AD** (SSO/SCIM presets), **Datadog/New Relic** (telemetry export), **S3/GCS/Azure Blob** (exports), **ServiceNow/Jira** (alerts→tickets).
- Pre-verified values files and Terraform add-ons; pact tests on integration webhooks/APIs.

**Acceptance Criteria**

- F1: Each integration installs in ≤ 15 minutes with a guided wizard.
- F2: Pact tests green; failure modes explained with actionable messages.
- F3: Marketplace page/cards created; usage tracked.

**Artifacts**

- `integrations/{okta,azuread,datadog,newrelic,s3,gcs,servicenow,jira}/**`, `docs/integrations/**`, `marketplace/index.json`.

---

### G) Pricing, Quotas & Expansion Levers (Post-GA)

**Tasks**

- Instrument per-feature consumption; tie to quotas/tiers; surface “near limit” nudges with upgrade path.
- In-app trial→paid upgrade; seat and capacity management UI.
- AB tests on nudges and activation flows (guardrails for fairness & ethics).

**Acceptance Criteria**

- G1: At least one upgrade path conversion from trial in staging dogfood.
- G2: “Near limit” nudges convert ≥ 10% to higher tier in test cohort.
- G3: AB experiments logged with pre-registered hypotheses; stats power ≥ 0.8.

**Artifacts**

- `billing/ui/*`, `config/quotas.yaml` (UI), `experiments/registry.yaml`, `docs/pricing_faq.md`.

---

## CI Gates (added/confirmed this sprint)

- `onboarding-e2e` (first-value path ≤ 60 min, synthetic)
- `guides-a11y` (axe: no serious/critical)
- `telemetry-schema-validate` (event contracts + redaction tests)
- `field-reliability-top10` (assertions on fixed error classes)
- `integrations-pact` (Okta/AzureAD/Datadog/NewRelic/S3/GCS/ServiceNow/Jira)
- `experiments-sanity` (pre-registered & guardrails)
- Existing platform/security/quality/SLO gates remain required.

---

## Quickstart Commands

```bash
# Seed a new tenant to first value
igctl tenant bootstrap --demo --sso=okta --residency=us-west-2 --byok=auto
make golden-path

# Run onboarding & guides tests
make onboarding-e2e
pnpm test:ui:guides && pnpm axe:guides

# Telemetry + insights
make telemetry-validate
make weekly-insights

# Field reliability
make top10-scan && make top10-fix-dryrun

# Integrations
make integrate okta
make integrate datadog
make integrate servicenow

# Experiments
make exp-register name="NudgeNearLimit" && make exp-rollout name="NudgeNearLimit" pct=10
```
````

---

## Review & Demo Script (Sprint Close)

1. **First-Value Live:** New tenant → bootstrap wizard → sample ingest → tri-pane → provenance verify, all under 60 minutes.
2. **Guides & Fix-It:** Break a connector; “Fix-It” resolves; policy denial explains remediation; A11y demo with keyboard only.
3. **Insights Loop:** Open Weekly Insights; show top frictions and linked PRs; deploy one quick win.
4. **Reliability Wins:** Display Top-10 issue reductions (before/after); show crash-free and MTTR improvements.
5. **Integrations:** Install Okta + Datadog in <15 minutes; see telemetry in target tool; create ServiceNow ticket from alert.
6. **Upgrade Path:** Hit quota nudge; complete trial→paid flow (staging); show AB experiment guardrails and results.

---

## Risks & Mitigations

- **Guide fatigue:** Short, contextual steps; allow dismiss/“don’t show again”; surface only on relevant roles.
- **Telemetry privacy:** Pseudonymize; tenant-scoped; opt-out respected; DPIA template applied.
- **Support noise:** Auto-attach diagnostics; templated triage; deflection via Fix-It flows.

---

## Definition of Done (27L)

- Onboarding “first-value” path measurably ≤ 60 minutes with ≥70% completion.
- In-product guides & fix-it flows reduce support tickets for targeted issues by ≥30%.
- Top-10 field issues fixed/mitigated with crash-free ≥ 99.5% and MTTR ≤ 30 min.
- Weekly Insights pipeline live; at least 3 product improvements shipped from it.
- Five turnkey integrations validated; marketplace entries published and tracked.

```

```

````md
# Summit / Maestro Conductor — Sprint 27M “Safety, Abuse-Resistance & Red-Team Automation”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Operationalize AI safety and abuse-prevention end-to-end: automated red-team harnesses, prompt-injection/jailbreak defense, PII/IP leakage scanners, anomaly/fraud detection, honeytokens & deception telemetry, and clear operator workflows. All defenses must be measurable, reproducible, and fail-closed in CI/CD and at runtime.

---

## North-Star Outcomes

1. **Continuous Red-Teaming:** Nightly adversarial suites (prompt-injection, data-exfil, policy evasion) run on staging; regressions block promotion.
2. **Leakage ≤ 0.1%:** PII/IP leakage detector on NLQ/exports catches and blocks sensitive content with explain() + operator override trail.
3. **Abuse-Resistance:** Prompt-injection & jailbreak defenses reduce successful attack rate ≥ 80% on curated corpora; defenses are explainable and logged.
4. **Deception Telemetry:** Honeytokens/honeypaths planted across pipelines; any touch creates high-signal alerts with playbooks.
5. **Operator Clarity:** “Safety Console” surfaces risk posture, failing tests, hot signals, and one-click mitigations (quarantine, rate-limit, feature flag).

---

## Tracks & Deliverables

### A) Automated Red-Team Harness (ART)

**Tasks**

- Build `safety/redteam` with scenario DSL (YAML) covering: prompt-injection, tool-use jailbreaks, data exfil, policy evasion, refusal bypass, privacy attacks.
- Seed corpora: OSS benchmarks + custom scenarios derived from our policies and threat model.
- Deterministic runs (seeded), golden transcripts, and triage artifacts (diffs, evidence, risk rating).

**Acceptance Criteria**

- A1: `make redteam-run` executes ≥ 300 scenarios in ≤ 20 min; artifacts uploaded.
- A2: Failures emit structured PR comments with repro commands.
- A3: CI `redteam-gate` required on protected branches.

**Artifacts**

- `safety/redteam/{scenarios,drivers,fixtures}/**`, `.github/workflows/redteam.yml`, `docs/safety/redteam.md`.

---

### B) Prompt-Injection & Jailbreak Defenses (PI/JB)

**Tasks**

- Layered defenses: content sanitization, tool-call allowlist, high-risk string filters, instruction boundary markers, contextual policy reminders, and output-scope whitelisting.
- Train detection heuristics + lightweight classifier from failure corpora; plug into gateway pre-flight.
- Add “conversation firewall” with isolation per tool and structured memory scoping.

**Acceptance Criteria**

- B1: On the red-team set, successful PI/JB rate drops ≥ 80% vs. baseline.
- B2: False-positive rate ≤ 1% on normal workloads (measured via staging telemetry).
- B3: All blocks show `explain()` + remediation hints; operator override requires step-up and is audited.

**Artifacts**

- `services/gateway/src/safety/{pi_detector.ts,firewall.ts}`, `config/safety/policies.yml`, tests + golden diffs.

---

### C) PII/IP Leakage Scanners & Egress Guards

**Tasks**

- Inline scanners for PII (emails, phones, addrs, gov IDs), secrets, and IP/classified keywords; support structured allowlists by tenant.
- Egress policy: block or redact on export/query unless `purpose` + step-up + case ID.
- Export verifier extends to content leakage checks (ties to 27F manifests).

**Acceptance Criteria**

- C1: Synthetic PII/IP seeds always detected pre-egress; CI fails without explicit test allowlist.
- C2: Leakage rate ≤ 0.1% on sampled staging traffic; redaction latency p95 < 50 ms.
- C3: Operator “why blocked?” panel shows matched rules and lineage.

**Artifacts**

- `security/leakscan/{pii.ts,ip.ts,secrets.ts}`, `services/export/guards.ts`, `ui/components/WhyBlocked.tsx`.

---

### D) Fraud, Abuse & Anomaly Detection

**Tasks**

- Real-time detectors: velocity, entropy, token-burst, path anomalies, and impossible travel (per tenant).
- Quotas + dynamic rate-limiting backed by risk score; soft-degrade routes where safe.
- Dashboards & alerts; link to Ops Drawer (27G/F) for actions.

**Acceptance Criteria**

- D1: ≥ 90% of simulated fraud/abuse sessions rate-limited or blocked within 30s.
- D2: False-block rate ≤ 0.5% (validated on staging cohort).
- D3: Ops can thaw/lock tenants with one-click; all actions audited.

**Artifacts**

- `services/risk/score.ts`, `config/rate_limits.yaml`, `ops/observability/dashboards/risk.json`, alerts.

---

### E) Honeytokens, Honeypaths & Deception Telemetry

**Tasks**

- Plant signed honeytokens across: datasets, exports, connectors, and logs; add canary emails/URLs/keys with traceable beacons.
- Honeypaths in UI/API (non-harmful) to catch scripted enumeration; rate-limit + flag actors.
- Weekly report of trips with source, route, and remediation.

**Acceptance Criteria**

- E1: Synthetic “red actor” trips beacons; alert fired with full trail in <10s.
- E2: Zero production user impact; honeypaths invisible in normal flows.
- E3: Report delivered weekly with signatures and deduped actors.

**Artifacts**

- `security/deception/{honeytoken.ts,beacon.ts}`, `ops/reports/deception_weekly_*.md`.

---

### F) Safety Console (Operator UX)

**Tasks**

- UI panel listing: failing red-team tests, current PI/JB blocks, leakage events, risk spikes, and honeytoken trips.
- Actions: quarantine dataset/connector, lower model caps, enforce read-only, rotate keys, block export region.
- Evidence pack generator for any event (hash-chain + provenance digests).

**Acceptance Criteria**

- F1: All events visible ≤ 15s from occurrence; filters by tenant/region/severity.
- F2: Actions require step-up; AAR template pre-filled with evidence.
- F3: Live demo shows quarantine → unblock with audit trail.

**Artifacts**

- `ui/ops/SafetyConsole/*`, `tools/evidence/pack.ts`, `RUNBOOK-Safety-Ops.md`.

---

### G) Policy & Ethics Guardrails (+ Legal Hooks)

**Tasks**

- Encode “won’t-build / won’t-answer” guardrails (dangerous capabilities, illicit content) with policy bundles and localized explainers.
- Legal hooks: export control flags, OFAC screening for workspace metadata; log denials with reason codes.
- Add `policy-sim` to test proposed changes against historical traffic.

**Acceptance Criteria**

- G1: Guardrails block prohibited categories with localized explainers; CI `policy-sim` shows zero accidental blocks on historical safe traffic.
- G2: OFAC/export flags applied to sample entities; attempts to export are denied with case law references (links in docs).
- G3: Policy changes require signed bundle + CAB approval label.

**Artifacts**

- `security/policy/wont_build.rego`, `tools/policy/sim.ts`, `docs/policy/ethics.md`.

---

## CI Gates (added/required this sprint)

- `redteam-gate` (scenario pass rate thresholds)
- `pi-jb-defense` (attack success ≤ budget)
- `leakscan-synthetic` (must catch all seeds)
- `risk-detector-sim` (precision/recall on labeled flows)
- `deception-sim` (beacon & honeypath tests)
- `policy-sim` (no unexpected blocks on safe traffic)
- Existing: security/provenance/quality/SLO, residency, ER, cost gates remain required.

---

## Quickstart Commands

```bash
# Red-team
make redteam-run                     # run full suite
make redteam-report                  # summarize failures + repro cmds

# Prompt-injection / jailbreak defenses
make pi-train && make pi-eval        # train/eval lightweight classifier
make firewall-smoke                  # conversation firewall smoke tests

# Leakage & egress
make leakscan-ci                     # synthetic PII/IP seeds
igctl export verify --bundle out.tgz # includes leakage checks

# Risk & rate-limit
make risk-sim                        # labeled flows → precision/recall
make rate-limit-dryrun tenant=T1

# Deception
make deception-plant                 # install honeytokens
make deception-sim                   # simulate trip + alert

# Safety Console
pnpm dev && open /ops/safety         # UI; try quarantine/unquarantine

# Policy sim
make policy-sim traffic=staging-24h
```
````

---

## Review & Live Demo (Sprint Close)

1. **Red-Team Live:** Run full suite → show failing cases, fix one PI vector → re-run → green.
2. **Defense Efficacy:** Before/after metrics show ≥ 80% drop in successful PI/JB on corpus.
3. **Leakage Gate:** Attempt export with seeded PII/IP → blocked with explain(); override with step-up and case ID → allowed + audited.
4. **Risk & Deception:** Simulate bot abuse → rate-limit fires; trip honeytoken → high-signal alert with full trail.
5. **Safety Console:** Triage event, quarantine a connector, rotate keys, unquarantine; evidence pack generated.
6. **Policy Sim:** Propose guardrail tweak → run `policy-sim` on 24h traffic → zero accidental blocks → promote.

---

## Risks & Mitigations

- **Overblocking:** Shadow-mode first, gradual enforcement, explicit allowlists, policy-sim on historical traffic.
- **Latency from defenses:** Fast path in gateway; async second-pass scan for large payloads; cache verdicts.
- **Adversary adaptation:** Regular corpus refresh, deception diversity, and weekly insights into new attack vectors.

---

## Definition of Done (27M)

- Red-team harness integrated; promotion blocked on safety regressions.
- PI/JB defenses deployed; attack success rate reduced ≥ 80% with ≤ 1% false positives.
- PII/IP leakage scanning enforced with explainable denials and operator override trail.
- Risk detection, rate-limiting, and deception telemetry live with dashboards & alerts.
- Safety Console operational; evidence packs and runbooks used in demo; policy-sim part of CI.

```

```

````md
# Summit / Maestro Conductor — Sprint 27N “NL→Cypher Excellence, Semantic Retrieval & Query Optimization”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Make natural-language querying shock-proof, precise, and fast. Ship a best-in-class NL→Cypher stack with semantic retrieval (hybrid BM25+vector), guarded reasoning, learned query plans, and end-user explainability. Eliminate wrong/slow queries, slash tail latency, and prove measurable quality gains on gold tasks.

---

## North-Star Outcomes

1. **Accuracy ≥ 95% on Gold Tasks:** NL→Cypher benchmark passes with ≥95% exact-match on intent & constraints, ≤2% unsafe suggestions (blocked by guardrails).
2. **p95 Latency ≤ 900 ms:** Hybrid retrieval + learned plans reduce NLQ p95 to ≤900 ms in staging under target load.
3. **Zero Wrong-Table Incidents:** Schema-aware planner and contract tests prevent mis-joins/namespace leaks; CI blocks regressions.
4. **Explainable by Default:** Each NLQ has a one-click **Explain**: sources, schema choices, constraints applied, and cost estimate; reproducible with a copyable CLI.
5. **Self-Healing Query Plans:** Online feedback (clicks/edits/timeouts) feeds the planner; weekly auto-retraining artifact signed and promoted.

---

## Tracks & Deliverables

### A) Hybrid Retrieval (BM25 + Vector + Filters)

**Tasks**

- Implement query decomposition: intent → candidate entities/relations → filter slots (time/geo/tenant).
- Add **hybrid ranker**: sparse (BM25/keyword) + dense (vector) with reciprocal rank fusion; tenant-scoped.
- Introduce retrieval cache keyed by normalized NLQ + dataset/version + purpose; eviction by LRU + TTL.

**Acceptance Criteria**

- A1: Hybrid improves top-k (k=10) recall ≥ 20% vs. BM25-only on gold set.
- A2: p95 retrieval ≤ 120 ms; cache hit-rate ≥ 60% for repeated NLQs.
- A3: All candidates carry provenance links and policy tags into the planner.

**Artifacts**

- `services/gateway/src/nlq/retrieval/{bm25.ts,vector.ts,rrf.ts,cache.ts}`, `config/retrieval.yaml`, tests & fixtures.

---

### B) Schema-Aware NL→Cypher Planner

**Tasks**

- Build grammar with **entity dictionary** + **relationship catalog** from canonical schema; prefer foreign-key paths with cost model.
- Constraint inserter: inject tenant, residency, purpose, time bounds, and safe defaults (RO) automatically (ties to 27D).
- Unsafe/ambiguous intents return top-2 plans with user-facing disambiguation prompts (RO only).

**Acceptance Criteria**

- B1: Gold set exact-match ≥ 95% intent + constraints; zero wrong-table joins on audits.
- B2: Ambiguity rate reported; interactive disambiguation resolves ≥ 90% on first follow-up.
- B3: All emitted Cypher passes static and runtime safety checks (no Cartesian unless whitelisted).

**Artifacts**

- `services/gateway/src/nl2cypher/planner/*`, `schema/dictionary.json`, `tests/nlq/gold/*.jsonl`, `ops/reports/nlq_accuracy.md`.

---

### C) Learned Cost Model & Plan Selection

**Tasks**

- Collect features (cardinality estimates, index presence, path length, selectivity, cache stats); train lightweight ranker for plan choice.
- Online telemetry feedback (success, latency, correction edits) updates weights nightly; signed model artifact.
- Canary the model with shadow evaluation before promotion.

**Acceptance Criteria**

- C1: p95 latency drop ≥ 20% vs. baseline on hot queries; no accuracy regression on gold set.
- C2: Nightly training emits signed `planner_weights.json` with evaluation report; promotion requires green.
- C3: Rollback command restores previous weights in ≤ 2 minutes.

**Artifacts**

- `services/gateway/src/nlq/planranker/*`, `models/planner_weights.json`, `.github/workflows/plan-train.yml`, eval report.

---

### D) Guarded Reasoning & Constraint Proofs

**Tasks**

- Hard gates: tenancy, purpose, residency, max result cardinality; row limit auto-cap with “expand” path.
- Add **constraint proofs** to Explain: show each enforced guard (policy digest, reason, and example rows suppressed).
- Block “needle in haystack” patterns (wildcard scans) without filter hints; suggest safe alternatives.

**Acceptance Criteria**

- D1: Unsafe queries blocked with `explain()`; override requires step-up + reason and is audited.
- D2: Constraint proofs included in Explain for 100% of NLQs.
- D3: CI `nlq-safety` catches all unsafe patterns on synthetic suite.

**Artifacts**

- `services/gateway/src/nlq/guards/*`, `ui/components/NLQExplain/ConstraintProof.tsx`, `tests/nlq/safety/*.spec.ts`.

---

### E) Explainability & Developer Tooling

**Tasks**

- UI **Explain** panel: retrieval candidates (with scores), chosen schema path, constraints, predicted cost, and plan diagram; “Copy Repro” button (`igctl nlq run …`).
- CLI: `igctl nlq plan --show-explain` and `--why-not <expected-entity>` to compute counterfactuals.
- Log minimally sufficient traces for privacy-safe debugging.

**Acceptance Criteria**

- E1: Explain renders in <300 ms for cached plans; <700 ms cold path.
- E2: Counterfactual produces actionable hints ≥ 80% of the time on gold mistakes.
- E3: PII-safe traces validated; no leakage in logs/Explain.

**Artifacts**

- `ui/components/NLQExplain/*`, `cli/igctl/commands/nlq.ts`, `tools/nlq/trace_sanitizer.ts`.

---

### F) Indexing, Hints & Runtime Optimizations

**Tasks**

- Auto-index suggestions: derive missing composite indexes/materialized views from observed workloads; open PRs with explain gains.
- Add **result windowing** + **server-side cursors** for long lists; hedged reads for read replicas where safe.
- Golden query set with regression budgets; add cold vs. warm cache runs.

**Acceptance Criteria**

- F1: At least 3 index PRs merged; each shows measurable p95 improvements with before/after profiles.
- F2: No timeouts on golden set at 2× load; hedged reads do not inflate error rate.
- F3: Golden perf CI reports separate cold/warm curves; both within budgets.

**Artifacts**

- `ops/query-plans/*.md`, `ops/suggestions/index_prs/*.md`, `tests/nlq/perf/*.yml`.

---

### G) Evaluation, Gold Sets & Human-in-the-Loop

**Tasks**

- Curate **Gold v1.2**: 300–500 tasks covering entity types, joins, filters, time/geo, and sensitive constraints.
- Labeling UI for reviewers; disagreement adjudication; auto-issue creation on failures.
- Weekly **NLQ Scorecard** to Slack: accuracy, safety blocks, latency, ambiguity rate, top failures.

**Acceptance Criteria**

- G1: Gold v1.2 finalized with inter-rater agreement κ ≥ 0.8.
- G2: Scorecard auto-posted Mondays 09:00 MT with signed artifact.
- G3: Top-5 failure themes receive tracked fixes within the sprint.

**Artifacts**

- `tests/nlq/gold_v1.2/**`, `ui/internal/GoldLabeler/*`, `.github/workflows/nlq-scorecard.yml`.

---

## Required CI Gates (added/confirmed this sprint)

- `nlq-gold-accuracy` (≥95% exact-match; no safety regressions)
- `nlq-safety` (unsafe patterns blocked; proofs present)
- `nlq-perf` (p95 latency budgets cold/warm)
- `retrieval-recall` (hybrid recall uplift ≥ target)
- `planner-train-eval` (signed model; eval green)
- Existing: policy/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Run gold suite & safety checks
make nlq-gold
make nlq-safety

# Profile & improve a query
igctl nlq plan --q "orgs in EU with sanctions since 2022" --explain
igctl nlq why-not --q "..." --expected entity=Person:123

# Train & canary the planner
make plan-train && make plan-eval
make plan-promote || make plan-rollback

# Retrieval tuning
make retrieval-bench
make retrieval-cache-report

# Perf regression
make nlq-perf-cold && make nlq-perf-warm
```
````

---

## Review & Demo Script (Sprint Close)

1. **Gold Accuracy:** Run `make nlq-gold` live; show ≥95% pass, highlight fixed failures from last week.
2. **Explainability:** Open Explain for a complex NLQ; walk through retrieval candidates, chosen path, constraints, and cost; copy repro to CLI.
3. **Safety Block:** Attempt an unsafe/wildcard query; show deny with constraint proofs; step-up override demonstrates audited path.
4. **Latency Win:** Compare before/after p95 with hybrid retrieval + learned ranker; show index PRs and plan profiles.
5. **Human-Loop:** Label a new edge case in the Gold Labeler; re-run subset; Scorecard posts to Slack.

---

## Risks & Mitigations

- **Over-constrained results (false negatives):** Provide counterfactuals and interactive disambiguation; monitor ambiguity rate.
- **Under-constrained scans (perf risk):** Hard caps, filter hints, and guardrails; require filters for large classes.
- **Model drift:** Nightly eval + signed artifact promotion; easy rollback; keep rule-based fallbacks.

---

## Definition of Done (27N)

- NL→Cypher accuracy ≥95% on Gold v1.2 with p95 ≤900 ms under target load.
- Hybrid retrieval deployed with measurable recall uplift and high cache hit-rate.
- Guarded planner enforces constraints with proofs; unsafe patterns blocked in CI and runtime.
- Explain panel and CLI tooling live; reproducible queries with privacy-safe traces.
- Learned cost model trained, signed, and safely promoted with rollback; weekly NLQ Scorecard in place.

```

```

````md
# Summit / Maestro Conductor — Sprint 27O “Plugin Platform, Workflow Automations & App SDK”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Open Summit safely to third-party and internal extensibility. Ship a **Plugin Platform** with policy-aware extension points (ingest, transform, NLQ, UI widgets, automations), a **Job/Workflow engine** (cron, event, human-in-the-loop), and an **App SDK** (TypeScript/Python) with webhooks, OAuth scopes, and pact tests. Deliver a minimal “App Store” to install, verify, and manage plugins with signed manifests and provenance.

---

## North-Star Outcomes

1. **Safe Extensibility:** Plugins run in sandboxed runtimes with **OPA/ABAC**, **resource limits**, **egress guards**, and **signed manifests**.
2. **First 6 Plugins Live:** Official set (Connector, Enricher, NLQ Plan Hook, Exporter, UI Widget, Automation) installed via one-click, passing gates.
3. **Workflow Automations:** Event/Cron/HITL jobs defined declaratively; audit trails, retries, idempotency, and rollback proven.
4. **Developer Joy:** App SDK + CLI scaffold a working plugin in ≤10 minutes; pact tests & examples included.
5. **Governance:** App Store shows provenance/SBOM, permissions, data residency impact, and changelog; install/upgrade is reversible.

---

## Tracks & Deliverables

### A) Plugin Runtime & Sandbox

**Tasks**

- Define plugin spec `plugins/spec/v1` (manifest, scopes, lifecycle hooks, health).
- Sandboxed runtimes: **Node 20** and **Python 3.11** with CPU/memory/time quotas; deterministic I/O interfaces.
- Egress policy: allowlist endpoints, residency tags propagated; signed network policy per plugin.
- Secret mount model: per-tenant scoped short-lived tokens; WebAuthn step-up for privileged scopes.

**Acceptance Criteria**

- A1: Tampered manifest or missing signature → install blocked with explain().
- A2: Plugin exceeding quota → throttled/terminated with audit event.
- A3: Egress to non-approved region blocked; residency explain visible.

**Artifacts**

- `plugins/spec/v1.yaml`, `runtime/sandbox/{node,python}/*`, `security/policy/plugin.rego`, tests.

---

### B) Extension Points (Hooks) & Contracts

**Tasks**

- Hooks: `ingest.before/after`, `transform.map`, `enrich.*`, `nlq.plan.hint`, `export.bundle`, `ui.widget`, `automation.job`.
- Pact schemas + contract tests; versioned with semver and deprecation lanes.
- Backward-compat shims and feature flags.

**Acceptance Criteria**

- B1: All hooks documented with examples; contract tests green for official plugins.
- B2: Breaking change requires migration guide + dual-run window.
- B3: CI gate blocks PRs altering hook contracts without bump + docs.

**Artifacts**

- `hooks/**`, `.github/workflows/hooks-contract.yml`, `docs/plugins/hooks.md`.

---

### C) Workflow Engine (Jobs & Automations)

**Tasks**

- Declarative DAG spec (`orchestrations/jobs/*.yaml`): sources→tasks→sinks with retries/backoff/idempotency keys.
- Triggers: cron, event (webhook/queue), manual; HITL step with approvals.
- State & observability: run logs, metrics, evidence bundle, and replay.

**Acceptance Criteria**

- C1: Cron/event jobs execute reliably; replay produces identical outputs (hash-checked).
- C2: HITL approval requires step-up; denial path audited with reason.
- C3: DR test replays last 1h of jobs with zero data loss.

**Artifacts**

- `services/jobs/*`, `orchestrations/jobs/*.yaml`, `RUNBOOK-Automations.md`, dashboards + alerts.

---

### D) App SDKs, CLI & Scaffolds

**Tasks**

- **TS & Python SDKs** exposing typed hook interfaces, context (tenant, dataset, policy digest), and helpers (provenance, DLP utilities).
- `igctl app create` scaffolds plugin template, local dev server, pact tests, and publish/sign flow.
- Example plugins: `app-enricher-geocode`, `app-nlq-hint-geo`, `app-export-s3`, `app-ui-provenance-card`.

**Acceptance Criteria**

- D1: New dev → “hello-plugin” running in ≤10 minutes with tests.
- D2: `igctl app publish` creates signed artifact; `igctl app verify` passes.
- D3: SDK examples compile, unit tests green in CI.

**Artifacts**

- `sdks/app-ts/**`, `sdks/app-py/**`, `cli/igctl/commands/app.ts`, examples under `examples/plugins/**`.

---

### E) App Store (Install, Verify, Manage)

**Tasks**

- Minimal App Store UI: list/search, permission scopes, provenance/SBOM, version, changelog, residency impact, risk badge.
- Install/upgrade/rollback flows with dry-run: show diffs of scopes, egress, and resources.
- Tenant-scoped approvals, CAB label for high-risk scopes.

**Acceptance Criteria**

- E1: Install of signed plugin completes with health green; rollback restores previous version in ≤2 minutes.
- E2: Upgrade with new scopes blocked until approved; dry-run shows diff.
- E3: Risk/report pages render without PII; links to Trust Center evidence.

**Artifacts**

- `ui/appstore/*`, `services/appstore/*`, `docs/appstore.md`.

---

### F) First-Party Plugin Set (6)

**Plugins**

1. **Connector: “files-bucket”** (S3/GCS/Azure) with residency propagation.
2. **Enricher: “ner-lite”** (fast NER with cache + DLP).
3. **NLQ Plan Hint: “geo-time bias”** (boosts time/geo filters).
4. **Exporter: “parquet-s3”** with manifest signing & leakage checks.
5. **UI Widget: “Provenance Card”** (embeddable on entity pages).
6. **Automation: “dataset-freshness-watchdog”** (alerts/promotes on quality gates).

**Acceptance Criteria**

- F1: All 6 install from App Store; pass pact & residency tests.
- F2: Watchdog triggers promotion/rollback through MC gates correctly.
- F3: Exporter fails-closed on missing manifest signature; explain() shows fix.

**Artifacts**

- `plugins/firstparty/**`, tests + manifests.

---

### G) Security, Provenance & Billing for Plugins

**Tasks**

- Cosign attestations + SBOM for each plugin build; trust policy extended to third-party registries/keys.
- Per-plugin metering (CPU/time/events) tied to tenant budgets; opt-in billing lines.
- Weekly “Plugin Risk & Usage” report with signer fingerprints.

**Acceptance Criteria**

- G1: Promotion gate fails on unsigned/unknown signer plugins.
- G2: Metering accuracy ±1%; soft limit → degrade, hard limit → block with audit.
- G3: Weekly report signed and posted; drift in signer keys alerts Security.

**Artifacts**

- `security/policy/plugin_trust.yaml`, `services/metering/plugins/*`, reports.

---

## CI Gates (added/confirmed this sprint)

- `hooks-contract` (semver & pact tests green)
- `plugin-trust` (signature + SBOM + provenance)
- `sandbox-quota` (enforced CPU/mem/time)
- `egress-policy` (residency allowlist)
- `jobs-replay` (replay determinism)
- `app-sdk-examples` (compile/tests)
- Existing platform/security/quality/SLO gates remain required.

---

## Quickstart Commands

```bash
# Create & run a plugin locally
igctl app create my-enricher --lang ts --hook enrich.entity
pnpm dev --filter my-enricher
pnpm test --filter my-enricher

# Publish, sign, and verify
igctl app build my-enricher
igctl app publish my-enricher --sign
igctl app verify my-enricher.tgz

# Install from App Store (dry-run & apply)
igctl app install acme/ner-lite --dry-run
igctl app install acme/ner-lite --approve --tenant TENANT_A

# Jobs & automations
igctl jobs run orchestrations/jobs/freshness.yaml --dry-run
igctl jobs replay --since 1h

# Governance
make hooks-contract
make plugin-trust
make jobs-replay
```
````

---

## Review & Demo Script (Sprint Close)

1. **Scaffold to Running:** `igctl app create` → local run → tests green in under 10 minutes.
2. **Trusted Install:** Publish/sign; install via App Store; show scopes, SBOM, provenance; health turns green.
3. **Workflow Automation:** Trigger dataset-freshness watchdog → auto-promote/rollback through MC gates.
4. **Safety & Residency:** Plugin tries cross-region egress → blocked with explain(); approve path with step-up.
5. **Upgrade/Rollback:** Upgrade plugin adding a scope → dry-run shows diff → require approval → rollback works.
6. **Metering & Report:** Run workload; show per-plugin usage and weekly signed “Plugin Risk & Usage” report.

---

## Risks & Mitigations

- **Supply-chain risk from third-parties:** Strict trust policy, SBOMs, signer allowlists, and runtime sandbox caps.
- **Compat churn on hooks:** Semver + deprecation windows; contract tests; dual-run shims.
- **Runaway jobs/plugins:** Quotas, kill-switch, and auto-throttle; evidence packs for post-mortems.

---

## Definition of Done (27O)

- Sandboxed plugin runtime with signed manifests, enforced quotas, and egress/residency guards.
- Hooks documented and under contract tests; CI blocks unsafe changes.
- Workflow engine delivering deterministic, auditable jobs with replay & HITL.
- App SDKs + CLI scaffold produce a working plugin in ≤10 minutes; examples merged.
- App Store installs/upgrades/rollbacks with provenance, scopes, and risk disclosures.
- Six first-party plugins shipped and passing all gates; plugin trust and metering integrated into promotion.

```

```

````md
# Summit / Maestro Conductor — Sprint 27P “Federation, Clean Rooms & Secure Sharing”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Enable **privacy-preserving collaboration across graphs**. Ship multi-region **graph federation**, policy-scoped **cross-tenant sharing** via **clean rooms**, and **DP/K-anon** protections so organizations can join insights without exchanging raw data. Deliver audited data-use agreements (DUAs), reproducible federated queries, and performance that meets SLOs.

---

## North-Star Outcomes

1. **Cross-Graph Queries in <1.5 s p95:** Federated NL→Cypher returns results across ≥2 regions/tenants within budget, with constraint proofs.
2. **No Raw Data Leakage:** Clean room joins produce only approved aggregates/safe rows; leakage detector 0 misses on synthetic seeds.
3. **Audited Sharing:** Every shared dataset bound to a **DUA** with purpose/expiry/scope; all federated runs emit signed usage receipts.
4. **Policy by Construction:** Residency, purpose, and ABAC enforced end-to-end across parties; overrides require step-up + counter-sign.
5. **Reproducibility:** Federated queries/aggregations are pinned (dataset ids, policies, transforms) and re-runnable with identical hashes.

---

## Tracks & Deliverables

### A) Federation Control Plane (Regions & Tenants)

**Tasks**

- Define **federation registry**: participants, regions, capabilities, trust policy, key material.
- Broker service for **query routing** & **capability discovery** (schema dictionary excerpts, not raw schema).
- Heartbeats, health, and policy compatibility checks.

**Acceptance Criteria**

- A1: Two regions + two tenants register; health and compatibility green.
- A2: Incompatible policy or stale keys → federation disabled with explain().
- A3: Audit trail captures registry changes with signer identity.

**Artifacts**

- `services/federation/{registry,broker}/*`, `ops/reports/fed_health.json`, `security/policy/fed_trust.yaml`.

---

### B) Clean Room Execution (Privacy-Preserving Joins)

**Tasks**

- Isolated compute for **join-on-keys** with salted tokens, row-level ABAC filters, optional **K-anon/L-diversity/T-closeness** guards.
- Aggregation templates (counts, distincts, top-k, co-occurrence, lift) with DP noise (ε budget per DUA).
- **Result contract**: only aggregates/safe rows leave the clean room; raw rows require both parties’ step-up & case ID.

**Acceptance Criteria**

- B1: Synthetic seeds (PII/secrets) never appear in outputs without explicit dual-step-up.
- B2: DP & K-anon gates block unsafe outputs; explain() shows failing bucket(s).
- B3: Performance: 10M×10M hashed join finishes ≤ 90 s (batch); interactive aggregates p95 ≤ 1.5 s.

**Artifacts**

- `cleanroom/{executor,policies}/*`, `config/privacy/kanon_dp.yaml`, `tests/cleanroom/leakage.spec.ts`.

---

### C) Federated NL→Cypher & Explain

**Tasks**

- Planner extension: decompose NLQ into **shards** per participant; push down filters; collect aggregates.
- Explain shows per-participant path, constraints, residency proofs, DP budgets, and cost/scope receipt.
- Copyable CLI: `igctl fed run` with `--participants`, `--dua`, and `--dp-epsilon`.

**Acceptance Criteria**

- C1: p95 federated NLQ ≤ 1.5 s (interactive) for top templates; cold path ≤ 2.5 s.
- C2: Explain lists each participant’s constraints and DP consumption.
- C3: Attempts to request raw fields across parties → deny with remediation.

**Artifacts**

- `services/gateway/src/federation/planner/*`, `ui/components/FedExplain/*`, `cli/igctl/commands/fed.ts`.

---

### D) DUA Lifecycle & Usage Receipts

**Tasks**

- DUA object: purpose, fields/aggregates allowed, ε budget, residency, retention, expiry, signer identities.
- Receipt generation: dataset ids, policy digests, DP spend, query hash, signer fingerprints; cosign attestations.
- Revocation & expiry: DUAs auto-disable; receipts remain verifiable.

**Acceptance Criteria**

- D1: Creating/editing a DUA requires dual-signature; changes invalidate stale cached plans.
- D2: Every federated run emits a signed receipt; missing receipt blocks promotion.
- D3: Expired DUA blocks runs; override needs step-up + CAB label.

**Artifacts**

- `legal/DUA_TEMPLATE.md`, `services/federation/dua/*`, `tools/receipts/build.ts`.

---

### E) Differential Privacy & K-Anon Guards

**Tasks**

- Library implementing ε/δ accounting, composition, and per-query sensitivity bounds.
- K-anon/L-diversity checks with configurable k, l; safe fallback (bucketing/rounding).
- Metrics for DP spend and K-anon violations; dashboards + alerts.

**Acceptance Criteria**

- E1: DP accounting validated against gold tests; composition correct within tolerance.
- E2: Violations trigger safe fallback or block with explain(); operator can widen buckets.
- E3: Dashboards show DP spend per DUA/tenant; alerts on near-exhaustion.

**Artifacts**

- `privacy/dp/{accounting.ts,mechanisms.ts}`, `privacy/kanon/checks.ts`, `ops/dashboards/federation_privacy.json`.

---

### F) Secure Transport, Keys & Attestations

**Tasks**

- mTLS between participants with **key pinning**; rotate keys; attest binaries/images used in clean room.
- Envelope encryption for intermediate artifacts; short-lived URLs; delete on completion.
- Supply-chain verification on both sides (provenance match).

**Acceptance Criteria**

- F1: Tampered/unsigned clean-room image fails preflight; run denied.
- F2: Intermediate artifacts time out & purge; audit shows deletion events.
- F3: Key rotation drill succeeds without downtime; receipts reflect new keys.

**Artifacts**

- `security/federation/{mtls,rotation}/*`, `.github/workflows/fed-preflight.yml`.

---

### G) Billing, Quotas & Cost Sharing

**Tasks**

- Meter DP spend, compute minutes, and egress. Split-billing models: initiator-pay, proportional, or pre-arranged.
- Quotas per DUA; soft-limit degrade (coarser buckets), hard-limit block.
- Invoice lines with DUA id & receipt hashes.

**Acceptance Criteria**

- G1: Metering accuracy ±1% on synthetic workloads.
- G2: Soft-limit switches to coarse aggregates automatically; user notified.
- G3: Invoices/usage exports pass schema validation and include receipt links.

**Artifacts**

- `services/metering/federation/*`, `config/quotas_fed.yaml`, `tools/billing/dua_lines.py`.

---

## CI Gates (added/confirmed this sprint)

- `fed-health` (registry/broker compatibility)
- `cleanroom-leakage` (synthetic seeds must be blocked)
- `dp-kanon-tests` (accounting & anonymity checks)
- `fed-nlq-perf` (p95 interactive budgets)
- `dua-signed` (dual-signature + expiry)
- `fed-preflight` (attestations & mTLS)
- Existing security/provenance/quality/SLO gates remain required.

---

## Quickstart Commands

```bash
# Register participants
igctl fed register --tenant A --region us-west-2 --key keyA.pem
igctl fed register --tenant B --region eu-central-1 --key keyB.pem

# Create a DUA
igctl fed dua create --participants A,B --purpose "sanctions-risk"
  --fields "counts,topk" --epsilon 1.0 --kanon 20 --expires 2025-12-31

# Run a federated query
igctl fed run --dua DUA-123 --q "orgs linked to X since 2023 grouped by region with counts"
igctl fed explain --run RUN-456

# Receipts & audits
igctl fed receipt show RUN-456
igctl fed dua spend --id DUA-123
```
````

---

## Review & Demo Script (Sprint Close)

1. **Registration & Health:** Add two tenants/regions; show compatibility checks and signed registry entries.
2. **DUA & Run:** Create dual-signed DUA; execute federated NLQ; Explain shows per-participant constraints, DP budget, and receipts.
3. **Leakage Defense:** Attempt raw-field export across parties → blocked with explain(); enable dual step-up → restricted rows allowed; receipt emitted.
4. **DP/K-Anon Guard:** Query a small bucket → K-anon blocks; widen buckets or DP noise applied; results pass gates.
5. **Perf & Cost:** Show p95 ≤ 1.5 s for interactive template; run 10M×10M batch join; meter spend; generate invoice lines.
6. **Rotation & Attestation:** Rotate keys; preflight verifies attestation; re-run succeeds; receipts reference new keys.

---

## Risks & Mitigations

- **False sense of anonymity:** DP + K-anon used together; documented ε budgets; safe fallbacks; audits.
- **Policy mismatch across parties:** Compatibility checks + broker deny with explain; CAB-approved exceptions only.
- **Latency variance across regions:** Pushdown filters + partial aggregations + caching; async batch path for heavy joins.

---

## Definition of Done (27P)

- Federation registry/broker live with two regions and two tenants; compatibility & health validated.
- Clean room joins and aggregate templates shipped; DP/K-anon guards enforce privacy with dashboards and alerts.
- Federated NL→Cypher planner & Explain operational; p95 interactive ≤ 1.5 s on target workloads.
- DUA lifecycle (dual-sign, receipts, expiry) enforced; all runs emit verifiable usage receipts.
- Secure transport (mTLS, key rotation) and supply-chain attestations integrated; preflight blocks unsafe runs.
- Metering/quotas/invoicing for federation delivered; soft/hard limits behave as designed.

```

```

````md
# Summit / Maestro Conductor — Sprint 27Q “Temporal/Geo Intelligence, What-If Simulation & Playbooks”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Level-up time- and location-aware analysis. Ship native **temporal & geospatial** modeling (interval graphs, trajectories, region sets), **scenario simulation/what-if** with reproducible seeds, and **operational playbooks** that turn analyses into safe, auditable actions. Keep everything policy-guarded, explainable, and fast.

---

## North-Star Outcomes

1. **Time & Space First-Class:** Intervals, versions, trajectories, and region hierarchies are native types with indexes; NL→Cypher understands them.
2. **What-If in Minutes:** Analysts design a scenario, run it with seeded randomness, and compare to baseline with signed deltas in <10 minutes.
3. **Fast Maps/Timelines:** p95 for spatio-temporal queries ≤ 1.2 s in staging; tri-pane sync at ≤150 ms remains intact.
4. **Trustworthy Results:** Every simulation/export includes a manifest (dataset, policy, model, seed) and is reproducible bit-for-bit.
5. **Safe Playbooks:** One-click runbooks execute pre-approved actions (notify, tag, export to approved sinks) with policy proofs and easy rollback.

---

## Tracks & Deliverables

### A) Temporal Modeling (Intervals, Versions, Bitemporal)

**Tasks**

- Add interval & bitemporal support to canonical schema: `valid_time` and `system_time` with constraints.
- Versioned edges/nodes with `effective_from/to`; helpers for “as-of” queries.
- Index pack: composite indexes for (entity, time), (region, time), plus fast window scans.

**Acceptance Criteria**

- A1: “As-of” and “between” queries return correct results on gold fixtures.
- A2: p95 temporal window scan ≤ 300 ms on staging dataset.
- A3: NL→Cypher planner auto-injects time filters when present in NL.

**Artifacts**

- `schema/temporal/*.yml`, `services/gateway/src/nlq/time/*.ts`, `ops/query-plans/temporal.md`, tests & fixtures.

---

### B) Geospatial Modeling (Regions, Paths, Topology)

**Tasks**

- Region taxonomy (country→adm1→adm2), polygons/tiles, and topology ops (contains/intersects/within distance).
- Trajectory representation for moving entities; map-matching helpers; spatial indexes.
- Geo normalization (ISO codes, names, canonicalization) with cache.

**Acceptance Criteria**

- B1: Spatial predicates pass gold tests; CRS conversions correct.
- B2: p95 geospatial filter ≤ 350 ms; trajectory queries with map-match ≤ 700 ms.
- B3: Planner prefers indexed geo paths; denies unbounded polygon scans without hint.

**Artifacts**

- `schema/geo/*.yml`, `services/gateway/src/nlq/geo/*.ts`, `normalize/geo/*`, `ops/query-plans/geo.md`.

---

### C) Scenario Simulation & What-If Engine

**Tasks**

- Deterministic simulation kernel with seeded RNG; scenario spec (YAML) for shocks, delays, outages, parameter sweeps.
- Runners: local and MC job; outputs: metrics, deltas vs. baseline, confidence intervals.
- Comparison UI with “baseline vs. scenario” timelines and map overlays.

**Acceptance Criteria**

- C1: Same seed → identical outputs (hash match); different seed variance within bounds.
- C2: 10k-entity scenario completes ≤ 8 min; quick sims ≤ 60 s.
- C3: Manifest (`MANIFEST.json`) includes dataset id, policy digest, seed, model matrix; verify tool passes.

**Artifacts**

- `sim/{kernel,models}/*`, `scenarios/*.yaml`, `cli/igctl/commands/sim.ts`, `ui/sim/CompareView.tsx`, tests.

---

### D) NL→Cypher Upgrades for Time/Geo & “Why-Not”

**Tasks**

- NL parsing for temporal phrases (“since Q1 2024”, “last 90 days”, “between Jan–Mar”) and geo phrases (“near Denver”, “within 50 km”, “in EU27”).
- Counterfactuals: `why-not` suggests missing time/geo constraints or region mismatches.
- Safety: cap spatial unions; force hints for large free-text regions.

**Acceptance Criteria**

- D1: Temporal/geo NL accuracy ≥ 93% on gold set; zero wrong-region joins.
- D2: `why-not` yields actionable hints ≥ 80% on misses.
- D3: Safety suite blocks unbounded geo scans; explain shows required hints.

**Artifacts**

- `services/gateway/src/nl2cypher/{time,geo}_parser.ts`, `tests/nlq/gold_time_geo/*.jsonl`.

---

### E) Performance: Caches, Tiles & Windows

**Tasks**

- Server-side cursoring & windowed results for time/geo lists.
- Tile pyramid (vector tiles) for map pane; LOD rules; pre-computed hot tiles.
- Query result cache keyed by `(dataset, time window, region, purpose, seed?)`.

**Acceptance Criteria**

- E1: Map p95 render < 150 ms after first paint; tile cache hit ≥ 70% on pan/zoom.
- E2: Long list views never block UI; cursor paging < 200 ms per page.
- E3: Warm vs. cold curves reported; both within budgets.

**Artifacts**

- `services/api/tiles/*`, `ui/panes/Map/tiler.ts`, `cache/result_cache.ts`, perf reports.

---

### F) Playbooks & Safe Actions

**Tasks**

- Playbook DSL: trigger (query/sim result) → checks (policy/residency/budget) → actions (notify, tag, export to approved sink).
- HITL approval with WebAuthn; dry-run & rollback steps; evidence packs for each run.
- Library of guided playbooks (e.g., “data freshness dip”, “index hot path”, “quota near-limit”).

**Acceptance Criteria**

- F1: Playbook dry-run shows what would change; run emits signed evidence with ids and digests.
- F2: Unsafe actions blocked with explain; approval path audited.
- F3: Rollback restores pre-state in ≤ 2 minutes.

**Artifacts**

- `playbooks/*.yaml`, `services/jobs/playbook_runner/*`, `ui/ops/PlaybookRun.tsx`, `RUNBOOK-Playbooks.md`.

---

### G) Observability, Gold Sets & Scorecard

**Tasks**

- Gold datasets for time/geo and scenario correctness.
- Dashboards: time/geo p95, cache hit, tile render, scenario queue times.
- Weekly “Time/Geo & What-If Scorecard” posted Mondays 09:00 MT.

**Acceptance Criteria**

- G1: Gold pass rate ≥ 95%; failures auto-issue with repro.
- G2: Dashboards non-null; alerts for p95 regressions and cache drops.
- G3: Signed scorecard artifact attached to release notes.

**Artifacts**

- `tests/gold_time_geo/**`, `ops/dashboards/time_geo.json`, `.github/workflows/time-geo-scorecard.yml`.

---

## Required CI Gates (added/confirmed this sprint)

- `temporal-gold` (as-of/bitemporal correctness)
- `geo-gold` (spatial/topology correctness)
- `nlq-time-geo-accuracy` (≥93% on gold)
- `sim-repro` (seeded determinism + manifest verify)
- `map-perf` (tile render & pane sync budgets)
- `playbook-safety` (dry-run proofs; rollback)
- Existing policy/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Temporal & geo queries
igctl nlq run --q "orgs in EU27 with events in Q2 2025 near Berlin within 25km"
igctl nlq why-not --q "..." --expected "region=EU27,time=2025-Q2"

# Simulation
igctl sim run scenarios/outage.yaml --seed 4242 --compare baseline
igctl sim verify out/sim_4242.tgz

# Tiles & perf
make tiles-build && make tiles-warm
make map-perf-report

# Playbooks
igctl playbook dry-run playbooks/freshness.yaml
igctl playbook run playbooks/freshness.yaml --approve

# Scorecard
make time-geo-scorecard
```
````

---

## Review & Demo Script (Sprint Close)

1. **Temporal & Geo NLQ:** Run complex NL→Cypher with time + region; Explain shows paths, constraints, and indexes used.
2. **Scenario What-If:** Execute seeded scenario; open Compare view; show manifest verification and reproducible deltas.
3. **Performance:** Pan/zoom large map; verify ≤150 ms pane sync and tile cache hits; run time-window list with cursors.
4. **Safety & Playbooks:** Attempt unbounded polygon query → blocked with explain; run a playbook dry-run → approve → action executes; rollback works.
5. **Scorecard:** Open dashboards and weekly signed report; highlight wins and remaining regressions.

---

## Risks & Mitigations

- **Heavy polygon/trajectory queries:** Pre-tile + index + pushdown filters; deny unbounded scans with hints.
- **Simulation misuse/misinterpretation:** Require manifests, seeds, and confidence intervals; label outputs clearly; approval for actions.
- **Cache inconsistency across datasets:** Cache keys include dataset/version/time/region; invalidate on promotion or alias swap.

---

## Definition of Done (27Q)

- Temporal and geospatial types, indexes, and NL parsing shipped with gold pass ≥95% and NL accuracy ≥93%.
- Scenario simulation engine produces deterministic, signed outputs with Compare UI and verify tool.
- Tri-pane remains within latency budgets; map tiles & cursors keep UX snappy.
- Playbook DSL executes safe, audited actions with dry-run proofs and fast rollback.
- Weekly signed scorecard and dashboards live; CI gates enforce correctness and performance.

```

```

````md
# Summit / Maestro Conductor — Sprint 27R “Threat Intel Fusion, TTP Graphs & Actionable Signals”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Turn the platform into a first-class **Threat Intelligence fusion** engine. Land ATT&CK-aligned TTP graphs, indicator lifecycles, and trust/score models; wire entity-risk scoring, watchlists, and signal→playbook handoffs that are safe, explainable, and reversible. Deliver fast, policy-guarded workflows from ingest → fusion → risk → action.

---

## North-Star Outcomes

1. **TTP Graph Live:** ATT&CK-like tactics→techniques→procedures modeled with provenance; NL→Cypher understands TTPs & campaigns.
2. **Indicator Lifecycle & Trust:** IOCs (hash, IP, domain, email, cert, file, tool, infra) flow through **quality gates** with decay, hit-counts, and **source trust**; false-positive rate drops ≥40% on dogfood datasets.
3. **Entity Risk Scoring:** Per-entity risk score (0–100) with explainable contributors; p95 compute < 400 ms; alerts emit only when confidence ≥ threshold with policy proofs.
4. **Actionable Signals:** Watchlists + playbooks produce **auditable actions** (notify, tag, quarantine, ticket) with one-click rollback; 0 unreviewed P0 actions in staging.
5. **Performance & Safety:** End-to-end “IOC lands → alert decision” pipeline p95 ≤ 1.2 s; all exports respect residency/DLP; overrides require step-up + reason.

---

## Tracks & Deliverables

### A) TTP / Campaign Knowledge Model

**Tasks**

- Canonicalize Tactics, Techniques, Sub-techniques, Procedures, Capabilities, Campaigns, Threat Actors.
- Map connectors (STIX/TAXII/MISP/docs) into TTP graph with provenance & confidence.
- NL→Cypher synonyms & alias dictionary (“phishing”, “T1566”, “credential harvest”, etc.).

**Acceptance Criteria**

- A1: 95% mapping accuracy on gold TTP fixtures; ambiguous items flagged with explain().
- A2: NL→Cypher resolves TTP names/IDs/aliases; disambiguation prompt success ≥90%.
- A3: Campaign view shows linked IOCs, procedures, infra, and time span with dataset pinning.

**Artifacts**

- `schema/ttp/*.yml`, `schema/mappings/ttp/*.yaml`, `services/gateway/src/nlq/ttp_dict.ts`, `tests/gold_ttp/*.jsonl`.

---

### B) Indicator Lifecycle, Quality & Trust

**Tasks**

- IOC schema with fields: type, first/last seen, hits, decay, sources, confidence, trust tier (A/B/C), suppression reason.
- Quality gates: format validation, reputation check, dedupe, **conflict resolver** (same IOC, conflicting verdicts) → Bayesian/score fusion.
- Decay/refresh policy per type (e.g., IP hours/days, domains days/weeks, hashes long-lived).

**Acceptance Criteria**

- B1: False-positive rate on historical labeled set reduces ≥40%; precision ↑ ≥20% without recall loss >5%.
- B2: Conflicts resolved deterministically; explain() shows contributing sources & weights.
- B3: Decay applies on schedule; stale IOCs auto-archived; override logged.

**Artifacts**

- `services/ioc/lifecycle.ts`, `config/ioc_trust.yaml`, `tools/ioc/quality_report.py`, `tests/ioc_quality/*.spec.ts`.

---

### C) Entity Risk Scoring (Explainable)

**Tasks**

- Feature extractors: recent hits, proximity to TTPs, infra overlap, watchlist membership, geo/time anomalies, deception/honeytoken touches.
- Scoring model: weighted linear baseline + pluggable ML ranker; monotonic constraints on sensitive features.
- Explain panel + CLI: show top contributors with provenance & time window.

**Acceptance Criteria**

- C1: p95 risk compute ≤ 400 ms; cache hit ≥ 60% on repeated entities.
- C2: AUC ≥ 0.85 on labeled abuse/fraud dataset; calibration error ≤ 5%.
- C3: Explanations present for 100% of scores; no PII leakage.

**Artifacts**

- `services/risk/score.ts`, `models/risk_weights.json`, `ui/components/RiskExplain.tsx`, `tests/risk/*.yml`.

---

### D) Watchlists, Signals & Alert Decisions

**Tasks**

- Watchlist API: create/update with TTL, purpose, residency; bulk import/export with manifests.
- Signal engine: rules + thresholds + risk gates; dedup & suppression (cooldowns, jitter).
- Alert decisioning: confidence + severity rubric; link to playbooks from 27Q.

**Acceptance Criteria**

- D1: Duplicate/suppressed alert rate ≥ 50% reduction vs. baseline; missed-true-alerts ≤ 1%.
- D2: Alerts carry constraint proofs (policy, residency, DLP) and “Copy Repro”.
- D3: Bulk watchlist operations complete in ≤ 60 s for 100k entries; manifests verified.

**Artifacts**

- `services/signals/*`, `api/watchlists/*`, `ui/alerts/Detail.tsx`, `tests/signals/*.spec.ts`.

---

### E) Playbooks for Threat Response (Safe & Reversible)

**Tasks**

- Prebuilt playbooks: “IOC confidence upgrade”, “Quarantine dataset/connector”, “Open ticket + attach evidence”, “Notify tenants/partners”.
- HITL approval + WebAuthn step-up; dry-run diffs; rollback guaranteed.
- Evidence pack includes TTP chain, risk explainers, IOCs, receipts, policy digests.

**Acceptance Criteria**

- E1: Playbook dry-run → approve → action completes with signed evidence; rollback ≤ 2 min.
- E2: Attempted unsafe action (residency/egress) blocked with explain(); approved path audited.
- E3: 0 orphaned states after rollback in e2e tests.

**Artifacts**

- `playbooks/threat/*.yaml`, `ui/ops/PlaybookThreat.tsx`, `tools/evidence/pack_threat.ts`.

---

### F) Performance, Caching & Cost Controls

**Tasks**

- Fast path for IOC→entity→risk lookups; shardable caches by tenant/region.
- Vector + sparse hybrid for IOC→context retrieval; LRU/TTL tuned to hit ≥70%.
- Model/budget guards from 27E applied to risk computations (per-tenant caps).

**Acceptance Criteria**

- F1: End-to-end IOC ingest → alert decision p95 ≤ 1.2 s.
- F2: Cache hit ≥ 70% for hot entities; cold path stays ≤ 2.0 s p95.
- F3: Budget breach degrades gracefully (coarser features); no hard failures.

**Artifacts**

- `cache/risk_cache.ts`, `services/gateway/src/ioc/fastpath.ts`, perf dashboards.

---

### G) Governance, Ethics & Sharing Controls

**Tasks**

- Policy bundle for sharing: strip PII, redact sensitive attributes, enforce purpose; OFAC/export hooks on intel sharing.
- DUAs for partner intel exchange (ties to 27P); receipts reference shared IDs & trust scores.
- Red-team tests focused on threat-sharing abuse (poisoning, over-sharing, de-anonymization).

**Acceptance Criteria**

- G1: Sharing attempts without purpose/DUA blocked with localized explainers.
- G2: Poisoned intel detection (outliers, signer anomalies) triggers quarantine.
- G3: `redteam-threat-share` suite passes; 0 privacy leaks on synthetic seeds.

**Artifacts**

- `security/policy/intel_share.rego`, `services/federation/intel/*`, `safety/redteam/threat_share/*.yml`.

---

## CI Gates (added/confirmed this sprint)

- `ttp-mapping-gold` (≥95% mapping accuracy)
- `ioc-quality` (FP reduction & trust fusion thresholds)
- `risk-model-eval` (AUC & calibration)
- `signals-dedup` (suppression & cooldowns)
- `playbook-threat-safety` (dry-run proofs; rollback)
- `threat-share-policy` (DUA/purpose enforced; redteam suite)
- Existing policy/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# TTP & campaigns
igctl ttp import mappings/attack.yaml
igctl ttp show --technique T1566

# IOCs & quality
igctl ioc import feed.tgz --trust B
make ioc-quality-report

# Risk & alerts
igctl risk score --entity org:123 --explain
igctl signals test --rule rules/high_risk.yaml

# Watchlists & playbooks
igctl watchlist create --name "High-Risk Domains" --ttl 14d
igctl playbook dry-run playbooks/threat/quarantine.yaml
igctl playbook run playbooks/threat/quarantine.yaml --approve

# Sharing governance
igctl intel share --dua DUA-INTEL-1 --bundle out/ioc_sample.tgz
make redteam-threat-share
```
````

---

## Review & Demo Script (Sprint Close)

1. **TTP Graph:** Import ATT\&CK mappings; run NLQ “show campaigns using spearphishing attachments since 2024” → Explain shows TTP path & constraints.
2. **IOC Quality:** Ingest mixed-quality feed; view quality report; show FP down ≥40% after trust fusion/decay.
3. **Risk & Signals:** Score an org; open Risk Explain; fire an alert; prove dedup/suppression works; link to playbook.
4. **Playbook:** Dry-run quarantine → approve → evidence pack generated; rollback restores pre-state.
5. **Performance:** Live IOC→alert decision stays ≤1.2 s p95 with cache hit telemetry.
6. **Sharing Controls:** Attempt intel share without DUA (blocked) → add DUA → share; receipts & red-team suite green.

---

## Risks & Mitigations

- **Indicator Poisoning:** Signer reputation + anomaly detection + quarantine; dual-source requirement for high-impact actions.
- **Over-alerting:** Dedup, suppression windows, and precision-first thresholds; user-tunable but CAB-guarded.
- **Privacy/Residency Drift:** Policy proofs on every signal/export; DUAs + receipts; regular audits.

---

## Definition of Done (27R)

- TTP/Campaign model and NLQ dictionary live; ≥95% mapping accuracy on gold fixtures.
- Indicator lifecycle with trust/decay reduces FPs ≥40% while preserving recall (≤5% loss).
- Risk scoring explainable, fast (p95 ≤400 ms), and validated (AUC ≥0.85; well-calibrated).
- Signals & watchlists drive safe, auditable playbooks with zero orphaned states and fast rollback.
- End-to-end pipeline stays within latency budgets; caches & budgets guard costs.
- Sharing governed by DUAs with receipts; red-team threat-sharing tests pass and no privacy leaks observed.

```

```

````md
# Summit / Maestro Conductor — Sprint 27S “Executive Insights, Reporting & Data Products”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Turn curated graph knowledge into trustworthy, reproducible **reports, dashboards, and APIs**. Ship an **Insights Workbench** for analysts, **data products** (versioned, contract-tested APIs & extracts), and **governed reporting** with provenance manifests and privacy controls. Everything must be reproducible, signed, and safe to share.

---

## North-Star Outcomes

1. **Reproducible Briefs:** Any report/brief is reproducible bit-for-bit via a single command with a signed manifest (dataset, policy, versions, queries, visual encodings).
2. **Self-Serve Dashboards:** Executives get <5s p95 load dashboards (SLO cards, risks, provenance status) with drill-through to Explain.
3. **Data Products Ready:** Stable, versioned APIs/exports for top 6 productized datasets; contract-tested; backward compatible per semver.
4. **Safe-to-Share:** Privacy, residency, and DUA constraints enforced on all exports/reports with explainers; zero PII leaks in staging.
5. **Usage-Proven Value:** Telemetry shows ≥3 teams adopting data products; weekly adoption report signed and posted.

---

## Tracks & Deliverables

### A) Insights Workbench (Analyst → Brief/Report)

**Tasks**

- Markdown+query authoring with embedded `nlq`/Cypher blocks; render to HTML/PDF with Figures/Tables.
- Report manifest generator: dataset pins, query hashes, chart specs, policy digests, export receipts.
- “Copy Repro” button emits `igctl report build path/report.md`.

**Acceptance Criteria**

- A1: Same inputs → identical report hash (timestamps stripped), verified by `igctl report verify`.
- A2: Report renders ≤ 60s for 20+ queries and 10 figures (staging).
- A3: Broken provenance or unpinned dataset blocks build with actionable error.

**Artifacts**

- `workbench/{renderer,manifests}/*`, `ui/workbench/Editor.tsx`, `cli/igctl/commands/report.ts`, `docs/workbench.md`.

---

### B) Executive Dashboards (SLO, Risk, Provenance)

**Tasks**

- “Exec Overview” dashboard: SLO tiles (NLQ/ingest/export), cost budgets, policy/provenance health, top risks/signals.
- Drill-through: clicking a tile → Explain (with constraint proofs) or specific Grafana panels.
- Cached query layer with scheduled refresh; alert badges for stale tiles.

**Acceptance Criteria**

- B1: p95 load < 5s; stale badge shown if refresh > SLA.
- B2: Drill-through to Explain in ≤ 800 ms (cached).
- B3: A11y pass; dark/light parity.

**Artifacts**

- `ui/exec/Dashboard.tsx`, `services/insights/cache/*`, `ops/dashboards/exec_overview.json`.

---

### C) Data Products (APIs & Managed Exports)

**Tasks**

- Select top 6 “productized” datasets (e.g., Entities, Relationships, Campaigns, Provenance, Risk Scores, Lineage).
- Versioned REST/GraphQL endpoints with OpenAPI/SDL; Parquet/CSV managed exports; retention & residency tags.
- Contract tests & backward-compat gate; deprecation policy + migration guides.

**Acceptance Criteria**

- C1: v1.0 endpoints documented and deployed; `contract-tests` green.
- C2: Managed export job produces signed bundles with `MANIFEST.json` (dataset id, schema version, policy, DP/PII status).
- C3: Breaking change requires semver bump + migration guide; CI blocks otherwise.

**Artifacts**

- `services/data-products/{entities,relationships,campaigns,provenance,risk,lineage}/*`, `openapi/*.yaml`, `graphql/*.graphql`, `.github/workflows/data-product-contract.yml`, `docs/data-products.md`.

---

### D) Visualization Library & Explainability

**Tasks**

- Chart components (timeseries, bar/stack, heatmap, sankey for flows) with accessible tooltips and provenance chips.
- “Explain This Figure” panel: shows queries, filters, dataset pins, and policy gates used to render.
- Visual encodings catalog with defaults and style tokens.

**Acceptance Criteria**

- D1: All figures display a provenance chip; clicking opens explain panel ≤ 400 ms.
- D2: Exported PNG/PDF embeds figure manifest reference.
- D3: Axe CI: zero serious/critical violations.

**Artifacts**

- `ui/viz/{Timeseries,Bar,Heatmap,Sankey}.tsx`, `ui/viz/explain/*`, `ui/styles/viz_tokens.json`.

---

### E) Safety, Privacy & Residency for Reporting

**Tasks**

- Report-time DLP/redaction checks; unapproved PII fields blocked or masked; residency tags validated for all outputs.
- DUA-aware sharing for bundles; receipts linked from reports and exports.
- “Why blocked?” explainer with remediation (purpose, step-up, case ID).

**Acceptance Criteria**

- E1: Synthetic PII/secret seeds never appear in reports/exports; CI `report-leakscan` green.
- E2: Cross-region export without approval → blocked with explain(); approved path audited.
- E3: Receipts attached to every shared bundle; missing receipt blocks publish.

**Artifacts**

- `security/report/leakscan/*`, `services/exports/dua_hooks.ts`, `ui/components/WhyBlocked.tsx`.

---

### F) Adoption Telemetry & Weekly Insights

**Tasks**

- Instrument report builds, dashboard views, API/exports consumption with PII-safe analytics.
- Weekly “Data Products Adoption” report (tenants, teams, endpoints, error rates, ROI proxy).
- In-app “Rate this dashboard/report” feedback widget with optional context.

**Acceptance Criteria**

- F1: Event loss <0.1%; schema versioned; opt-outs respected.
- F2: Weekly adoption report posted Mondays 09:00 MT with signed artifact.
- F3: ≥3 internal teams consuming v1.0 APIs or managed exports in staging dogfood.

**Artifacts**

- `analytics/schema_insights.yaml`, `.github/workflows/adoption-report.yml`, `ops/reports/adoption_*.md`, `ui/feedback/Rating.tsx`.

---

### G) Packaging, Templates & Samples

**Tasks**

- Sample report pack: “Quarterly Insights,” “SLO & Cost Review,” “Risk & Provenance Snapshot.”
- Templates for common figures/sections; `igctl report init` scaffolds a brief.
- Example notebooks (Py/TS) calling data products with reproducible envs.

**Acceptance Criteria**

- G1: `igctl report init` → edit → build in ≤ 10 minutes.
- G2: Samples run green in CI; links validated; outputs signed.
- G3: Notebook envs (devcontainer) reproduce results on a clean runner.

**Artifacts**

- `samples/reports/**`, `cli/igctl/commands/report_init.ts`, `samples/notebooks/**`, `.devcontainer/insights/*`.

---

## CI Gates (added/confirmed this sprint)

- `report-repro` (bit-for-bit reproducibility & verify)
- `data-product-contract` (OpenAPI/GraphQL pact & semver guard)
- `report-leakscan` (no PII/secrets; residency/DUA enforced)
- `viz-a11y` (axe checks for figures)
- `exec-dash-perf` (p95 load < 5s; drill-through budget)
- `adoption-report` (weekly signed artifact)
- Existing policy/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Create and build a reproducible report
igctl report init --template quarterly_insights --out reports/Q3_2025.md
igctl report build reports/Q3_2025.md
igctl report verify out/Q3_2025.pdf

# Data products
igctl dp list
curl -s https://.../api/v1/entities?dataset=ds-... | jq .
igctl export run --product risk --format parquet --out out/risk_v1.tgz

# Exec dashboards (dev)
pnpm dev && open /exec

# Safety & residency
make report-leakscan
igctl export share out/risk_v1.tgz --dua DUA-INSIGHTS-1

# Adoption insights
make adoption-report
```
````

---

## Review & Demo Script (Sprint Close)

1. **Repro Brief:** Build the Quarterly Insights report; verify manifest and bit-for-bit reproducibility; open Explain for a figure.
2. **Exec Dashboard:** Load dashboard <5s; click SLO tile → Explain; confirm provenance chip and drill-through speed.
3. **Data Products:** Call v1.0 API & run a managed export; show signed `MANIFEST.json`; attempt breaking change → contract gate blocks.
4. **Safety & Sharing:** Insert synthetic PII → leakscan blocks report; fix → green; share bundle under DUA; receipts attached.
5. **Adoption:** Show weekly adoption report; three teams consuming data products; capture feedback via widget.

---

## Risks & Mitigations

- **Stale dashboards:** Scheduled refresh + stale badges; on-click refresh with backpressure guards.
- **Visual misinterpretation:** “Explain This Figure” with queries and assumptions; template guidance & units.
- **Contract drift:** Pact tests & semver enforcement; migration guides and deprecation windows.

---

## Definition of Done (27S)

- Insights Workbench produces signed, reproducible reports; verify tool green.
- Exec dashboards fast (<5s p95), accessible, and drill-through to Explain.
- v1.0 data products shipped (6 datasets) with contract tests and managed exports.
- Report/export safety gates (DLP, residency, DUA, receipts) enforced; zero leaks in staging.
- Adoption telemetry live; weekly signed adoption report posted; ≥3 teams using data products.

```

```

````md
# Summit / Maestro Conductor — Sprint 27T “Edge & Air-Gapped Ops, Mobile Field Kit & Offline Provenance”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Operate Summit reliably in bandwidth-constrained, **air-gapped** or intermittent-connectivity environments. Ship an **Edge Node** with offline ingest→normalize→enrich→sign pipelines, **store-and-forward** replication with conflict resolution, a **Mobile Field Kit** (Android/iOS + PWA) for capture & triage, and **offline provenance** so every artifact remains verifiable when reconnected. No data leaks; all syncs are signed, replayable, and policy-guarded.

---

## North-Star Outcomes

1. **Edge Self-Reliance:** Edge Node runs core pipelines without cloud access; p95 local ingest→enrich ≤ 900 ms; zero network hard dependency for critical paths.
2. **Trust When Offline:** All artifacts carry **offline provenance envelopes** (SBOM, policy digest, dataset pin); verification passes post-reconnect.
3. **Rock-Solid Sync:** Store-and-forward with **CRDT/OT** conflict resolution; **no duplicate or lost events** across power cycles; deterministic replay.
4. **Field-Ready UX:** Mobile Field Kit captures media + notes + geo/time safely, supports **offline policy checks**, and syncs within 30 s of connectivity.
5. **Air-Gapped Compliance:** Builds & updates delivered as signed OCI/USB bundles; **no accidental egress**; residency and DLP enforced at the edge.

---

## Tracks & Deliverables

### A) Edge Node Runtime & Packaging

**Tasks**

- Produce `summit-edge` image: orchestrator, connectors subset, normalize/enrich, local queue (NATS/SQLite-WAL), provenance signer.
- Single-binary option for rugged hardware (x86_64/ARM64); systemd units; health endpoints.
- Air-gap install via signed OCI tarball + SBOM; offline license/feature flags.

**Acceptance Criteria**

- A1: `summit-edge` cold boot to green in ≤ 90 s on ARM64 dev board.
- A2: `edge verify-provenance` passes on locally produced bundles with no network.
- A3: Attempted network egress to non-allowlisted domains → blocked & logged.

**Artifacts**

- `edge/runtime/*`, `edge/systemd/*`, `edge/installer/oci_bundle.tgz`, `RUNBOOK-Edge-Install.md`.

---

### B) Store-and-Forward Sync (Deterministic & Safe)

**Tasks**

- Local append-only log with **content-hash IDs**; resumable sync; backpressure.
- Conflict resolution: last-writer-wins + **CRDT set/map** for watchlists/labels; idempotent landing at cloud hub.
- Signed **Sync Receipts** (log span, object digests, policy version).

**Acceptance Criteria**

- B1: Power-cycle during ingest produces **no duplicates**, **no loss** (validated by hash inventory).
- B2: 48-hour backlog (100k items) drains in ≤ 30 min on reconnection; CPU ≤ 75% p95.
- B3: Each sync emits a signed receipt; tamper causes sync reject with explain().

**Artifacts**

- `edge/sync/{wal,crdt,receipts}/*`, `services/hub/sync/*`, tests & fixtures.

---

### C) Offline Provenance & Policy Gates

**Tasks**

- Embed provenance envelopes on device: dataset pin, policy bundle digest, transform SHAs, signer identity.
- Edge policy bundle loader with signature verification; **fail-closed** on invalid bundles.
- DLP/residency checks executed on edge; quarantines kept local until approved.

**Acceptance Criteria**

- C1: Envelopes verify post-reconnect; any mismatch blocks ingestion to cloud.
- C2: Edge won’t start with invalid/unsigned policy bundle; health reports actionable error.
- C3: Synthetic PII seeds never leave device without purpose + step-up; audited locally.

**Artifacts**

- `edge/provenance/*`, `edge/policy/loader.*`, `tests/offline_provenance.spec.ts`.

---

### D) Mobile Field Kit (Android/iOS + PWA)

**Tasks**

- Capture: photos/video/audio/text, auto-time/geo (with user consent), tag templates; offline forms.
- On-device pre-processing: compression, hashing, basic OCR, redaction (blur faces/PII) with **seeded RNG**; low-power mode.
- Sync UI: status, conflicts, receipts; “why blocked?” explainers.

**Acceptance Criteria**

- D1: Capture→sign→queue in ≤ 1.2 s p95 offline; battery drain ≤ target in 30-min test.
- D2: Redaction on-device before transmit; leakage tests green.
- D3: Sync within 30 s of connectivity with partial uploads & resume.

**Artifacts**

- `mobile/app/**` (React Native/Capacitor + PWA), `mobile/sdk/*`, `ui/mobile/SyncPanel.tsx`, `RUNBOOK-FieldKit.md`.

---

### E) Edge Observability & Remote Ops

**Tasks**

- Local metrics/logs; **outbox snapshot**; remote commands (rotate keys, update policy, trigger sync) via signed control channel.
- Edge → Hub heartbeat with inventory (queue depth, policy version, bundle digest).
- Offline diagnostics bundle (`edge diag collect`) PII-safe; QR/Bluetooth handoff option.

**Acceptance Criteria**

- E1: Heartbeats every 30 s; stale edge triggers alert in ≤ 2 min.
- E2: Remote policy/key rotation applied atomically with rollback; signed ack.
- E3: Diagnostics bundle < 50 MB; schema-valid & redacted.

**Artifacts**

- `edge/ops/heartbeat.*`, `tools/edge/diag.sh`, dashboards/alerts.

---

### F) Air-Gapped Update Channel & Supply-Chain

**Tasks**

- Delta update packs with cosign attestations + SBOM; **USB/SD install** workflow.
- Preflight validator on edge (image digests, policy trust, free space).
- Rollback plan & “canary edge” ring.

**Acceptance Criteria**

- F1: Update applies in ≤ 5 min; rollback in ≤ 90 s.
- F2: Preflight blocks unsigned or unexpected base; operator gets clear steps.
- F3: Canary ring soaks 24 h before fleet rollout; drift report generated.

**Artifacts**

- `edge/update/{delta,apply,rollback}/*`, `.github/workflows/edge-update.yml`.

---

### G) Edge-Aware Connectors & Pipelines

**Tasks**

- Edge variants for: **Docs**, **Camera/Media**, **Serial/Sensor**, **Local FS/USB**; normalization/enrichment profiles tuned for ARM.
- Policy-aware **Quarantine Queue** UI on device for manual review.
- Send-ahead **metadata only** mode for low bandwidth (hashes, dims, thumb) with later full sync.

**Acceptance Criteria**

- G1: Four connectors GA on edge with health & metrics; metadata-only works under 20 kbps.
- G2: Quarantined items never leave device; approval step requires step-up.
- G3: End-to-end edge pipeline meets local SLOs (see Outcomes).

**Artifacts**

- `edge/connectors/*`, `edge/quarantine/ui/*`, perf reports.

---

## CI Gates (added/confirmed this sprint)

- `edge-offline-provenance` (verify envelopes w/o network)
- `edge-sync-determinism` (no dup/loss; receipt match)
- `edge-policy-verify` (signed bundle required)
- `mobile-leakscan` (on-device redaction; no PII before sync)
- `airgap-update-preflight` (signature/SBOM checks)
- `edge-perf` (local SLOs; backlog drain target)
- Existing security/provenance/SLO gates remain required.

---

## Quickstart Commands

```bash
# Build & install Edge bundle (dev)
make edge-oci-bundle
igctl edge install --bundle edge/installer/oci_bundle.tgz --device /dev/ttyUSB0

# Run offline
igctl edge start
igctl edge policy load policy-bundle.tgz --offline
igctl edge verify-provenance --path /var/lib/summit-edge/outbox

# Sync & receipts
igctl edge sync --to hub://staging
igctl edge receipts show --last 5

# Mobile Field Kit (dev)
pnpm mobile:dev         # RN/Capacitor
pnpm mobile:test        # unit + leakscan

# Diagnostics & updates
igctl edge diag collect --out diag_edge.tgz
igctl edge update apply --delta edge_update_1.2.3.tgz
igctl edge update rollback
```
````

---

## Review & Demo Script (Sprint Close)

1. **Cold-Start Offline:** Boot `summit-edge` with no network; capture doc on Mobile; redaction→sign→queue; local explain shows policy proof.
2. **Power-Cycle Resilience:** Kill power mid-ingest; reboot; show no dup/loss; hashes reconcile.
3. **Store-and-Forward:** Reconnect to hub; backlog drains; signed Sync Receipt displayed; cloud provenance verifies.
4. **Air-Gapped Update:** Apply signed delta via USB; preflight/rollback demo; canary→fleet rollout plan.
5. **Remote Ops:** Rotate policy/keys from hub; edge applies atomically; heartbeat dashboards update.
6. **Low-Bandwidth Mode:** Metadata-only flow at 20 kbps; later full media sync; receipts match.

---

## Risks & Mitigations

- **Battery & Thermal on Mobile:** Adaptive sampling, background sync windows, hardware acceleration for OCR/blur.
- **Data Leakage over Ad-hoc Networks:** Strict egress allowlist; content hashed & redacted pre-transmit; receipts audited.
- **Clock Skew Offline:** Signed time beacons + monotonic counters; reconcile on reconnect.
- **Update Bricking:** Preflight, A/B slots, instant rollback; canary ring + drift reports.

---

## Definition of Done (27T)

- Edge Node runs core pipelines fully offline with local SLOs met; provenance envelopes verify after reconnect.
- Store-and-forward sync deterministic (no dup/loss) with signed receipts; 48-hour backlog drains within target.
- Mobile Field Kit captures/redacts/signs offline and syncs within 30 s of connectivity.
- Air-gapped updates delivered via signed bundles with safe preflight and fast rollback.
- Edge policy/DLP/residency enforced at source; metadata-only and quarantine flows behave correctly.
- CI gates for offline provenance, sync determinism, mobile leakscan, update preflight, and edge perf are green.

```

```

````md
# Summit / Maestro Conductor — Sprint 27U “Active-Active Multi-Region, Multi-Cloud & Zero-Downtime Everything”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Run Summit as a **globally resilient, active-active** service across regions and clouds with **zero-downtime** for deploys, schema changes, and failovers. Deliver portable infra blueprints, cross-cloud identity & policy, global traffic steering, and data replication that preserves provenance, residency, and consistency. Prove it live with chaos drills and user-visible SLOs that never dip.

---

## North-Star Outcomes

1. **Active-Active Read/Write:** Two+ regions (and ≥2 cloud providers) serving read/write with conflict-free convergence and p95 NLQ ≤ 1.0 s.
2. **Zero-Downtime Releases:** Blue/green or canary across regions: deploy, migrate, and roll back without user-visible errors or throttling.
3. **Blast-Radius ≤ 5%:** Any single region or cloud loss preserves availability (error budget hit ≤ 5% of hourly budget); RTO ≈ instant, RPO ≤ 30s.
4. **Portable by Construction:** One IaC source of truth (TF + Helm) per cloud; identical security/policy bundles; reproducible environments.
5. **Proof, Not Promises:** Scheduled chaos, failover, and migration drills produce signed evidence & dashboards; preflight gates block risk.

---

## Tracks & Deliverables

### A) Global Control Plane & Traffic Steering

**Tasks**

- Stand up **global front door**: Anycast/GSLB with health, latency, and residency-aware routing (per-tenant stickiness).
- Implement **region tokens** & **tenant affinity** headers; edge caches with SWR; fail-open rules for static artifacts only.
- Add **read replica** routing and **write quorum** policy per dataset class.

**Acceptance Criteria**

- A1: Active-active reads in two regions with ≤ 100 ms steering overhead; p95 NLQ ≤ 1.0 s.
- A2: Sticky tenancy respected; cross-region writes follow configured quorum or queue on partial outages.
- A3: Health flips steer traffic within 30 s; dashboards show region weight changes and SLO impact.

**Artifacts**

- `infra/global/{gslb,anycast}/*`, `services/gateway/src/region_affinity.ts`, runbooks & dashboards.

---

### B) Data Replication & Consistency (Graph, RDBMS, Object)

**Tasks**

- **CRDT/OT** for mutable metadata (labels, watchlists); **append-only** logs for facts with **Lamport**/Hybrid logical clocks.
- Asynchronous **provenance-preserving** replication (SBOM/policy digests carried); per-entity **residency fences**.
- Quorum/consistency levels per operation (RO default, RW with conflict resolution), idempotent upserts.

**Acceptance Criteria**

- B1: Conflicts converge deterministically; no lost updates under concurrent writes (gold suites).
- B2: RPO ≤ 30 s measured; backlog drain after 30 min partition ≤ 15 min.
- B3: Residency tags enforced; attempts to cross fence → denied with explain().

**Artifacts**

- `replication/{crdt,hlc,log}/*`, `services/replicator/*`, `tests/replication/*.spec.ts`.

---

### C) Zero-Downtime Schema & Index Migration

**Tasks**

- **Expand-Migrate-Contract** framework: dual-write shims, backfills with progress markers, online index builds, feature flags.
- Migration guard: estimate cardinality & runtime; throttle under load; automatic pause on SLO risk.
- Reversible migrations with snapshot/point-in-time and quick **roll-forward** path.

**Acceptance Criteria**

- C1: Two live migrations finish with **0 failed requests > 60 s** and no SLO breach.
- C2: Abort mid-flight → auto-pause; rollback clean in ≤ 2 min.
- C3: Manifest & evidence bundle attached to release with hash-verified steps.

**Artifacts**

- `orchestrations/migrate/*.yaml`, `tools/migrate/dualwrite.ts`, `RUNBOOK-ZDT-Migrations.md`.

---

### D) Multi-Cloud Blueprints & Policy Parity

**Tasks**

- Terraform modules for **AWS/GCP/Azure** baseline (network, KMS, registry, DB/graph, observability) with identical tagging & guardrails.
- **Policy bundle** parity: same OPA/ABAC, DLP, residency across clouds; preflight diff tool.
- Build/publish pipeline that emits **provider-specific OCI bundles** with identical SBOM/provenance.

**Acceptance Criteria**

- D1: Fresh bring-up on secondary cloud in ≤ 45 min to green health.
- D2: Policy diff tool shows **0 material differences**; any drift blocks promotion.
- D3: Image digests & SBOMs match across cloud-built artifacts (within base image allowlist).

**Artifacts**

- `deploy/terraform/{aws,gcp,azure}/*`, `security/policy/parity_check.ts`, `.github/workflows/multicloud_release.yml`.

---

### E) Cross-Region Identity, Keys & Secrets

**Tasks**

- Federated IdP with region-scoped claims; **step-up** bound to region and time.
- **BYOK per region** with automatic **key rotation**; KMS alias choreography; escrow & break-glass documented.
- Secret sync via envelope encryption; drift detector & alerting.

**Acceptance Criteria**

- E1: Access tokens validated in any region with correct scopes/purpose; misuse blocked.
- E2: Rotation in one region does not stall others; audit shows consistent state in ≤ 2 min.
- E3: Drift detector finds & reconciles secrets/keys; mismatches fail-closed.

**Artifacts**

- `services/auth/federation/*`, `crypto/byok/rotation_multi_region.md`, detectors & tests.

---

### F) Chaos, Failover & Guardrails (Continuous Verification)

**Tasks**

- Chaos suite: kill region, saturate link, add 200 ms latency, drop 3% packets, DB leader loss, index migration during traffic.
- **Push-button failover** runbook; automatic **brownout** shaping (limit heavy endpoints, prefer caches).
- SLO guard: promotion gate blocks if regional error budget < threshold or replication lag > budget.

**Acceptance Criteria**

- F1: Region loss: global error rate spike < 2% for ≤ 2 min; p95 recovers < 10 min; RPO ≤ 30 s.
- F2: Chaos drills produce signed **resilience report**; all alerts routed; AAR committed.
- F3: Promotion blocked on lag/error budgets; explain shows breach contributors.

**Artifacts**

- `tests/chaos/multiregion/*.sh`, `RUNBOOK-Failover.md`, dashboards & alerts.

---

### G) Zero-Downtime Releases & Canary Orchestration

**Tasks**

- Multi-region **canary waves** with automatic rollback on SLO/quality gates; tenant slicing; shadow traffic.
- **Traffic Mirroring** for NLQ hot paths; explain diff & latency delta guard.
- Post-deploy **confidence score** with signed artifact and PR comment.

**Acceptance Criteria**

- G1: Canary → GA in two regions with **0 customer-visible downtime**; rollback path proven.
- G2: Mirrored traffic shows ≤ 2% latency delta & no accuracy drop outside budget.
- G3: Confidence score ≥ threshold required for promotion.

**Artifacts**

- `orchestrations/canary/multiregion.yaml`, `tools/release/confidence.ts`, `.github/workflows/multiregion_canary.yml`.

---

## CI Gates (added/confirmed this sprint)

- `gslb-health` (routing, stickiness, failover)
- `replication-consistency` (CRDT/HLC convergence, RPO budget)
- `zdt-migration` (expand/migrate/contract with rollback)
- `policy-parity` (OPA/DLP parity across clouds)
- `multicloud-release-repro` (SBOM/provenance match)
- `keys-rotation-mr` (multi-region key/secret drift checks)
- `chaos-multiregion` (region loss & latency drills)
- `canary-confidence` (shadow diff & SLO gate)
- Existing security/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Global routing & health
make gslb-apply
make gslb-steer region=us-west-2 weight=70

# Replication & partitions
make replication-sim --partition=30m
make replication-report

# Zero-downtime migration
igctl migrate plan migrations/001_add_index.yaml
igctl migrate run --zdt
igctl migrate rollback

# Multi-cloud bring-up
make tf-apply cloud=gcp env=staging
make policy-parity --clouds aws,gcp,azure

# Keys & secrets
igctl key rotate --region us-west-2
make secrets-drift-detect

# Chaos & failover
make chaos-region-loss region=eu-central-1
make failover --to us-west-2

# Canary
make canary start --regions us-west-2,eu-central-1 --slice 5
make canary confidence && make canary promote
```
````

---

## Review & Live Demo (Sprint Close)

1. **Active-Active Read/Write:** Show traffic split across two regions; force health change; latency/SLO stay green.
2. **Partition & Convergence:** Inject 30-min partition; write in both regions; resolve; replication report shows deterministic convergence & RPO ≤ 30 s.
3. **Zero-Downtime Migration:** Run expand→migrate→contract online; pause/rollback mid-flight; no user errors.
4. **Multi-Cloud Bring-Up:** Create a fresh stack on a second cloud; policy parity check passes; artifacts’ provenance matches.
5. **Failover Drill:** Kill a region; global routing reacts <30 s; error spike <2% for <2 min; dashboards and AAR archived.
6. **Canary Waves:** Mirror hot NLQ; check accuracy/latency diff; confidence score ≥ threshold → promote; rollback path demonstrated.

---

## Risks & Mitigations

- **Split-Brain:** Use HLC/CRDT for safe classes; for strict entities, queue writes or require quorum.
- **Cross-Cloud Drift:** Policy parity & multicloud release repro gates; drift detectors fail-closed.
- **Hidden Latency Taxes:** Brownouts, cache priming, and route weights; perf SLO guards in canary.
- **Migration Surprises:** ZDT framework, dual-write shims, auto-pause on error budget burn.

---

## Definition of Done (27U)

- Two regions (multi-cloud) serving active-active with p95 NLQ ≤ 1.0 s and stickiness respected.
- Proven replication with deterministic convergence; RPO ≤ 30 s; backlog drain within budget.
- Zero-downtime migration framework executed live with rollback; no SLO breach.
- Portable IaC + policy parity across AWS/GCP/Azure; release artifacts reproducible with matching SBOM/provenance.
- Chaos/failover drills and canary orchestration green with signed evidence & AAR; promotion blocked by guards when needed.

```

```

````md
# Summit / Maestro Conductor — Sprint 27V “Ops Copilot, Guarded Agents & NL Runbooks”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Put a **safe, explainable Ops Copilot** in front of Summit: natural-language runbooks, guarded agents that can triage/diagnose/remediate, and human-in-the-loop (HITL) workflows with airtight policy, provenance, and rollback. Outcomes: **faster MTTR**, fewer escalations, and zero “mystery changes.”

---

## North-Star Outcomes

1. **MTTR ↓ ≥ 40%:** Copilot resolves or meaningfully narrows P1/P2s using playbooks and diagnostics within target SLOs.
2. **Guarded Autonomy:** Agents act only inside **policy sandboxes** with step-up + purpose; every action is replayable & reversible.
3. **NL Runbooks:** 80% of existing runbooks executable from natural language with deterministic plans and evidence packs.
4. **Trust & Explain:** Every suggestion/action shows constraints, data sources, and expected blast radius; **one-click rollback** ≤ 2 minutes.
5. **Zero Surprise Changes:** All agent actions emit signed manifests, link to receipts, and pass residency/DLP gates.

---

## Tracks & Deliverables

### A) Ops Copilot Core (Planner + Tools + Evidence)

**Tasks**

- Create **task planner** that converts NL intents → deterministic plans (diagnose → validate → remediate) using only approved tools.
- Tool adapters: logs/metrics queries, gate status, policy check, dataset alias swap, MC promote/rollback, feature flags.
- Evidence pack builder: inputs, commands, outputs, hashes, policy bundle digest.

**Acceptance Criteria**

- A1: Planner yields reproducible JSON plans (no hidden state); identical inputs → identical plans.
- A2: Tools restricted to allowlisted scopes; attempts outside sandbox → blocked with explain().
- A3: Evidence packs generated for 100% of plans; verification tool passes.

**Artifacts**

- `copilot/planner/*`, `copilot/tools/{metrics,logs,gates,mc,flags}.ts`, `tools/evidence/pack_ops.ts`.

---

### B) Guarded Agent Sandbox & Policy

**Tasks**

- Define **agent capability manifests** (scopes, rate limits, residency, change windows) signed & verified at runtime.
- Conversation firewall (ties to 27M) + **execution fences** (dry-run by default; require step-up to “apply”).
- Change window enforcement and CAB label for risky actions.

**Acceptance Criteria**

- B1: Unsigned/expanded scope manifests denied by loader; detailed reason emitted.
- B2: All “apply” paths require WebAuthn + purpose; audit includes diff and backout.
- B3: Rate limits & cooldowns prevent retry storms; chaos test proves fail-closed.

**Artifacts**

- `security/policy/agent_caps.yaml`, `services/copilot/sandbox/*`, tests + fixtures.

---

### C) Natural-Language Runbooks (NLR)

**Tasks**

- Compiler from markdown runbooks → **NLR graphs** (preconditions, steps, checks, rollback).
- Coverage pass for top 30 runbooks: migrations, cache warm, index build, SLO brownout, DR drill, ingestion backlog drain.
- “Why not runnable?” linter that flags missing preconditions or unsafe steps.

**Acceptance Criteria**

- C1: 80% of targeted runbooks compiled; `nlr-verify` green (determinism + rollback path).
- C2: NLR execution produces signed manifests and AAR templates on failures.
- C3: Linter blocks publish for unsafe or ambiguous steps.

**Artifacts**

- `runbooks/nlr/*.md`, `compiler/nlrc.ts`, `.github/workflows/nlr-verify.yml`.

---

### D) Diagnosis Graphs & Root-Cause Heuristics

**Tasks**

- Build **diagnosis graphs** mapping symptoms → hypotheses → tests (metrics, logs, traces, gates).
- Heuristics for common incidents (latency spikes, cache thrash, index drift, quota budget hits, policy failures).
- Confidence scoring + next-best-test recommendations.

**Acceptance Criteria**

- D1: On dogfood incidents, top-3 hypothesis contains true cause ≥ 85% of time.
- D2: Average diagnostic test count reduced ≥ 30% vs. manual baseline.
- D3: Explanations list tests, evidence, and rationale; no PII in traces.

**Artifacts**

- `diag/graphs/*.yml`, `diag/heuristics/*.ts`, `ui/ops/DiagnosisExplain.tsx`.

---

### E) HITL UX, Safety Switches & Rollback

**Tasks**

- “Ready to Apply” panel: shows plan, blast radius, checks passed, and rollback plan; requires step-up & reason.
- Live dry-run diffs; post-apply health watch with auto-rollback on guard breach.
- One-click rollback for every action; binds to receipts and dataset aliases.

**Acceptance Criteria**

- E1: HITL latency ≤ 1.5 s from approve → action; health watch triggers rollback in ≤ 2 minutes on breach.
- E2: Operator can annotate decisions; AAR seeds from evidence pack.
- E3: No orphaned state in 10k action replay test.

**Artifacts**

- `ui/ops/CopilotPanel/*`, `services/copilot/rollback/*`, `ops/aar/TEMPLATE.md`.

---

### F) Learning Loop & Safety Telemetry

**Tasks**

- Log plan outcomes, time to relief, and false-positive/negative suggestions; retrain diagnosis ranking weekly.
- Safety metrics: blocked actions by reason, near misses, override counts, step-up success rate.
- “Ops Copilot Scorecard” Mondays 09:00 MT (accuracy, MTTR deltas, safety incidents).

**Acceptance Criteria**

- F1: Weekly retrain emits signed `diag_weights.json`; promotion requires eval green.
- F2: Scorecard includes MTTR trend, action breakdown, and safety guard effectiveness.
- F3: Opt-out & privacy controls enforced; tenant-scoped aggregates only.

**Artifacts**

- `models/diag_weights.json`, `.github/workflows/copilot-scorecard.yml`, `ops/reports/copilot_scorecard_*.md`.

---

### G) Integrations: Chat, Tickets & Paging

**Tasks**

- Bi-directional integrations: Slack/Teams threads ↔ evidence packs, ServiceNow/Jira ticket lifecycle, PagerDuty incident context.
- Command handlers: `/copilot diagnose <symptom>` → thread with plan & buttons (dry-run/apply/rollback).
- Pact tests and rate-limit guards.

**Acceptance Criteria**

- G1: From chat, operators can run a dry-run and approve via step-up deep link.
- G2: Tickets auto-update with plan, receipts, and AAR link; no PII leaks.
- G3: Pact tests green; throttling prevents spam on incident storms.

**Artifacts**

- `integrations/{slack,teams,servicenow,jira,pagerduty}/*`, pact workflows, secrets docs.

---

## CI Gates (added/confirmed this sprint)

- `agent-policy` (cap manifests signed; scope deltas blocked)
- `nlr-verify` (determinism, rollback paths, lints)
- `diag-eval` (top-3 hypothesis ≥ 85%; test count reduction)
- `copilot-safety` (dry-run by default; step-up required; no egress violations)
- `rollback-replay` (10k actions; zero orphaned state)
- `integrations-pact` (chat/ticket/paging contracts)
- Existing security/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Plan & dry-run
igctl copilot plan "Latency spike in EU; check cache & indices" --dry-run
igctl copilot evidence --last 1

# Apply with step-up
igctl copilot apply --plan out/plan_001.json --reason "Brownout mitigation"

# Runbooks
igctl nlr compile runbooks/nlr/index_repair.md
igctl nlr run runbooks/nlr/index_repair.md --dry-run

# Diagnosis graphs
make diag-eval
igctl diag explain --incident INC-2025-09-123

# Rollback & receipts
igctl copilot rollback --action ACT-42
igctl receipts show --action ACT-42

# Scorecard
make copilot-scorecard
```
````

---

## Review & Live Demo (Sprint Close)

1. **From Symptom to Plan:** In Slack, `/copilot diagnose “ingest lag spike”` → diagnosis graph → plan with dry-run diffs and evidence pack.
2. **HITL & Apply:** Approve with step-up; health watch monitors; induced breach auto-rolls back; receipts and AAR created.
3. **NL Runbooks:** Convert an existing manual runbook; run end-to-end; show deterministic plan & rollback.
4. **Safety & Policy:** Attempt scope expansion → blocked with explain; try off-hours change → change-window deny; residency/DLP checks visible.
5. **Learning Loop:** Show scorecard (MTTR ↓ ≥ 40%), updated diag weights, and top false-positive fixes.
6. **Integrations:** Ticket auto-updates with evidence; PagerDuty context syncs; chat buttons trigger dry-run/apply/rollback.

---

## Risks & Mitigations

- **Over-automation / false confidence:** Default to dry-run; HITL approval; strict scopes; auto-rollback & evidence.
- **Prompt/plan drift:** Deterministic planner + signed manifests; weekly eval; quick rollback of weights and tools.
- **Tool sprawl:** Single registry with allowlists, scopes, and pact tests; capability review before publish.

---

## Definition of Done (27V)

- Ops Copilot plans are deterministic, policy-guarded, and emit evidence packs; HITL applies changes with one-click rollback.
- 80% of target runbooks compiled to NLR; `nlr-verify` green; unsafe steps blocked by linter.
- Diagnosis graphs achieve ≥85% top-3 hit on dogfood incidents; test count down ≥30%.
- MTTR reduced ≥40% on staged incidents; safety gates show zero unauthorized actions.
- Chat/ticket/paging integrations live with pact tests; no PII leaks; weekly signed scorecard posted.

```

```

````md
# Summit / Maestro Conductor — Sprint 27W “Model Governance, Eval Lab & Continual Tuning”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Establish **end-to-end model governance** for NL→Cypher, classification, NER, ER, risk scoring, and embeddings. Ship a **central Eval Lab**, golden datasets, drift detectors, data/label pipelines, safe fine-tuning/adapter upgrades, and a **model registry** with provenance and rollback. Target measurable quality wins with airtight safety and reproducibility.

---

## North-Star Outcomes

1. **Model Registry of Record:** Every model (foundation, embedding, classifier, reranker, planner ranker) versioned with SBOM/provenance; promotion requires green eval gates.
2. **Eval Coverage ≥ 95%:** Core tasks have gold/bronze tests with statistically powered evals; weekly signed scorecards auto-posted.
3. **Quality ↑ with Safety Intact:** At least **+3–7%** relative improvement on two key tasks (e.g., NL→Cypher accuracy, ER F1) with **no** safety regressions.
4. **Drift Caught Fast:** Online drift detectors flag data/model drift within **1 hour**; auto-shadow + canary workflows kick in.
5. **Repro & Rollback:** Any promoted model can be reproduced bit-for-bit; rollback completes ≤ 2 minutes with cached artifacts.

---

## Tracks & Deliverables

### A) Model Registry, Artifacts & Trust

**Tasks**

- Create `model-registry` with metadata: name, task, dataset pins, training config, hyperparams, tokenizer, SBOM, signatures, lineage.
- Cosign attestations for models; store training/inference manifests; produce “Repro Recipe”.
- CLI: `igctl model {register,promote,rollback,attest,provenance}`.

**Acceptance Criteria**

- A1: All production models registered with complete metadata and signatures.
- A2: Repro recipe rebuilds a model artifact with **identical hash** on two runners.
- A3: Promotion blocked if provenance or SBOM missing; explain shows required fields.

**Artifacts**

- `services/model-registry/*`, `schemas/model_card.json`, `cli/igctl/commands/model.ts`.

---

### B) Eval Lab (Datasets, Harness, Power)

**Tasks**

- Define task suites: **NL→Cypher**, **ER/Linking**, **NER/PII**, **Rerank/Retrieval**, **Risk Scoring**, **Summaries/Explain**.
- Gold (adjudicated) + Bronze (telemetry-derived) sets with stratification (time, geo, domain, sensitivity).
- Eval harness: bootstrap CI for significance tests, calibration curves, cost/latency tracking.

**Acceptance Criteria**

- B1: Gold sets labeled with κ ≥ 0.8; privacy/risk filters applied.
- B2: Harness emits signed report with deltas, p-values, and guard checks.
- B3: Eval runtime ≤ 20 min per suite on CI runners; caching enabled.

**Artifacts**

- `eval/{tasks,fixtures}/*`, `.github/workflows/eval-lab.yml`, `ops/reports/model_eval_*.md`.

---

### C) Drift Detection & Shadow/Canary

**Tasks**

- Data drift: PSI/JS-divergence on feature/label dists; Model drift: error/latency deltas vs. rolling baseline.
- Auto-shadow new models on **5–10%** traffic; capture blinded comparisons; promote only if thresholds met.
- Canary with tenant slicing; fallback/rollback on breach.

**Acceptance Criteria**

- C1: Detectors flag synthetic drifts within **≤ 1h**; alerts route to Owners.
- C2: Shadow shows statistically significant improvement before canary proceeds.
- C3: Canary rollback ≤ 2 min; receipts logged.

**Artifacts**

- `services/drift/{data,model}_detectors.*`, `orchestrations/canary/models.yaml`, dashboards & alerts.

---

### D) Safe Training & Fine-Tuning (Adapters/LoRA)

**Tasks**

- Training pipelines (LoRA/adapters) for **reranker, NER, ER rules+ML**, planner ranker; DP-aware sampling; contamination checks.
- Red-team during training (prompt-leak, unsafe patterns); DLP on corpora; dataset cards with licenses & sources.
- Cost caps + timeouts; resumable checkpoints; deterministic seeding.

**Acceptance Criteria**

- D1: No contamination with production eval/gold; checkers green.
- D2: Training manifest includes dataset hashes, seeds, hyperparams; reproducible.
- D3: Run fails-closed on budget breach; partial checkpoints usable.

**Artifacts**

- `train/{reranker,ner,er,planner}/*`, `tools/dataset_card_gen.py`, `security/train/dlp_rules.yml`.

---

### E) Multilingual & Domain Adaptation

**Tasks**

- Add multilingual coverage (EN + top 4 locales) for NER/NL→Cypher parsing and retrieval synonyms.
- Domain adapters: finance, sanctions, geopolitics; plug into retrieval/planner dictionaries.
- Language/locale auto-detect with safety fallbacks (restrictive policy if low confidence).

**Acceptance Criteria**

- E1: +5% F1 NER on non-EN gold; NL→Cypher accuracy ≥ 92% on non-EN subset.
- E2: Retrieval recall uplift ≥ 10% in domain suites; no latency > +10% budget.
- E3: Low-confidence locale → safe fallback path with explain.

**Artifacts**

- `models/adapters/{lang,domain}/*`, `schema/dictionaries/{multilang,domain}.json`.

---

### F) Inference Optimization & Guarded Runtime

**Tasks**

- Dynamic routing: small/large model cascade, cache, and early-exit; quantized embeddings where safe.
- Guarded decoding: stop-sequences, constrained grammars for NL→Cypher; toxicity/PII filters inline.
- Perf/Cost telemetry per request; knobs in policy for budgets.

**Acceptance Criteria**

- F1: p95 latency **−15%** on NLQ path at equal/↑ accuracy; cost/1k NLQ **−10–20%**.
- F2: Grammar/constrained decode yields **0** invalid Cypher on gold tests.
- F3: Safety filters add < 10 ms p95; no leakage regressions.

**Artifacts**

- `services/inference/router.ts`, `nl2cypher/grammar.json`, `security/runtime/filters.ts`.

---

### G) Governance: CAB, Ethics & Licenses

**Tasks**

- Model CAB process: risk tiers, sign-off matrix, and exception handling.
- License compliance: training/weights/adapter licenses verified; export controls flags.
- Public “Model Cards” (private fields redacted) in Trust Center.

**Acceptance Criteria**

- G1: Promotions have CAB label & signatures; exceptions tracked w/ expiry.
- G2: License scanner green; export-controlled flags block share/export.
- G3: Model Cards published with metrics, data notes, and limitations.

**Artifacts**

- `ops/cab/model_cab.md`, `tools/license/scan_models.py`, `trust-center/models/*`.

---

## CI Gates (added/confirmed this sprint)

- `model-provenance` (registry entry, SBOM, signatures)
- `eval-gates` (gold pass & safety; significance thresholds)
- `drift-detectors` (synthetic drift within 1h)
- `train-dlp-contam` (no contamination; DLP pass)
- `grammar-cypher-valid` (0 invalid Cypher)
- `canary-model-confidence` (shadow→canary thresholds; rollback)
- Existing policy/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Register & attest a model
igctl model register --name reranker-v3 --task rerank --artifact out/reranker_v3.tgz --sbom sbom.json --sign
igctl model attest --name reranker-v3

# Run evals
make eval-nl2cypher
make eval-ner
make eval-er
make eval-rerank

# Shadow & canary
igctl model shadow --name reranker-v3 --slice 10
igctl model canary --name reranker-v3 --tenants A,B
igctl model rollback --name reranker-v3

# Drift & telemetry
make drift-sim data
make drift-sim model
make eval-scorecard

# Training (adapters)
make train-reranker ADAPTER=lora_v1 SEED=4242
make train-ner MULTI_LANG=1
make train-planner-ranker

# Inference routing
make inference-router-report
```
````

---

## Review & Demo Script (Sprint Close)

1. **Provenance First:** Register new reranker; show SBOM/provenance; rebuild on second runner → identical hash.
2. **Eval Lab:** Run NL→Cypher + NER + ER suites; show signed report with deltas and p-values; safety checks green.
3. **Shadow→Canary:** Shadow on 10% traffic; uplift significant; canary two tenants; induce regression → auto-rollback in <2 min.
4. **Drift Alert:** Inject synthetic distribution shift; detector fires <1h; dashboard & alert demo.
5. **Training Hygiene:** Start adapter training with DLP + contamination checks; resume from checkpoint; manifest captured.
6. **Inference Wins:** Turn on cascade + constrained decode; show −15% p95 latency and **0 invalid Cypher**; cost per 1k NLQ down.

---

## Risks & Mitigations

- **Silent Contamination:** Automated overlap checks vs. eval/golds; strict dataset cards; CAB review.
- **Metric Gaming:** Multiple orthogonal metrics (accuracy, calibration, latency, safety); require significance; freeze seeds.
- **Cost Creep:** Router budgets, cache, quantization; model offload by domain/locale.
- **License/Export Issues:** Scanner + blocklists; Trust Center disclosures; CAB exceptions with expiry.

---

## Definition of Done (27W)

- All production models registered with SBOM/provenance; reproducible builds verified.
- Eval Lab operational with gold/bronze suites; weekly signed scorecards posted.
- Two key tasks improved (≥3–7% relative) with no safety regressions; latency/cost budgets respected.
- Drift detectors & shadow/canary workflows active; rollback <2 min; receipts logged.
- Training pipelines reproducible, DP/DLP-guarded; grammar-constrained NL→Cypher emits **0 invalid queries** on gold.
- Model CAB & license compliance enforced; Model Cards published in Trust Center.

```

```

````md
# Summit / Maestro Conductor — Sprint 27X “Zero-Trust Networking, Host Hardening & Supply-Chain Assurance”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Make the runtime **provably hostile-resilient**. Enforce zero-trust across services and users (identity-bound, purpose-scoped, least-privilege), harden hosts with eBPF controls and immutable baselines, and close the build/run **supply-chain loop** (attestations → runtime verify). End state: default-deny networking, secretless auth, signed-only code, drift caught automatically, and push-button evidence.

---

## North-Star Outcomes

1. **Default-Deny Network:** Every service→service and user→service hop authenticated (mTLS) and authorized (OPA/ABAC), with micro-segmented policies and no plaintext in cluster.
2. **Secretless by Default:** Workloads use workload identity (SPIFFE/SPIRE or equivalent) for credentials; long-lived secrets eliminated; just-in-time (JIT) short-lived creds only.
3. **Hardened Hosts:** eBPF LSM rules, syscall allowlists, and immutable baselines (dm-verity/IMA) prevent unknown binaries and sensitive syscalls.
4. **Signed-Only Supply Chain:** Images, charts, and configs shipped with SBOM + provenance; **admission controllers verify** signatures and policy before run.
5. **Continuous Proof:** Dashboards and signed reports show zero-trust posture, host integrity, and supply-chain compliance; drift auto-quarantined.

---

## Tracks & Deliverables

### A) Identity-Bound Mesh (mTLS + SPIFFE + OPA)

**Tasks**

- Issue SPIFFE IDs for services; sidecars/ambient mesh for mTLS; rotate SVIDs ≤ 24h.
- Author service-to-service **ABAC policies** (purpose, tenant, residency); default-deny + explicit allow.
- Add `x-purpose`, `x-tenant`, `x-dataset` headers w/ cryptographic bind; enforce at gateway + mesh.

**Acceptance Criteria**

- A1: 100% of in-cluster traffic uses mTLS with valid SVID; plaintext → blocked and alerted.
- A2: Policy test kit proves deny by default; only approved edges pass.
- A3: Header binds verified on 3 sample paths; tamper → deny with explain().

**Artifacts**

- `mesh/spiffe/*`, `security/policy/mesh.rego`, `tests/mesh/policy/*.spec.ts`.

---

### B) Secretless Auth & JIT Access

**Tasks**

- Replace static DB/API creds with workload identity federation (cloud IAM, database IAM auth).
- Build JIT broker for human ops (WebAuthn, purpose, TTL, scope); audit and auto-revoke.
- Kill long-lived kube and cloud keys; rotate residual secrets; add canary detectors.

**Acceptance Criteria**

- B1: 0 production static creds for services; exceptions documented with expiry.
- B2: Human JIT flows < 60 s end-to-end; all actions carry case ID + receipts.
- B3: Canary leaks trigger revocation ≤ 60 s and notify SecOps.

**Artifacts**

- `services/jit/*`, `security/credentials/inventory.csv`, runbooks + detectors.

---

### C) Host & Container Hardening (eBPF, IMA, MAC)

**Tasks**

- eBPF LSM: syscall allowlists per service class; deny ptrace/unshare/mprotect(X) unless whitelisted.
- Immutable root (dm-verity) or IMA appraisal for nodes; kernel lockdown where supported.
- Container hardening: seccomp, AppArmor/SELinux profiles; read-only FS + tmpfs scratch.

**Acceptance Criteria**

- C1: Unknown binary exec or disallowed syscall → blocked & logged; no false positives on smoke.
- C2: IMA attest on nodes passes; drift triggers cordon & quarantine.
- C3: 100% workloads run with hardened profiles; exceptions carry CAB label.

**Artifacts**

- `hardening/ebpf/*`, `hardening/ima/*`, `k8s/security/profiles/*`, tests.

---

### D) Signed-Only Supply Chain (SLSA + Admission)

**Tasks**

- Enforce **cosign** verification for images/charts/manifests with trusted keys; attach SBOM + SLSA provenance.
- Admission controller rejects unsigned/unknown-key artifacts; verify base image allowlist.
- Runtime verifier periodically re-checks signatures and SBOM drift.

**Acceptance Criteria**

- D1: Unsigned or mismatched digest → admission **deny** with human-readable explain.
- D2: SBOM diff on running pods triggers alert + optional restart with approved image.
- D3: Release pipeline fails on missing attestations; artifacts reproducible across two runners.

**Artifacts**

- `admission/policy/*`, `.github/workflows/supplychain.yml`, `security/trust/trust-policy.yaml`.

---

### E) Perimeter & Runtime Shielding (WAF/RASP/eBPF Net)

**Tasks**

- Layer-7 WAF for gateway with schema-aware allowlists; rate-limit anomalies; geo/residency guards.
- Lightweight RASP hooks for high-risk endpoints (query builders, uploads); sanitize/taint tracking.
- eBPF network tap for exfil/port-scan detection; honeyports for deception telemetry.

**Acceptance Criteria**

- E1: Known injection/exfil test corpus → 0 passes; false positives < 1% on dogfood.
- E2: RASP denies unsafe payloads and logs taint trace; HITL override audited.
- E3: Honeyport hits page on-call < 10 s with full trail.

**Artifacts**

- `gateway/waf/*`, `runtime/rasp/*`, `observability/ebpf-net/*`, tests + dashboards.

---

### F) Posture, Drift & Quarantine Automation

**Tasks**

- Posture engine: evaluate mesh, creds, hardening, signatures against target baselines.
- Drift detectors: network policy expansion, RBAC widen, node taint changes, image provenance mismatch.
- Quarantine automations: cordon node, isolate namespace, freeze promotion, require CAB to unquarantine.

**Acceptance Criteria**

- F1: Hourly posture report (signed) with pass/fail and remediation links.
- F2: Drift → quarantine in ≤ 2 minutes; rollback instructions auto-generated.
- F3: False quarantine rate < 0.5% weekly.

**Artifacts**

- `posture/engine/*`, `detectors/drift/*`, `playbooks/security/quarantine.yaml`.

---

### G) Evidence, Audits & Trust Center Hooks

**Tasks**

- “Zero-Trust Evidence Pack”: mesh cert map, policy graphs, host attest, SBOM set, admission logs, drift events.
- Export minimal proofs to Trust Center; private portal for detailed evidence under NDA.
- Quarterly red-team drill specifically on zero-trust bypass & supply-chain poisoning.

**Acceptance Criteria**

- G1: Evidence pack builds in < 5 min and verifies on clean runner.
- G2: Trust Center pages auto-update without PII; link integrity checks pass.
- G3: Red-team drill artifacts attached; at least 3 remediations merged.

**Artifacts**

- `tools/evidence/zero_trust_pack.sh`, `trust-center/zero-trust/**`, `safety/redteam/ztbypass/*.yml`.

---

## CI Gates (added/confirmed this sprint)

- `mesh-mtls` (100% mTLS, SVID rotation, plaintext deny)
- `mesh-abac` (default-deny; approved edges only)
- `jit-secretless` (no static creds; JIT paths green)
- `host-ima-ebpf` (IMA attest; syscall policy)
- `supplychain-signed` (cosign verify; SBOM present)
- `waf-rasp-efficacy` (attack corpus blocked; <1% FP)
- `posture-drift` (drift→quarantine SLA)
- Existing security/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Mesh & policy
make mesh-issue-svid
make mesh-policy-test

# Secretless & JIT
igctl jit request --role dba.read --ttl 20m --purpose "perf triage"
make creds-inventory && make creds-kill-longlived

# Host hardening
make ebpf-load policy=services/api
make ima-attest
make seccomp-apply profile=baseline.json

# Supply chain
make supplychain-sign
make admission-test unsigned=true
make sbom-diff namespace=prod

# Perimeter/runtime shielding
make waf-test corpus=attacks
make rasp-smoke
make ebpf-net-scan-sim

# Posture & evidence
make posture-report
make drift-sim rbac_widen
make evidence-zero-trust
```
````

---

## Review & Live Demo (Sprint Close)

1. **mTLS Everywhere:** Show plaintext attempt → deny; valid SVID path → success; ABAC explains allow.
2. **Secretless JIT:** Remove static creds; request JIT database access; TTL expiry auto-revokes; audit trail visible.
3. **Host Hardening:** Run unknown binary → IMA blocks; disallowed syscall caught by eBPF; workload continues healthy.
4. **Signed-Only Runtime:** Deploy unsigned image → admission deny; fix with cosign; SBOM diff detects drift.
5. **Shielding:** Replay attack corpus; WAF/RASP block with explain; eBPF net detects scan + honeyport alert.
6. **Drift→Quarantine:** Expand RBAC in a PR → detector fires; namespace isolated; CAB approves fix → unquarantine.
7. **Evidence:** Generate zero-trust evidence pack; verify on clean runner; Trust Center shows updated posture.

---

## Risks & Mitigations

- **Over-restrictive policies:** Staged default-deny with shadow logs; progressive tighten; emergency break-glass with short TTL.
- **Host incompatibility:** Start with soft-block/observe; roll to enforce per service class; clear rollback.
- **Key/Cert sprawl:** Rotate frequently; central inventory; alarms on near-expiry; standardized trust policy.
- **FPs in WAF/RASP:** Schema-aware allowlists, canaries, and quick disable under HITL with audit.

---

## Definition of Done (27X)

- 100% in-cluster traffic mTLS + SPIFFE with ABAC default-deny; no plaintext permitted.
- Secretless service auth; human access via JIT only; static creds removed or time-boxed with expiry.
- Hosts & containers hardened (IMA/eBPF/seccomp) with evidence; unknown binaries/syscalls blocked.
- Supply-chain admission enforces signatures + SBOM; runtime SBOM drift monitored and actionable.
- Perimeter/runtime shielding stops attack corpus with <1% false positives.
- Posture engine + drift→quarantine automation live; signed evidence packs and Trust Center updates in place.

```

```

````md
# Summit / Maestro Conductor — Sprint 27Y “Performance, Cost & Carbon: Token Efficiency, Smart Caching, and Budget Guardrails”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Drive **double-digit** reductions in latency, infra spend, and embodied carbon without sacrificing accuracy or safety. Ship token/compute efficiency across NLQ → retrieval → inference, multi-layer caching, workload shaping, hot-path micro-optimizations, and **budget guardrails** that fail-gracefully. Produce signed evidence of wins.

---

## North-Star Outcomes

1. **Latency:** −20% p95 on NLQ end-to-end; −25% p95 on ingest→normalize hot path.
2. **Cost:** −18% cloud spend for equivalent workload; −25% tokens/1k NLQ with equal/↑ accuracy.
3. **Cache:** ≥70% hit rate on hybrid result cache (retrieval + plan + figure); cold→warm delta ≤ 35%.
4. **Carbon:** Instrumented **kgCO₂e/1k ops**; −15% vs. last sprint; region/instance mix optimized within residency.
5. **Safety & Quality:** Zero accuracy or safety regressions; explainers show what changed (and why).

---

## Tracks & Deliverables

### A) Token/Compute Efficiency (Router, Prompts, Grammars)

**Tasks**

- Router cascade tuning: small→large model with early-exit & reuse of retrieval embeddings.
- Prompt compaction (schema hints, few-shot pruning) + structured **grammar decoding** (NL→Cypher).
- Embedding quantization where safe; shared vector cache with TTL keyed by `(text, locale, dataset)`.

**Acceptance Criteria**

- A1: Tokens/1k NLQ **−25%** with **0 invalid Cypher** on gold.
- A2: Router p95 latency **−15%** on NLQ path; accuracy parity within ±0.5 pp.
- A3: Embedding cache hit ≥ 60%; quantization adds < 5 ms p95.

**Artifacts**

- `services/inference/router.ts`, `nl2cypher/prompt_short.yaml`, `nl2cypher/grammar.json`, `vector/cache/*`.

---

### B) Multi-Layer Caching (Query, Plan, Figure)

**Tasks**

- **Query result cache** with purpose/tenant/residency keys; partial-window stitching for time series.
- **Plan cache** for NL→Cypher (normalized NLQ + schema hash); invalidation on schema/policy bump.
- **Figure cache** for Workbench/Dashboards (spec + inputs + provenance hash).

**Acceptance Criteria**

- B1: Global cache hit ≥ 70% on dogfood; stale-while-revalidate ≤ 300 ms.
- B2: Invalidation correct on promotion/residency change; no stale-policy leaks.
- B3: Figure re-render < 150 ms when cached.

**Artifacts**

- `cache/{result,plan,figure}/*.ts`, `cache/keys.md`, tests & perf reports.

---

### C) Hot-Path Optimizations (Graph, API, UI)

**Tasks**

- Graph: index advisors, compressed adjacency, batched reads, hedged replicas.
- API: HTTP/2 multiplexing, gzip/br, ETag/If-None-Match, streaming for long lists.
- UI: virtualized lists, minimal hydration, pre-warm tri-pane tiles.

**Acceptance Criteria**

- C1: NLQ end-to-end p95 **−20%**; 99th **−15%**.
- C2: Ingest→normalize p95 **−25%** on 500k docs backfill.
- C3: Tri-pane time-to-interactive −15%; no input jank (FID ≤ 100 ms).

**Artifacts**

- `ops/query-plans/opt/*`, `services/api/http2/*`, `ui/perf/*`, profiles before/after.

---

### D) Budget Guardrails (Tokens, CPU, Cost)

**Tasks**

- Per-tenant budgets for tokens/CPU/storage; soft-degrade ladders (e.g., smaller model, coarser bins).
- Real-time **cost estimator** per request with upfront budget check + “why degraded” explainer.
- PR comment bot posting budget impact deltas (build/test/deploy).

**Acceptance Criteria**

- D1: Hard-limit blocks with explain() + one-click request for temporary increase (HITL).
- D2: Soft-degrade preserves task success ≥ 95% on dogfood.
- D3: PR bot comments on 100% perf-relevant PRs with computed cost deltas.

**Artifacts**

- `services/budgets/*`, `ui/components/BudgetExplainer.tsx`, `.github/workflows/cost-bot.yml`.

---

### E) Carbon Accounting & Region/Instance Optimization

**Tasks**

- Per-request **kgCO₂e** estimates (region grid intensity + instance profile) with residency-aware routing hints.
- “Green window” scheduler for non-urgent batch/backfill; carbon-aware replica preference.
- Carbon report & guardrail in CI; optional policy to shift ≤10% traffic when legal/safe.

**Acceptance Criteria**

- E1: Carbon telemetry on 100% jobs; report shows **−15% kgCO₂e/1k ops**.
- E2: Green-window scheduler moves ≥ 40% eligible jobs; SLOs unaffected.
- E3: Residency/policy proofs shown on any carbon-driven route change.

**Artifacts**

- `ops/carbon/{coeffs.json,reporter.ts}`, `scheduler/green_window/*`, `docs/carbon_policy.md`.

---

### F) Memory/IO & Storage Footprint

**Tasks**

- Columnar snapshots for hot entities; zstd-dict tuning; page cache hints.
- Log sampling and structured compression; rotate/compact policies; cold tiering.
- Client bundles split/treeshaken; source-map upload off critical path.

**Acceptance Criteria**

- F1: Storage/GB per 1M entities **−20%** with zero correctness loss.
- F2: Log volume **−30%** with preserved incident triage fidelity.
- F3: JS bundle size **−25%** on tri-pane route; p95 TTFB −10%.

**Artifacts**

- `storage/layouts/*`, `ops/logging/sampling.yaml`, `ui/build/split.config.ts`.

---

### G) Evidence, Telemetry & Safe Rollbacks

**Tasks**

- Perf scoreboard (cold/warm, p50/95/99) per route; signed weekly **Perf & Cost Report**.
- Canary for perf: shadow + guard; auto-rollback on p95 or error budget breach.
- “What changed?” explainer: prompts, indexes, caches, model, router knobs.

**Acceptance Criteria**

- G1: Report auto-posts Mondays 09:00 MT with deltas and savings.
- G2: 3 live rollbacks triggered by perf guard in staging; no customer impact.
- G3: Explainers attached to each improvement/regression.

**Artifacts**

- `ops/reports/perf_cost_*.md`, `.github/workflows/perf-guard.yml`, `ui/ops/WhatChanged.tsx`.

---

## CI Gates (added/confirmed this sprint)

- `nlq-latency-regression` (−20% p95 target; no regression allowed)
- `ingest-hotpath-perf` (−25% p95 backfill path)
- `cache-correctness` (keys/invalidation; no stale-policy leaks)
- `token-cost-budget` (per-PR delta + per-tenant budgets enforced)
- `carbon-guard` (telemetry present; optional shift policy)
- `bundle-size` (tri-pane −25% vs. baseline)
- Existing safety/accuracy/residency gates remain required.

---

## Quickstart Commands

```bash
# Router & prompt efficiency
make router-bench
make prompts-compact && make nl2cypher-grammar-verify

# Caching layers
make cache-warm result
make cache-warm plan
make cache-warm figure
make cache-report

# Hot-path perf
make nlq-perf-cold && make nlq-perf-warm
make ingest-perf --docs 500k

# Budgets
igctl budget show --tenant TEN
igctl budget simulate --req nlq --q "..." --tenant TEN
igctl budget set --tenant TEN --tokens 5e6 --cpu 2e5

# Carbon
make carbon-report
make green-window-dryrun
make route-carbon-aware --preview

# Storage & bundles
make storage-compact
make logs-sample-apply
make ui-bundle-report
```
````

---

## Review & Live Demo (Sprint Close)

1. **Before/After Perf:** Show NLQ p95 drop ≥20% and ingest p95 drop ≥25% on the same dataset; open Explain for what changed.
2. **Cache Wins:** Warm the plan/result/figure caches; demonstrate 70%+ hit rate and cold→warm delta ≤35%.
3. **Token Savings:** Compare tokens/1k NLQ; grammar decode yields 0 invalid Cypher; accuracy parity charts.
4. **Budgets & Degrade:** Exceed a tenant budget → soft-degrade ladder kicks in; hard-limit blocks with explain + HITL raise path.
5. **Carbon-Aware Runs:** Schedule batch under green window; show kgCO₂e trend and residency-proof on any route shift.
6. **Rollbacks & Guards:** Trigger perf regression in canary → guard auto-rolls back; signed Perf & Cost Report posted.

---

## Risks & Mitigations

- **Cache Staleness:** Strict keys (purpose/tenant/policy/schema); SWR with quick re-validation; promotion hooks to purge.
- **Over-compaction harming accuracy:** Guarded evals with significance tests; quick router rollback.
- **Carbon vs. Residency:** Never violate residency; carbon hints only within allowed regions/policies.
- **Budget Over-blocking:** Start with soft-degrade & alerts; HITL raise path with audit and expiry.

---

## Definition of Done (27Y)

- NLQ and ingest hot paths meet latency targets; no accuracy/safety regressions.
- Token/compute cost cut per targets; cache hit ≥70%; cold→warm deltas within budget.
- Tenant budgets enforced with graceful degrade and clear explainers.
- Carbon telemetry live with ≥15% reduction; green-window scheduler operating.
- Storage/logs/ui bundles reduced per targets; weekly signed Perf & Cost Report posted; guards + rollbacks proven.

```

```

````md
# Summit / Maestro Conductor — Sprint 27Z “Delegated Admin, Org Hierarchies & Governance-at-Scale”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Make Summit painless to **roll out across large enterprises**. Ship **Org Hierarchies** (company → divisions → departments → projects), **Delegated Administration**, **policy-as-code UX**, bulk governance (roles, quotas, residency, DLP) and **audit analytics** that let security/compliance teams prove control at scale — with zero ambiguity, strong guardrails, and reversible changes.

---

## North-Star Outcomes

1. **Org Graph Live:** Tenants model real-world orgs (N-level hierarchy, groups, projects) with inheritance + overrides; SSO/SCIM aligns on first sync.
2. **Delegated Admin:** Least-privilege admin roles (Org Admin, Division Admin, Project Admin, Auditors) work out-of-the-box; 0 privilege escalation paths in tests.
3. **Governance at Scale:** Bulk policy pushes (roles/quotas/residency/DLP) complete across ≥10k users & ≥1k projects with evidence & rollback.
4. **Policy-as-Code + UI:** Human-friendly policy editor with previews, diffs, proofs, and CAB workflow; promotion requires signed checks.
5. **Audit Analytics:** Queryable audit lake with “who changed what/when/why,” variance reports, and attestation packs; answers < 1s p95 on hot queries.

---

## Tracks & Deliverables

### A) Org Hierarchies & Inheritance

**Tasks**

- Org model: `Org → Division → Department → Project/Workspace` nodes with attributes (region/residency, budgets, DLP tiers).
- Inheritance engine: defaults at higher levels; explicit overrides below; conflicts resolved deterministically with proofs.
- SCIM/IdP sync: groups map to hierarchy nodes; drift detector and auto-repair.

**Acceptance Criteria**

- A1: Create 4-level org; verify inherited settings & targeted overrides; proofs list effective values.
- A2: SCIM group change appears in <60s; drift repaired or flagged with explain().
- A3: Residency fences honored at every level; cross-fence operations denied with proofs.

**Artifacts**

- `schema/org/*.yml`, `services/org/inheritance.ts`, `services/scim/org_map.ts`, tests & fixtures.

---

### B) Delegated Administration & Least Privilege

**Tasks**

- Role catalog with granular scopes (read audit, manage users, manage quotas, approve policy, rotate keys) bound to org nodes.
- Approval chains: risky actions require CAB label + WebAuthn step-up; change windows enforced.
- Break-glass for Org Admins: time-boxed elevation with evidence and auto-revoke.

**Acceptance Criteria**

- B1: Project Admin cannot modify Division/Org settings; attempts blocked with explain().
- B2: Elevation requires reason, TTL, and emits receipts; auto-revokes on expiry.
- B3: Priv-esc test suite passes (0 paths); coverage report attached.

**Artifacts**

- `security/roles/catalog.yaml`, `services/auth/delegation/*`, `tests/roles/priv_esc.spec.ts`.

---

### C) Bulk Governance (Policies, Quotas, Residency, DLP)

**Tasks**

- Bulk apply engine with **preview → diff → apply → rollback** pipeline; chunked execution, retries, idempotency keys.
- Policy bundles parameterized by org node; residency/DLP presets; budget ladders (soft-degrade paths).
- Progress UI with per-node status, errors, and signed summary.

**Acceptance Criteria**

- C1: Roll out to ≥1k projects in ≤ 30 min; errors quarantined and resumable.
- C2: Rollback restores prior state in ≤ 2 min with receipts.
- C3: No partial-policy exposure: fail-closed until entire subtree achieves consistency.

**Artifacts**

- `services/governance/bulk_apply/*`, `ui/admin/BulkGovernance.tsx`, `RUNBOOK-Bulk-Gov.md`.

---

### D) Policy-as-Code + Visual Editor

**Tasks**

- Versioned policy repo (OPA/ABAC/DLP/residency/quotas) + UI editor with linting, test previews, and sample traffic simulation.
- CAB workflow: proposals → reviewers → evidence; dual-sign promotion; provenance attached.
- Policy diffs show blast radius (who/what is impacted), with “Why not promoted?” hints.

**Acceptance Criteria**

- D1: Editor prevents invalid/unsafe rules; lints block publish; previews run on sampled logs.
- D2: Promotion requires dual-sign + green tests; receipts link to artifacts.
- D3: Rollback path one-click with evidence; change appears in Audit Analytics immediately.

**Artifacts**

- `policy/repo/**`, `ui/policy/Editor.tsx`, `tools/policy/simulate.ts`, `.github/workflows/policy-cab.yml`.

---

### E) Audit Analytics Lake & Attestations

**Tasks**

- Append-only audit lake (Parquet) with typed events (who/what/when/why, purpose, CAB ids, receipts, policy versions).
- Indexed API & NLQ layer for “who changed X”, “effective policy for Y”, “failed approvals”, “residency violations (none)”.
- Attestation pack generator for auditors (SOC/ISO/Fed) with signed digests.

**Acceptance Criteria**

- E1: Hot queries (<30d) p95 < 1s; warm (<180d) < 2.5s; cold via async export.
- E2: “Explain effective policy” shows inheritance + overrides + proofs for any node.
- E3: Attestation pack builds in <5 min; verifies on clean runner.

**Artifacts**

- `services/auditlake/*`, `api/audit/query/*`, `ui/audit/Explorer.tsx`, `tools/audit/attest_pack.sh`.

---

### F) Migration & Org Onboarding Toolkit

**Tasks**

- Importers: CSV/JSON/IdP groups → org graph; rule-based mapping & dry-run diffs.
- Data cleaners for common issues (dup groups, mixed case, missing regions); repair suggestions.
- Onboarding wizard: “connect IdP/SCIM → import → preview inheritance → apply with guardrails”.

**Acceptance Criteria**

- F1: Migrate a 20k-user org with >500 groups in ≤ 45 min with <1% manual fixes.
- F2: Dry-run diffs match applied results exactly (hashes); on mismatch, auto-halt.
- F3: Wizard completes with green checks; rollback works.

**Artifacts**

- `tools/import/org_mapper.py`, `ui/onboarding/OrgWizard.tsx`, `tests/migration/org_import.spec.ts`.

---

### G) Reporting, Alerts & Success Hand-off

**Tasks**

- “Governance Health” dashboard: policy parity, delegation coverage, failed approvals, rollout status, budget usage.
- Threshold alerts (policy drift, expired approvals, nodes without admins) with playbook links.
- Success package for field teams: checklists, FAQs, and sample comms.

**Acceptance Criteria**

- G1: Dashboard SLAs (p95 < 5s); tiles link to Explain and Audit Explorer.
- G2: Alerts page ops within 1 min; playbooks resolve common issues.
- G3: Success package used in two mock rollouts; feedback integrated.

**Artifacts**

- `ops/dashboards/governance.json`, `ui/alerts/GovAlerts.tsx`, `docs/success/rollout_kit.md`.

---

## CI Gates (added/confirmed this sprint)

- `org-inheritance-tests` (deterministic effective policy proofs)
- `delegation-priv-esc` (zero privilege-escalation paths)
- `bulk-governance-safe` (preview/diff/apply/rollback correctness)
- `policy-cab` (lint, simulate, dual-sign, receipts)
- `auditlake-perf` (hot p95 < 1s; warm < 2.5s)
- `org-import-dryrun` (diff parity; auto-halt on mismatch)
- Existing security/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Build org graph from IdP groups (dry-run)
igctl org import --source scim --map maps/idp_to_org.yaml --dry-run
igctl org apply --plan out/org_plan.json

# Delegated admin
igctl roles assign --role ProjectAdmin --node proj:alpha --user alice@example.com
igctl roles elevate --role OrgAdmin --ttl 15m --reason "DR drill"

# Bulk governance
igctl gov push --bundle policies/residency_enterprise.tgz --scope division:emea --preview
igctl gov apply --scope division:emea
igctl gov rollback --scope division:emea --to last

# Policy-as-code
igctl policy simulate --bundle ./policy --traffic samples/24h.ndjson
igctl policy promote --bundle ./policy --approve

# Audit analytics
igctl audit query "who changed quotas in division:amer last 7d"
igctl audit attest --out attestation_$(date +%F).tgz
```
````

---

## Review & Live Demo (Sprint Close)

1. **Org Build:** Import a 20k-user org; preview inheritance; apply with proofs; SCIM drift repair demo.
2. **Delegation:** Show Project Admin vs Division Admin boundaries; attempt forbidden action → explain & deny; break-glass elevation + auto-revoke.
3. **Bulk Governance:** Push residency/DLP bundle to 1k projects; watch preview → apply → rollback; consistency proof visible.
4. **Policy-as-Code:** Edit in UI; lints/preview; CAB approve; promotion receipts; rapid rollback.
5. **Audit Explorer:** Ask “who changed export policy for proj\:alpha?” → <1s answer with lineage; build attestation pack.
6. **Governance Health:** Dashboard tiles → Explain; alerts for missing admins; run playbook to fix.

---

## Risks & Mitigations

- **Inheritance Confusion:** Visual proofs + “effective policy” explainers at every node; safe defaults; guided wizards.
- **Priv-esc via Over-broad Roles:** Fine-grained scopes, least-privilege catalog, and priv-esc test suite in CI.
- **Partial Rollouts:** Fail-closed subtree mode with resumable bulk engine and deterministic diffs.
- **Org Import Drift:** Dry-run parity checks; auto-halt and repair suggestions; SCIM reconciliation.

---

## Definition of Done (27Z)

- Org hierarchies, inheritance proofs, and SCIM alignment live and tested.
- Delegated admin roles enforce least privilege with no escalation paths.
- Bulk governance engine delivers preview/diff/apply/rollback with evidence across ≥1k projects.
- Policy-as-code with CAB workflow promoted with proofs and one-click rollback.
- Audit Analytics lake answers governance questions fast; attestation packs verifiable.
- Dashboards & alerts give real-time governance posture; field rollout kit validated.

```

```

````md
# Summit / Maestro Conductor — Sprint 28A “Sovereign & Regulated Deployments (FedRAMP/CJIS/HIPAA/IL5)”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Make Summit deployable in **sovereign and highly regulated environments**. Deliver partitioned builds (Gov/DoD/CJIS/HIPAA), enclave-aware policy bundles, SC/KMS segregation, customer-managed keys (CMK) everywhere, and compliance evidence automation. Prove **operational parity** with commercial while enforcing stricter controls: offline-updatable, least-privilege, and auditable end-to-end.

---

## North-Star Outcomes

1. **Enclave Parity:** Gov/Regulated builds achieve feature parity with commercial for core flows (ingest→NLQ→export) with zero external dependency drift.
2. **Compliance Evidence on Demand:** “One-click” evidence packs for **FedRAMP Moderate**, **CJIS**, **HIPAA**, **NIST 800-53/171**, **ISO 27001**; artifacts reproducible and signed.
3. **CMK Everywhere:** BYOK/CMK with per-tenant HSM-backed keys; dual control and break-glass time-boxed with attestations.
4. **Sovereign Boundaries:** Network, identity, logging, and update channels **sovereign-by-default** with no cross-boundary egress; offline update path proven.
5. **Ops Readiness:** IR/BCP/DR patterns validated for disconnected enclaves; zero PII leakage and **no cloud calls** without explicit approval.

---

## Tracks & Deliverables

### A) Sovereign Build Flavors & Supply Chain

**Tasks**

- Build matrices for **Gov**, **DoD IL4/5 (air-gap capable)**, **CJIS**, **HIPAA**; pinned base images, FIPS-validated crypto, no telemetry by default.
- Separate OCI registries and provenance keys; trust policy per enclave; SBOM redaction (no env-specific secrets).
- Offline bundle creator: **media + charts + policies + scanners**; reproducible digests.

**Acceptance Criteria**

- A1: `make build-gov` / `build-dod` create signed bundles with unique keys and matching SBOMs (minus redactions).
- A2: Air-gapped install reaches green with **zero internet**; any external call attempt → deny & audit.
- A3: Third-party deps list passes allowlist; non-compliant deps blocked with explain().

**Artifacts**

- `build/flavors/{gov,dod,cjis,hipaa}/*`, `.github/workflows/sovereign_build.yml`, `security/trust/sovereign_policy.yaml`.

---

### B) Identity, Access & Boundary Controls

**Tasks**

- Enclave IdP federation: **PIV/CAC**, **SAML**, **OPAQUE** options; SCIM with no outbound callbacks.
- Per-enclave **ABAC**: purpose/residency/classification tags; network policies default-deny; DNS/NTPS inside enclave.
- Session recording for privileged ops; dual-approval for admin actions.

**Acceptance Criteria**

- B1: PIV/CAC login works with step-up; audit trails show cert Subject + purpose.
- B2: External DNS/NTP blocked; enclave NTP/DNS green; time drift alarms active.
- B3: Privileged actions require dual-approval; attempts without → blocked with explain + case ID.

**Artifacts**

- `services/auth/piv_cac/*`, `policy/abac/sovereign.rego`, `net/egress/deny_all.yaml`, tests.

---

### C) CMK/HSM & Data Protections

**Tasks**

- KMS adapters: **Luna/CloudHSM**, **Thales**, **KeyVault HSM**, **CloudKMS CMEK**; per-tenant key hierarchy with crypto erasure.
- Envelope encryption for data at rest + in replication queues; **classification-aware** key selection.
- Backup/restore with enclave escrow; offline key rotation runbook.

**Acceptance Criteria**

- C1: Tenant-scoped CMK enforced; restoration without valid CMK → impossible by design.
- C2: Key rotation drill succeeds with no downtime; receipts + manifests signed.
- C3: Crypto erasure removes access to targeted tenant datasets; verify tool passes.

**Artifacts**

- `crypto/kms/*`, `RUNBOOK-CMK-Rotation.md`, `tools/crypto/erasure_verify.ts`.

---

### D) Logging, Telemetry & Evidence (Sovereign Mode)

**Tasks**

- Local-only logging/metrics with **no egress**; compatible targets (Elastic/OpenSearch, Loki, Splunk Forwarder, Fluentd).
- Evidence collectors tailored to frameworks: control mappings, POA&M generator, SSP fragments, boundary diagrams.
- “Redaction-at-source” for logs; field masks verified in CI.

**Acceptance Criteria**

- D1: Sovereign telemetry produces **no external calls**; exports only via offline bundle with receipts.
- D2: Evidence pack for selected framework builds in <10 min; hashes match after re-run.
- D3: Redaction tests green; synthetic PII seeds never appear in logs.

**Artifacts**

- `ops/telemetry/sovereign/*`, `compliance/evidence/{fedramp,cjis,hipaa}/**`, `security/log_redaction/*.yml`.

---

### E) IR/BCP/DR for Disconnected Enclaves

**Tasks**

- DR patterns that assume **no cross-enclave** replication; cold/warm standby with **offline delta updates**.
- Incident Response runbooks using **local paging** and **air-gapped diagnostics**.
- Quarterly **disconnect drills** and **malware containment** tabletops with AARs.

**Acceptance Criteria**

- E1: Disconnect drill (24 h) retains SLOs for enclave; backlog drains when link restored with signed **Sync Receipts**.
- E2: DR restore from offline media verified; RTO/RPO within enclave targets.
- E3: AARs committed with remediation items and owners.

**Artifacts**

- `RUNBOOK-IR-Sovereign.md`, `DR/offline_restore/*`, `ops/reports/disconnect_AAR_*.md`.

---

### F) Data Handling: PHI/PCI/Criminal Justice Artifacts

**Tasks**

- HIPAA mode: PHI tagging, minimum necessary enforcement, **break-glass** with reason + TTL; BAAs template.
- CJIS mode: audit retention rules, **advanced background roles**, CJIS encryption posture proof.
- PCI-safe exports (tokenization) as optional plugin; no storage of PAN by default.

**Acceptance Criteria**

- F1: PHI/PII fields blocked from export without purpose + step-up + case; override audited.
- F2: CJIS audit queries respond < 1 s for 30-day hot window; retention policies enforced.
- F3: PCI plugin passes tokenization tests; PAN ingestion attempts rejected by default.

**Artifacts**

- `modes/{hipaa,cjis,pci}/**`, `legal/templates/{BAA,CJIS_Addendum}.md`, `tests/modes/*.spec.ts`.

---

### G) Update Channels, Scanning & ATO Booster

**Tasks**

- Offline update signer & **media chain-of-custody**; detached signatures for air-gapped patching.
- Vulnerability scanning parity using offline feeds (NVD mirroring, STIG checks).
- “ATO Booster” kit: control matrix, inheritable controls doc set, and artifact index.

**Acceptance Criteria**

- G1: Offline patch applies with detached sig; tamper → blocked with explain().
- G2: STIG/NVD scan parity with commercial; drift reports generated.
- G3: ATO Booster compiles to a signed bundle; control coverage map ≥ 90% for targeted framework.

**Artifacts**

- `updates/offline_sign/*`, `security/scanning/offline/**`, `docs/ato_booster/**`.

---

## CI Gates (added/confirmed this sprint)

- `sovereign-build-repro` (reproducible gov/dod bundles + SBOM parity)
- `egress-zero` (no network calls in sovereign mode)
- `piv-cac-auth` (step-up + audit trails)
- `cmk-enforce` (tenant CMK required; rotation drill)
- `log-redaction` (synthetic PII seeds blocked)
- `dr-disconnect` (24 h link loss; backlog reconciliation)
- `cjis-hipaa-modes` (policy gates + audit queries)
- `offline-update-verify` (detached signature & chain-of-custody)
- Existing security/provenance/ER/SLO/cost gates remain required.

---

## Quickstart Commands

```bash
# Sovereign builds & installs
make build-gov && make build-dod
igctl install --bundle out/summit_dod_il5.tgz --offline

# Identity & policy
igctl auth piv-cac enroll --user alice@agency.gov
make abac-verify --mode sovereign

# CMK/HSM
igctl kms bind --tenant TEN --hsm luna1 --key alias/ten-cmk
igctl kms rotate --tenant TEN --approve

# Telemetry & evidence
make telemetry-sovereign-smoke
make evidence-fedramp
make evidence-cjis
make evidence-hipaa

# DR/Disconnect
make disconnect-drill --duration 24h
igctl sync receipts --last 5

# Updates & scans
igctl update apply --bundle offline_patch_1.2.4.tgz --sig offline_patch_1.2.4.sig
make stig-scan && make nvd-mirror-scan
```
````

---

## Review & Live Demo (Sprint Close)

1. **Air-Gapped Bring-Up:** Install DoD IL5 bundle offline; show default-deny egress and green health.
2. **PIV/CAC & ABAC:** Log in with CAC; attempt cross-boundary action → deny with explain(); approved action audited.
3. **CMK Everywhere:** Rotate tenant key; verify crypto erasure on archived dataset; restore requires CMK.
4. **Sovereign Telemetry:** Show logs/metrics in enclave tools; build signed FedRAMP/CJIS evidence packs.
5. **Disconnect Drill:** Run 24 h disconnect; maintain SLOs; on reconnect, backlog drains; receipts verified.
6. **Offline Patch:** Apply detached-signed update; STIG/NVD scans green; ATO Booster generated.

---

## Risks & Mitigations

- **Drift vs. Commercial:** Automated parity tests; change Windows per flavor; shared code with compile-time toggles only.
- **Overhead of CMK/HSM:** Connection pooling + caching; fail-closed with descriptive errors; runbooks for ops.
- **Egress Reliance:** Remove telemetry defaults; explicit allowlists; red-team on boundary leaks.
- **Evidence Sprawl:** Evidence generator + index; dedup and signed manifests.

---

## Definition of Done (28A)

- Sovereign build flavors reproducible with signed SBOM/provenance; zero external egress in sovereign mode.
- PIV/CAC, ABAC, and default-deny boundaries enforced; audit trails complete.
- Tenant CMK/HSM integrations live with rotation & crypto erasure verified.
- FedRAMP/CJIS/HIPAA evidence packs build deterministically; STIG/NVD parity scans pass.
- Disconnected ops validated (IR/BCP/DR); offline updates and chain-of-custody proven.

```

```

````md
# Summit / Maestro Conductor — Sprint 28B “Privacy-Enhancing Computation: MPC/HE/TEE & Private Queries”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Add **privacy-enhancing tech (PETs)** rails for sensitive analytics: **MPC** (multi-party computation) for joint stats, **HE** (homomorphic encryption) for simple transforms at rest, and **TEE** (trusted execution environments) for high-performance private queries. All pathways are policy-guarded, reproducible, and come with signed proofs and fallbacks. Target safe-by-default private counts/top-k, joins over secret keys, and verifiable execution attestation.

---

## North-Star Outcomes

1. **Private Aggregates GA:** Count/distinct/top-k/co-occurrence from two or more parties produced via **MPC** or **TEE** with no raw data disclosure; p95 ≤ 1.8 s for interactive templates.
2. **HE Utilities:** Homomorphic **add/scale/mask** pipelines (CKKS/BFV) for score normalization and privacy-preserving filters; batch jobs p95 ≤ 30 s for 1M rows.
3. **Verifiable Execution:** **TEE attestation** (SEV-SNP/TDX/SGX as available) captured and bound to each job; receipts verify on clean runner.
4. **Policy by Construction:** Residency, purpose, DP/K-anon (from 27P) enforced across PETs; overrides require step-up + dual-sign.
5. **Reproducibility:** Every PET job emits a manifest (keys, circuits, attestation, params) that re-runs bit-for-bit.

---

## Tracks & Deliverables

### A) PET Control Plane & Policy Selection

**Tasks**

- PET router that chooses **MPC**, **HE**, or **TEE** based on policy, dataset size, latency/cost targets, and partner capability.
- Policy knobs: min participants, required hardware (TEE), DP epsilon, K, L bounds; denylist/allowlist for jurisdictions.
- Consistent **receipt format** across PET modes.

**Acceptance Criteria**

- A1: Router chooses compliant mode with explanation; unsafe combos → deny with remediation.
- A2: Policy simulation shows expected PET choice on 10 scenarios.
- A3: Receipts identical schema across MPC/HE/TEE and verify hashes.

**Artifacts**

- `services/pet/router/*`, `policy/pet/*.rego`, `docs/pet/decision_matrix.md`.

---

### B) MPC Aggregations (2–5 Parties)

**Tasks**

- Implement additive secret-sharing + Beaver triples for counts/distinct/top-k/co-occurrence; semi-honest baseline.
- Transport: mTLS + replay protection; resumable rounds; bandwidth caps.
- Circuit library with size/latency estimator; offline pre-compute cache.

**Acceptance Criteria**

- B1: Two-party count/distinct/top-k pass correctness tests; five-party co-occurrence within error ≤ 0.1% vs. plaintext.
- B2: p95 ≤ 1.8 s for counts/top-k on 2×5M rows (interactive); pre-compute hit ≥ 50%.
- B3: Failure in any round halts and produces partial transcript + safe cleanup.

**Artifacts**

- `pet/mpc/{protocol,primitives,precompute}/*`, `tests/pet_mpc/*.spec.ts`.

---

### C) Homomorphic Encryption Utilities (HE)

**Tasks**

- CKKS/BFV operators: add, scalar multiply, weighted average, masked filter; batching and rescaling.
- Key mgmt/rotation for HE keys (tenant-scoped); parameter tuner with security level proofs.
- Job runner for HE transforms with progress + resume.

**Acceptance Criteria**

- C1: HE transforms match plaintext ±1e-5 RMSE (CKKS) or exactly on BFV tests.
- C2: 1M-row weighted normalization finishes ≤ 30 s on reference hardware.
- C3: Mis-tuned params or low security level → deny with explain and suggestions.

**Artifacts**

- `pet/he/{ckks,bfv}/*`, `crypto/he_keys/*`, `tests/pet_he/*.spec.ts`.

---

### D) Trusted Execution Environments (TEE) for Private Queries

**Tasks**

- Attested enclaves (SGX/TDX/SEV-SNP) running **private SQL/Cypher** kernels; sealed secrets and remote attestation.
- Data sealing/unsealing flows; ephemeral keys; enclave image signing pipeline.
- Side-channel mitigations (page-fault shaping, constant-time sensitive ops) checklist.

**Acceptance Criteria**

- D1: Attestation captured & validated per run; receipts include quote + PCR/measurement IDs.
- D2: p95 ≤ 1.3 s on private count/group-by over 10M rows in enclave; no plaintext egress.
- D3: Side-channel checklist green; attempts to attach debugger → enclave aborts + receipt.

**Artifacts**

- `pet/tee/{runtime,attest}/*`, `.github/workflows/tee_build.yml`, `docs/pet/attestation.md`.

---

### E) Private Join & PSI (Private Set Intersection)

**Tasks**

- PSI via ECDH/OPRF for hashed identifiers; output link-hints only (no raw ids).
- Bloom/garbled-circuit variant for high-cardinality; backpressure + chunking.
- Integration with federation clean rooms (27P) and DUA accounting.

**Acceptance Criteria**

- E1: PSI correctness on synthetic sets (up to 10M) matches baseline; false-positives ≤ configured rate.
- E2: p95 PSI 10M vs 10M ≤ 120 s batch; receipts show PSI variant and DP accounting.
- E3: No raw ids land; link-hints carry confidence + provenance.

**Artifacts**

- `pet/psi/*`, `tests/pet_psi/*.spec.ts`, `services/federation/psi_adapter.ts`.

---

### F) UX, Explain & Developer Tooling

**Tasks**

- “Private Query” UI: choose dataset/DUA, PET mode (auto/manual), budget preview, expected latency, and explainers.
- CLI: `igctl pet run` (mpc|he|tee|psi) with `--explain`, `--receipt`, `--replay`.
- Dev sandboxes with sample circuits and enclave images.

**Acceptance Criteria**

- F1: Explain renders in ≤ 400 ms with decision factors; copyable replay command provided.
- F2: Receipts verify locally; replay reproduces hashes bit-for-bit.
- F3: A11y pass; error states provide actionable remediation.

**Artifacts**

- `ui/pet/PrivateQueryPanel/*`, `cli/igctl/commands/pet.ts`, `samples/pet/**`.

---

### G) Governance, Safety & Fallbacks

**Tasks**

- Guardrails: enforce DP/K-anon on PET outputs; minimum participant thresholds; jurisdiction fences.
- Fallback ladder: TEE→MPC→deny (configurable) with operator approval steps.
- Red-team PET suite: collusion attempts, side-channel probes, output differencing.

**Acceptance Criteria**

- G1: Outputs violating DP/K-anon denied with detailed explain; manual widen buckets path available.
- G2: Fallbacks logged with reason; operator step-up required; receipts bound to decision.
- G3: Red-team PET suite passes; no leakage on synthetic seeds.

**Artifacts**

- `security/policy/pet_guards.rego`, `safety/redteam/pet/*.yml`, `docs/pet/fallbacks.md`.

---

## CI Gates (added/confirmed this sprint)

- `pet-policy-sim` (policy mode selection & fences)
- `mpc-correctness-perf` (correctness; p95 budgets)
- `he-ops-accuracy` (RMSE/exactness; params safe)
- `tee-attest-verify` (attestation receipts required)
- `psi-correctness-scale` (10M×10M; FP budget)
- `pet-dp-kanon` (DP/K-anon enforcement)
- `pet-redteam` (collusion/side-channel/differencing)
- Existing federation/residency/ER/SLO gates remain required.

---

## Quickstart Commands

```bash
# Policy simulation & selection
igctl pet simulate --dua DUA-123 --q "top domains by count" --participants A,B

# Run MPC aggregates
igctl pet run mpc --op topk --k 20 --participants A,B --receipt out/mpc_receipt.json

# HE utilities
igctl pet run he --op normalize --dataset ds-weights --params ckks:slots=8192,sec=128 --receipt out/he_receipt.json

# TEE private query
igctl pet run tee --q "MATCH ()-[:VISITED]->(d:Domain) RETURN d.name, count(*) ORDER BY count(*) DESC LIMIT 10" \
  --attest out/tee_attest.json

# PSI / private join
igctl pet run psi --left dsA:ids --right dsB:ids --variant op rf --receipt out/psi_receipt.json

# Verify & replay
igctl pet receipt verify out/mpc_receipt.json
igctl pet replay --receipt out/mpc_receipt.json
```
````

---

## Review & Live Demo (Sprint Close)

1. **Mode Decision:** Show PET router choosing MPC with explain; flip policy to require TEE → replan with attestation.
2. **MPC Aggregates:** Run top-k across two parties; compare to plaintext on a safe synthetic; p95 ≤ 1.8 s.
3. **HE Transform:** Normalize scores with CKKS; verify RMSE and throughput; rotate HE keys.
4. **TEE Query:** Execute private group-by in enclave; capture/verify attestation; attempt debugger → abort with receipt.
5. **PSI Join:** Link ids via OPRF; generate link-hints only; receipts show DP accounting.
6. **Guards & Red-team:** Attempt undersized K-anon bucket → blocked with hints; run PET red-team suite → green.

---

## Risks & Mitigations

- **Performance variance:** Pre-compute caches, adaptive circuit selection, and TEE fast-path for interactive workloads.
- **Complex policy surface:** Opinionated defaults, explainers, and `pet-policy-sim`; deny by default on ambiguity.
- **Side-channels/collusion:** Hardened enclaves, semi-honest baseline with alerts, operator education, and continuous red-team.
- **Parameter misuse (HE):** Tuner + minimum security levels; block unsafe params with actionable suggestions.

---

## Definition of Done (28B)

- PET router, receipts, and policy enforcement live; explainers and replay tools shipped.
- MPC counts/distinct/top-k/co-occurrence correct and within latency budgets; failure handling safe.
- HE utilities operational with reproducible manifests and accuracy bounds met.
- TEE private query path attested, fast, and side-channel checklist green.
- PSI private joins deliver link-hints only with DP/K-anon enforcement and verifiable receipts.
- PET red-team suites pass; CI gates enforce policy, performance, and safety across modes.

```

```

````md
# Summit / Maestro Conductor — Sprint 28C “Financial & Influence Network Disruption: AML Graphs, Sanctions, and Takedown Packs”

**Dates:** Sep 19–Oct 2, 2025 (America/Denver)  
**Objective:** Turn Summit into a decisive **asset- and influence-disruption platform**. Land AML-grade entity resolution (people, companies, vessels, addresses), blockchain analytics (on/off-chain), sanctions screening with watchlists, typology detectors (layering, mixers, trade-based ML), and **takedown/evidence packs** for partners. Everything is policy-governed, reproducible, explainable, and safe to share under DUAs.

---

## North-Star Outcomes

1. **Actionable Cases:** From ingest → case in ≤ 15 minutes with **risk score ≥ threshold**, evidence bundle, and playbook link (notify, freeze, investigate).
2. **High-Precision Linking:** Corporate/beneficial-ownership (BO) + blockchain address clustering reaches **≥ 0.92 precision / ≥ 0.85 recall** on gold sets.
3. **Typology Wins:** Detector suite (sanctions-evasion, layering, funneling, mixer usage, TBML patterns) achieves **AUC ≥ 0.90** with ≤ 5% false-alert delta after dedup.
4. **Sanctions Compliance:** OFAC/EU/UK/UN lists + internal watchlists unified; screening p95 < 300 ms; **0 policy leaks** in staging.
5. **Partner Handoff:** One-click **Takedown Pack** (attested provenance, graphs, receipts) exports under DUA in < 60 s; partner APIs tested end-to-end.

---

## Tracks & Deliverables

### A) AML Graph & Entity Resolution (KYC/KYB/BO)

**Tasks**

- Schema for parties (Person/Org/Trust), identifiers (passports, LEIs, EINs), relationships (ownership %, control, officer).
- Resolution pipeline: deterministic match (keys, docs) + probabilistic (names, addresses, phones, emails) with explainable features.
- Vessel & logistics entities (IMO/MMSI, hull names) and trade links (bill of lading, HS codes).

**Acceptance Criteria**

- A1: BO chains and control paths rendered with confidence & proofs; ambiguous merges quarantined.
- A2: Gold resolution: **P=0.92/R=0.85+** on labeled sets; error analysis report produced.
- A3: “Effective Owner” query returns ultimate controllers with % roll-ups and dates.

**Artifacts**

- `schema/aml/*.yml`, `services/resolve/{deterministic,probabilistic}/*`, `ui/case/OwnershipView.tsx`, tests & gold.

---

### B) Blockchain Analytics (Addresses, Clusters, Flows)

**Tasks**

- Ingest on-chain data (BTC/ETH + 1 EVM L2); create address→cluster graph with multi-heuristic linkage (co-spend, common-input, rep labels).
- Mixers/bridges/exchanges tagging; temporal flow windows; cross-chain traces via bridge events.
- On/off-ramp detection (exchanges, payment processors) and heuristics confidence.

**Acceptance Criteria**

- B1: Clusterer passes gold: **precision ≥ 0.93**, recall ≥ 0.80; explain lists contributing heuristics.
- B2: Pathfinding with policy (residency, sanctioned counterpart) in **p95 ≤ 800 ms** up to 4 hops.
- B3: Mixer/bridge usage flagged with confidence and counterparties; no raw keys leaked.

**Artifacts**

- `blockchain/{ingest,cluster,labels}/*`, `services/trace/paths.ts`, `ui/flows/OnChainTrace.tsx`.

---

### C) Sanctions & Screening (Lists, Watchlists, Fuzzy)

**Tasks**

- Unified sanctions lists (OFAC SDN/NS/SSI, EU/UK/UN) + local watchlists with versioning; phonetic/fuzzy matching and transliteration.
- Derivation rules: owned-by/controlled-by thresholds; sectoral restrictions; jurisdiction fences.
- Screening API & UI with policy proofs; adverse media hooks.

**Acceptance Criteria**

- C1: p95 screen **< 300 ms** per entity; derivation shows ownership/control reasons.
- C2: No leakage across jurisdictions; DUAs enforced on exports.
- C3: Regression tests for list deltas; “diff to prior” explain panel.

**Artifacts**

- `sanctions/{sources,normalizer,matcher}/*`, `api/screen/*`, `ui/screen/ResultCard.tsx`.

---

### D) Typology Detectors & Risk Scoring

**Tasks**

- Feature extractors: velocity, burstiness, split-merge graphs, shell-company motifs, TBML red flags (under/over-invoicing via HS codes & routes).
- Models/rules: layering/funneling, mixer/peel chains, rapid cross-jurisdiction hops, circular trade.
- Combined **Entity Risk Score** (0–100) with monotonic features and calibration.

**Acceptance Criteria**

- D1: AUC **≥ 0.90** on labeled set; ECE ≤ 5%; p95 compute ≤ 400 ms.
- D2: Top-3 detector rationales visible with provenance; false-alerts reduced ≥ 30% vs baseline after dedup.
- D3: Safety: no PII spill in rationales; purpose tags recorded.

**Artifacts**

- `detectors/{mixers,tbml,layering}/*`, `models/risk_fin/*`, `ui/risk/ExplainAML.tsx`.

---

### E) Cases, Playbooks & Takedown Packs

**Tasks**

- Casework UX: timeline, linked parties, funds flow, BO/control view; checklists; evidence capture.
- Playbooks: **Notify/Frozen Funds Request**, **Exchange Outreach**, **KYC Re-verify**, **Report SAR-like bundle** (non-filing).
- **Takedown Pack** generator: subgraph, receipts (DUA, policy, provenance), explainers, and redacted exports.

**Acceptance Criteria**

- E1: New signal → case in ≤ 15 min; artifacts attached; handoff link generated.
- E2: Takedown Pack builds **< 60 s**, verifies on clean runner; residency/DUA proofs included.
- E3: Rollback cancels actions and cleans temp artifacts with receipts.

**Artifacts**

- `ui/case/*`, `playbooks/aml/*.yaml`, `tools/packs/takedown_pack.ts`.

---

### F) Partner APIs & Legal/Compliance Guardrails

**Tasks**

- Partner connectors (Exchanges/PSPs/OSINT providers) with **policy-scoped** data exchange and rate limits.
- Legal guardrails: jurisdiction fences, purpose limitations, retention; operator step-up with CAB label.
- Audit analytics for AML: who queried, why, outputs shared, DUA references.

**Acceptance Criteria**

- F1: 3 partner flows E2E tested (request → response → case update); quotas enforced.
- F2: Unauthorized share attempt denied with explain and case ID; logs show reason.
- F3: Audit lake answers “who shared what/when/why” in **< 1 s** hot window.

**Artifacts**

- `integrations/partners/{exchange,psp,osint}/*`, `policy/aml/guardrails.rego`, `api/audit/aml_queries/*`.

---

### G) Evaluation, Gold Sets & Ops

**Tasks**

- Gold datasets for BO chains, address clusters, and typologies; red-team seeds for evasion tricks (name flips, translit, small-world hops).
- Weekly AML scorecard (precision/recall, AUC, case-to-action time, false-alert deltas).
- On-call drill: burst of mixer alerts → dedup → case prioritization → pack generation.

**Acceptance Criteria**

- G1: Gold/bronze suites pass with targets; red-team suite green (no obvious bypass).
- G2: Scorecard posted Mondays 09:00 MT with signed artifact.
- G3: Drill completes with MTTA/MTTR within targets; no orphaned states.

**Artifacts**

- `tests/gold_aml/**`, `safety/redteam/aml_evasion/*.yml`, `.github/workflows/aml-scorecard.yml`.

---

## CI Gates (added/confirmed this sprint)

- `resolve-precision-recall` (≥0.92 / ≥0.85)
- `cluster-precision` (≥0.93) & `trace-latency` (≤800 ms)
- `sanctions-screen-perf` (p95 < 300 ms; zero jurisdiction leaks)
- `typology-eval` (AUC ≥ 0.90; calibration ≤ 5%)
- `case-pack-verify` (takedown pack reproducible & policy-proofed)
- `partner-guardrails` (DUA/purpose; quotas; deny on breach)
- `aml-redteam` (evasion suite green)
- Existing safety/provenance/residency gates remain required.

---

## Quickstart Commands

```bash
# Ingest & resolve
igctl resolve party --name "ACME Trading Ltd" --country AE --doc lei:5493001KJTIIGC8Y1R12
igctl resolve vessel --imo 9411239

# Blockchain trace
igctl chain cluster --asset BTC --address bc1q...
igctl chain trace --from bc1q... --hops 4 --policy sanctions_residency.yaml

# Sanctions screening
igctl screen party --name "Acme Trading" --country AE --fuzzy
igctl screen ownership --entity org:acme --threshold 50

# Typology & risk
igctl risk score --entity org:acme --explain
igctl detector run mixers --address 0x...

# Case & takedown
igctl case open --signal SIG-123
igctl pack build --case CASE-123 --out out/pack_CASE-123.tgz
igctl pack verify --file out/pack_CASE-123.tgz

# Partner outreach (sandbox)
igctl partner exchange notify --case CASE-123 --cluster CLU-42 --dry-run

# Scorecard & tests
make aml-scorecard
make aml-redteam
```
````

---

## Review & Live Demo (Sprint Close)

1. **Resolve & BO:** Build ownership/control chain to ultimate owners; show proofs and ambiguity handling.
2. **On-Chain Trace:** Cluster addresses; trace flows through a mixer to an exchange; policy-aware pathfinding <800 ms.
3. **Screen & Derive:** Run sanctions screen with derived ownership; show fuzzy match + control reasoning.
4. **Typology & Risk:** Fire layering/mixer detectors; open risk explain; validate AUC & calibration metrics.
5. **Case → Pack:** Promote signal to case; generate Takedown Pack in <60 s; verify on clean runner; share under DUA.
6. **Partner Flow:** Send a sandbox outreach to an exchange; receive ack; case auto-updates; audit query answers who/what/why instantly.

---

## Risks & Mitigations

- **False Positives / Reputation Risk:** High precision targets, dedup/suppression, human-in-the-loop approvals, transparent explainers.
- **Entity Poisoning / OSINT Drift:** Signer reputation, anomaly detectors, periodic relabeling; quarantine suspect sources.
- **Cross-Jurisdiction Constraints:** Hard residency/DUA fences with proofs; operator step-up for exceptions.
- **Mixer/Bridge Evasion:** Multi-heuristic clustering, temporal motifs, and red-team suites; continuous tuning.

---

## Definition of Done (28C)

- AML entity resolution, BO/control, and on-chain clustering meet precision/recall targets with explainable proofs.
- Sanctions screening unified with derivations and policy fences; p95 < 300 ms; zero leaks.
- Typology detectors deliver AUC ≥ 0.90; risk scoring fast, explainable, and calibrated.
- Casework + Takedown Pack pipeline operational, reproducible, and policy-proofed; partner APIs validated.
- Weekly AML scorecard and red-team suites in place; CI gates enforce accuracy, latency, and governance.

```

```
