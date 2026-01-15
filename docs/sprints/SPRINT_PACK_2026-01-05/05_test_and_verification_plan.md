# Test & Verification Plan

## Local Verification Checklist (Run in Order)

1. **Boundary guardrail**
   - `node scripts/check-boundaries.cjs`
   - Expected: no boundary violations.

2. **Server unit tests (targeted)**
   - `pnpm --filter intelgraph-server test -- --runTestsByPath tests/middleware/auth.test.ts src/services/__tests__/AuthService.test.ts`
   - `pnpm --filter intelgraph-server test -- --runTestsByPath src/repos/__tests__/ProductIncrementRepo.test.ts src/repos/__tests__/EntityRepo.test.ts src/repos/__tests__/RelationshipRepo.test.ts`
   - `pnpm --filter intelgraph-server test -- --runTestsByPath src/services/strategic-framework/__tests__/StrategicFramework.test.ts`
   - `pnpm --filter intelgraph-server test -- --runTestsByPath tests/governance-acceptance.test.ts`
   - `pnpm --filter intelgraph-server test -- --runTestsByPath src/analytics/anomalies/__tests__/AnomalyDetector.comprehensive.test.ts src/publishing/__tests__/proof-carrying-publishing.test.ts`

3. **Audit log integrity tests**
   - `pnpm --filter intelgraph-server test -- --runTestsByPath <audit tests added in PR 5>`
   - Expected: append-only persistence and hash chain validation.

4. **Full server test suite (release gate)**
   - `pnpm --filter intelgraph-server test`
   - Expected: all tests pass; no TS compilation failures.

5. **Golden path (GA readiness)**
   - `make smoke`
   - Expected: smoke tests succeed.

## Security & Compliance Checks

- **Secret scan signal check:**
  - `rg -n "AKIA[0-9A-Z]{16}" -S server/src`
  - Expected: no runtime key patterns in server code.

- **Dependency audit (signal check):**
  - `pnpm audit --prod`
  - Expected: audit completes; if it flags vulnerabilities, open follow-on issues with CVE references.
  - Status: **Deferred pending audit completion** in this environment.

## CI Verification (Required)

- `pr-quality-gate.yml`
- `ga-ready.yml`
- `release-integrity.yml`
- `supply-chain-integrity.yml`

## Evidence Artifacts

- Capture `pnpm` test logs and attach to `artifacts/` when running in CI.
- Update `docs/roadmap/STATUS.json` after fixes are merged.
