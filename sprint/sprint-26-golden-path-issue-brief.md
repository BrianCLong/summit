# Sprint 26 — Golden Path: Quality + Governance (Jan 5–16, 2026)

> Copy/paste ready for GitHub Issues. Keep a single owner per issue and link CI runs/evidence as you land scope.

## Issue Template

- **Dates:** Mon Jan 5 → Fri Jan 16, 2026 (2 weeks)
- **Theme:** Turn v4.0.3 test infra momentum into compounding reliability + policy-governed releases.
- **Sprint Goal:** Ship a release where (1) suite pass rate >70%, (2) lint warnings burn down toward <5,000, (3) every build emits auditable evidence (SBOM + vuln report + provenance) with enforced policy gates.
- **Primary Golden Path:** `make bootstrap && make up && make smoke` — stop the line on failure.
- **Links:** [Release v4.0.3](https://github.com/BrianCLong/summit/releases/tag/v4.0.3), [Golden Path workflow](https://github.com/BrianCLong/summit)

---

## Success Criteria (exit gates)

- ✅ Suite pass rate >70% and trending upward; core pipeline gates green on `main`.
- ✅ Lint warnings reduced by ≥2,500 (stretch 5,000) with no new top-3 warning categories without waiver.
- ✅ Each main build publishes SBOM + vuln report + provenance in predictable artifact paths; release notes link to the evidence bundle.
- ✅ Canary rollback drill executed with runbook evidence; canary SLO/error-budget trigger defined.

---

## Track A — Quality & Test Reliability (now-value)

- **Objective:** Raise confidence in shipping and reduce flake/false-red CI.
- [ ] Stabilize Jest/ESM compatibility across monorepo; extend v4.0.3 mock strategy (node-fetch, apollo-server-express, transformIgnorePatterns) consistently; add "known ESM offenders" allowlist + regression tests.
- [ ] Flake hunt + quarantine: identify top flaky suites from CI logs; quarantine with expiry ticket; add CI job emitting flaky frequency JSON artifact.
- [ ] Golden Path smoke coverage: expand `make smoke` to assert `/health`, `/health/detailed`, `/health/ready` in compose/K8s-like env with clear fail-fast logs.
- **Evidence:** `.evidence/sprint-26/test-report.json` + CI links in release notes.

## Track B — Lint Warning Burn-Down + Type Safety (enduring moat)

- **Objective:** Convert lint noise into signal and remove largest repeat offenders.
- [ ] Implement typed GraphQL Context interfaces in resolvers to attack `no-explicit-any`; enforce "temporary any" inline rationale + issue reference.
- [ ] Unused vars/imports cleanup: underscore prefixes where valid; remove dead imports.
- [ ] `no-console` → structured logger (with allowlist); console allowed in CLI tools only; runtime requires logger wrapper with trace IDs when available.
- **Evidence:** `.evidence/sprint-26/lint-delta.md` with before/after counts + top buckets.

## Track C — Release Evidence + Supply Chain Gates (core)

- **Objective:** Every release candidate carries evidence + enforced policy gates.
- [ ] SBOM generation in CI (CycloneDX or equivalent) for backend + frontend artifacts.
- [ ] Provenance attestation aligned with reproducible inputs (pinned SHAs, lockfiles).
- [ ] Vulnerability gating: enforce "prod deps: 0 vulns"; create policy exception path for dev-only transitive alerts.
- [ ] Policy pack scaffolding: minimal OPA/ABAC-style policy bundle interface (initially CI admission).
- **Evidence:** Every main build publishes SBOM + vuln report + provenance; release notes link evidence bundle.

## Track D — Canary + Auto-Rollback Operationalization

- **Objective:** Make canary + auto-rollback operationally dependable.
- [ ] Define canary SLO + error-budget trigger.
- [ ] Add synthetic probe exercising canary path.
- [ ] Update runbook: rollback in minutes with exact commands, owners, verification steps; link from release process docs.
- **Evidence:** Canary rollback exercised in staging-like env with evidence log; RUNBOOK entry linked.

---

## Issue Structure (recommended)

Create one GitHub issue per track item, plus one umbrella issue for sprint coordination.

**Issue labels**

- `sprint-26`, `quality`, `lint`, `security`, `governance`, `sre`, `ci`, `policy`

**Issue checklist template (paste into each issue)**

- [ ] Problem statement + why it blocks sprint gate
- [ ] Scope (in/out) + acceptance criteria
- [ ] Evidence artifact path(s)
- [ ] Tests/verification plan
- [ ] Rollback plan
- [ ] Owner + backup DRI

---

## Definition of Done (applies to every issue)

- [ ] Acceptance criteria satisfied and linked evidence artifact(s) uploaded.
- [ ] CI gates green on branch and on `main`.
- [ ] Risk/rollback documented in issue.
- [ ] Release notes updated when affecting external behavior.

---

## Evidence & Artifact Map

- Tests: `.evidence/sprint-26/test-report.json`
- Lint delta: `.evidence/sprint-26/lint-delta.md`
- Canary drill log: `.evidence/sprint-26/canary-drill.log`
- SBOMs: `.evidence/sprint-26/sbom/*.json`
- Vulnerability report: `.evidence/sprint-26/vuln-report.json`
- Provenance: `.evidence/sprint-26/provenance.json`

---

## Risks & Mitigations

- **Risk:** ESM/Jest fixes regress other suites.
  - **Mitigation:** Introduce allowlist + regression tests; roll out changes per package.
- **Risk:** Lint churn increases without clear guardrails.
  - **Mitigation:** Enforce "temporary any" waivers with issue link; track top-3 buckets weekly.
- **Risk:** Evidence gates slow delivery without clear UX.
  - **Mitigation:** Human-readable policy gate output + short “fix it” runbook.

---

## Cadence & Checkpoints

- Day 1 (Mon): Sprint kickoff + risk review (what can break Golden Path).
- Day 3 (Wed): Mid-sprint evidence check — lint delta + test delta in `.evidence/`.
- Day 8 (Wed): Canary drill (staging) + attach runbook evidence.
- Day 10 (Fri): Release candidate cut + evidence bundle attached.

---

## Non-Goals

- No large new feature modules, major rewrites, or broad refactors outside test/lint/security gates.

## Roles (suggested loadout)

- BE (2): test stabilization, GraphQL Context typing.
- FE (1): lint cleanup in UI + smoke coverage for UI-dependent APIs.
- SRE (1): canary SLOs, synthetic probes, rollback runbook.
- Security/Platform (1): SBOM/provenance/vuln gating + policy pack scaffolding.
- **If constrained:** Prioritize Tracks A + C first; Track B as "top offenders" tranche.

## Acceptance + Evidence Reminders

- Attach artifacts under `.evidence/sprint-26/` (tests, lint delta, canary drill logs).
- When quarantining tests, include expiry issue/ticket and note in CI artifact.
- Policy gates must emit human-readable failure output; merges blocked on gate failure.
