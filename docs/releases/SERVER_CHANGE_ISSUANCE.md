# Server Change Issuance Worksheet

**Generated:** 2026-01-08T23:50:00Z
**Total Changes:** 417 files
**Target Branch:** `server/post-ga-stabilization-batches`

---

## Batch Summary

| Batch | Name                | Files | Risk | Purpose                         |
| ----- | ------------------- | ----- | ---- | ------------------------------- |
| A     | Test Infrastructure | 33    | P2   | Mocks, fixtures, Jest setup     |
| B     | Unit Tests          | 270   | P2   | Test file updates and additions |
| C     | Middleware          | 3     | P1   | Auth, rate limiting, ABAC       |
| D     | Services            | 12    | P1   | Business logic services         |
| E     | Core/Lib            | 27    | P0   | DB, graph, conductor, lib       |
| F     | Config              | 2     | P2   | package.json, settings          |
| G     | Data/Schemas        | 14    | P2   | Governance schemas, metering    |
| H     | Docs                | 7     | P2   | Reports, audit docs             |
| I     | Runtime Source      | 51    | P1   | Various runtime source files    |

---

## Batch Details

### Batch A: Test Infrastructure

**Owner:** Platform Team
**Purpose:** Update test mocks, fixtures, and Jest configuration
**Risk Level:** P2 (Low) - Tests only, no runtime impact
**PR Title:** `test(server): update test infrastructure mocks and fixtures`

**Verification Commands:**

```bash
pnpm --filter intelgraph-server test:unit --passWithNoTests
pnpm --filter intelgraph-server typecheck
```

**Files (33):**

- `server/tests/mocks/*.ts` - Mock implementations
- `server/tests/fixtures/**/*` - Test fixtures
- `server/jest.config.ts` - Jest configuration
- `server/tests/setup/*.cjs` - Test setup files

**CI Jobs Affected:**

- Unit Tests & Coverage
- CI Core (Primary Gate)

---

### Batch B: Unit Tests

**Owner:** Platform Team
**Purpose:** Test improvements, new test coverage, determinism fixes
**Risk Level:** P2 (Low) - Tests only, no runtime impact
**PR Title:** `test(server): improve unit test coverage and determinism`

**Verification Commands:**

```bash
pnpm --filter intelgraph-server test:unit
pnpm --filter intelgraph-server typecheck
```

**Files (270):**

- `server/src/**/__tests__/*.test.ts` - Unit tests
- `server/tests/**/*.test.ts` - Integration tests

**CI Jobs Affected:**

- Unit Tests & Coverage
- CI Core (Primary Gate)

---

### Batch C: Middleware

**Owner:** Security Team
**Purpose:** Auth, rate limiting, and ABAC middleware updates
**Risk Level:** P1 (Medium) - Affects request pipeline
**PR Title:** `fix(server): update middleware auth and rate limiting`

**Verification Commands:**

```bash
pnpm --filter intelgraph-server test:unit --testPathPattern="middleware|auth"
pnpm --filter intelgraph-server typecheck
pnpm --filter intelgraph-server build
```

**Files (3):**

- `server/src/middleware/TieredRateLimitMiddleware.ts`
- `server/src/middleware/opa-abac.ts`
- `server/src/conductor/auth/rbac-middleware.ts`

**CI Jobs Affected:**

- CI Verify (Security & Compliance)
- Unit Tests & Coverage

**Rollback:** Revert commit, no migration required

---

### Batch D: Services

**Owner:** Platform Team
**Purpose:** Business logic service updates
**Risk Level:** P1 (Medium) - Runtime behavior changes
**PR Title:** `refactor(server): update service implementations`

**Verification Commands:**

```bash
pnpm --filter intelgraph-server test:unit --testPathPattern="services"
pnpm --filter intelgraph-server typecheck
pnpm --filter intelgraph-server build
```

**Files (12):**

- `server/src/services/CostOptimizationService.ts`
- `server/src/services/DefensivePsyOpsService.ts`
- `server/src/services/QuantumResistantCryptoService.ts`
- `server/src/services/RedTeamSimulator.ts`
- `server/src/services/SOC2ComplianceService.ts`
- `server/src/services/SimilarityService.ts`
- `server/src/services/SynonymService.ts`
- `server/src/services/er/guardrails.ts`
- `server/src/services/queryResultCache.ts`
- `server/src/services/EntityCorrelationEngine.ts` (new)
- `server/src/services/RelationshipService.ts` (new)

**CI Jobs Affected:**

- Unit Tests & Coverage
- CI Core (Primary Gate)

**Rollback:** Revert commit, no migration required

---

### Batch E: Core/Lib

**Owner:** Platform Team
**Purpose:** Database, graph, conductor, and library updates
**Risk Level:** P0 (High) - Foundational infrastructure
**PR Title:** `refactor(server): update core library and database modules`

**Verification Commands:**

