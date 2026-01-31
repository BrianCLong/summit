# Task: Summit Day Captain Execution Plan - 2026-01-30 (Mission 3)

## Roadmap (TODAY_PLAN)
- [ ] T1: Restore Environment Health (Fix EPERM/node_modules) (Verifying) <!-- id: 1 -->
- [ ] T2: Fix `server` Build Isolation (ESM/Feature Flags) <!-- id: 2 -->
- [ ] T3: Integrate `api-gateway` into `docker-compose.dev.yaml` <!-- id: 3 -->
- [x] T4: Verify `make smoke` (K6 Tests) <!-- id: 4 -->
- [/] T5: Security Triage & Remediation (Mission 4)
    - [x] 1. Snapshot Top Alerts (Dependabot/CodeQL)
    - [x] 2. Select FIRST_PR (High Leverage, Low Blast Radius: ReDoS #19924)
    - [x] 3. Implement & Verify ReDoS Fix
        - [x] Planning
        - [x] Implementation/Verification
        - [x] Atomic PR [#17431](https://github.com/BrianCLong/summit/pull/17431)

## Execution: T1 (Environment Health)
- [ ] Run `pnpm install` to fix sylinks/permissions (BLOCKED: EPERM)
- [ ] Verify `server` build script runs (even if it fails logic, it shouldn't fail EPERM)

## Execution: T2 (Server Build)
- [x] Analyze `server/build.mjs` and imports
- [x] Fix `@intelgraph/feature-flags` resolution or build config (Switched to bundle: true)
- [ ] Verify `pnpm build` in `server` succeeds (Pending T1)

## Execution: T3 (Gateway Integration)
- [x] Add `api-gateway` service to `docker-compose.dev.yaml` (Confirmed existing)
- [x] Create `Dockerfile.gateway` if missing or reuse existing (Fixed `libs` -> `packages` path)
- [x] Ensure `api-gateway` connects to `neo4j` and `server`
- [x] Add `typesense` service to `docker-compose.dev.yaml` (Was missing)
- [x] Add `opa` service with permissive policy to `docker-compose.dev.yaml` (For dev authz)

## Execution: T4 (Security Triage)
- [x] Select P0 Fix: Pin `aquasecurity/trivy-action` in `deploy-aws.yml` (Critical RCE Risk) <!-- id: 5 -->
- [x] Create branch `fix/pin-actions-trivy` <!-- id: 6 -->
- [x] Apply fix (pin to SHA) <!-- id: 7 -->
- [x] Push branch to origin <!-- id: 8 -->

## Execution: T2 & T3 (Code Complete - Verification Blocked)
- [x] Fix `server` build config (T2)
- [x] Integrate `api-gateway` (T3)
- [ ] Verify `pnpm build` in `server` succeeds (Blocked by EPERM on node_modules)
- [ ] Verify `api-gateway` runtime (Blocked by EPERM on .env)

## Execution: T1 (Environment Health - Critical Blocker)
- [ ] Run `pnpm install` to fix sylinks/permissions (User intervened, still failing)
- [ ] Verify `server` build script runs (Failed)
## Execution: T5 (Atomic PRs & CI Verification) [x]
- [x] PR A (T4): [Pin Trivy action SHA](https://github.com/BrianCLong/summit/pull/17373) - **MERGED**
- [x] PR D (T5): [CI Preflight Workflow](https://github.com/BrianCLong/summit/pull/17374) - **MERGED**
- [x] PR E (T6): [CI Path Optimization](https://github.com/BrianCLong/summit/pull/17382) - **MERGED**
- [x] PR F (T7): [CI Concurrency Control](https://github.com/BrianCLong/summit/pull/17385) - **MERGED**
- [x] PR B (T2): [Server Build Bundling Fix](https://github.com/BrianCLong/summit/pull/17375) - **MERGED**
- [x] PR C (T3): [Gateway integration](https://github.com/BrianCLong/summit/pull/17376) - **MERGED**
- [x] Verify atomic branch integrity (Checked in /tmp/summit-repair)
- [x] Push all branches to origin
- [ ] **POST-MERGE: CI Drain Triage**
    - [ ] 1. Monitor `ci-preflight` failures (compose/server/gateway)
    - [ ] 2. Monitor `repo-hygiene` failures (P0 regressions)
    - [ ] 3. Triage `security scanning` (code scanning / Dependabot)
    - [ ] 4. Check for `cancelled` jobs (superseded/concurrency)