```bash
pnpm --filter intelgraph-server test:unit
pnpm --filter intelgraph-server typecheck
pnpm --filter intelgraph-server build
pnpm ga:verify:server
```

**Files (27):**

- `server/lib/config/*.ts` - Configuration management
- `server/lib/deployment/*.ts` - Deployment orchestration
- `server/lib/secrets/*.ts` - Secret management
- `server/src/db/*.ts` - Database connections
- `server/src/graph/**/*.ts` - Graph operations
- `server/src/conductor/**/*.ts` - Conductor runtime
- `server/src/graphql/**/*.ts` - GraphQL layer

**CI Jobs Affected:**

- CI Core (Primary Gate)
- CI Verify (Security & Compliance)
- Unit Tests & Coverage

**Rollback:** Requires careful verification; may need DB connection testing

---

### Batch F: Config

**Owner:** Platform Team
**Purpose:** Dependency and configuration updates
**Risk Level:** P2 (Low) - Config only
**PR Title:** `chore(server): update dependencies and configuration`

**Verification Commands:**

```bash
pnpm install
pnpm --filter intelgraph-server typecheck
pnpm --filter intelgraph-server build
```

**Files (2):**

- `package.json`
- `.claude/settings.local.json`

**CI Jobs Affected:**

- All jobs (dependency changes)

**Rollback:** Revert commit, run `pnpm install`

---

### Batch G: Data/Schemas

**Owner:** Platform Team
**Purpose:** Governance schemas and metering data
**Risk Level:** P2 (Low) - Static data only
**PR Title:** `chore(server): update governance schemas and metering data`

**Verification Commands:**

```bash
pnpm --filter intelgraph-server typecheck
```

**Files (14):**

- `server/data/metering/events.jsonl`
- `server/server/data/governance/schemas/*.json`

**CI Jobs Affected:**

- Governance Policy Validation

**Rollback:** Revert commit

---

### Batch H: Docs

**Owner:** Platform Team
**Purpose:** CI audit reports and workflow documentation
**Risk Level:** P2 (Low) - Documentation only
**PR Title:** `docs: add CI audit reports and workflow documentation`

**Verification Commands:**

```bash
# No verification needed for docs
```

**Files (7):**

- `CI_AUDIT_CHANGES.md`
- `CI_HARDENING_AUDIT_REPORT.md`
- `OPTIMIZATION_SUMMARY.txt`
- `WORKFLOW_CHANGES.md`
- `WORKFLOW_OPTIMIZATION_REPORT.md`
- `SECURITY/sigstore-identity-policy.yml`
- `scripts/ci/validate-workflow-filters.sh`

**CI Jobs Affected:**

- None

**Rollback:** Revert commit

---

### Batch I: Runtime Source

**Owner:** Platform Team
**Purpose:** Various runtime source file updates
**Risk Level:** P1 (Medium) - Runtime behavior changes
**PR Title:** `refactor(server): update runtime source modules`

**Verification Commands:**

```bash
pnpm --filter intelgraph-server test:unit
pnpm --filter intelgraph-server typecheck
pnpm --filter intelgraph-server build
```

**Files (51):**

- Analytics: `server/src/analytics/telemetry/*.ts`
- Audit: `server/src/audit/*.ts`
- Cache: `server/src/cache/*.ts`
- Cases: `server/src/cases/workflow/**/*.ts`
- Governance: `server/src/governance/**/*.ts`
- Maestro: `server/src/maestro/*.ts`
- Metering: `server/src/metering/*.ts`
- NLP: `server/src/nlp/*.ts`
- Observability: `server/src/observability/**/*.ts`
- Provenance: `server/src/provenance/*.ts`
- Publishing: `server/src/publishing/*.ts`
- Security: `server/src/security/**/*.ts`
- Others: Various utility and feature modules

**CI Jobs Affected:**

- CI Core (Primary Gate)
- Unit Tests & Coverage

**Rollback:** Revert commit

---

## Recommended PR Order

1. **Batch H (Docs)** - Zero risk, fast merge
2. **Batch F (Config)** - Low risk, needed for builds
3. **Batch G (Data)** - Low risk, static data
4. **Batch A (Test Infra)** - Low risk, enables other tests
5. **Batch B (Tests)** - Low risk, improves coverage
6. **Batch C (Middleware)** - Medium risk, security review needed
7. **Batch D (Services)** - Medium risk, business logic
8. **Batch I (Runtime)** - Medium risk, various modules
9. **Batch E (Core/Lib)** - High risk, foundational - last

---

## Verification Checklist

- [ ] All batches pass `pnpm --filter intelgraph-server typecheck`
- [ ] All batches pass `pnpm --filter intelgraph-server test:unit`
- [ ] Batch E passes `pnpm ga:verify:server`
- [ ] No secrets in any commit (gitleaks passes)
- [ ] Each PR is independently revertible

---

## Notes

- Batch B (270 test files) may need to be split further if CI times out
- Batch E (Core/Lib) should be reviewed by senior engineers
- Consider running Batch C through security review before merge
