# GA COMPLETION EXECUTION PLAN
**Agent:** Claude Code GA Completion Agent
**Plan Version:** 1.0
**Target:** Summit MVP-4 → General Availability
**Execution Mode:** Zero-Defect, Zero-Tolerance

---

## EXECUTION STRATEGY

### Principles
1. **Dependency-Ordered:** Changes sequenced to avoid breaking dependencies
2. **Atomic:** Each change is independently verifiable
3. **Blocking-First:** Fix CI gates before fixing code they should catch
4. **Security-First:** Credentials and auth before features
5. **Test-Driven:** Add/fix tests before changing implementation
6. **Evidence-Based:** Every change produces verifiable proof

### Success Criteria
- All CI gates blocking and deterministic
- Zero hardcoded credentials
- Zero HTTP 501 endpoints
- Zero optional security controls
- All documentation accurate
- GA Readiness Score ≥90/100

---

## PHASE 4: IMPLEMENTATION (150+ Changes)

### WAVE 1: CI/CD HARDENING (Foundational) [PRIORITY: CRITICAL]

**Rationale:** Fix gates first so they catch issues in subsequent waves.

#### W1.1: Fix Unit Test Gate Bypass
**File:** `/.github/workflows/ci-core.yml`
**Change:** Remove `continue-on-error: ${{ matrix.test-suite == 'unit' }}`
**Impact:** Unit test failures will block merges
**Verification:** Commit broken test, verify CI blocks
**Estimated Effort:** 5 minutes
**Depends On:** None

#### W1.2: Enforce Migration Gate
**Files:**
- `/.github/workflows/pr-gates.yml`
- Create `/scripts/check-migration-gate.sh`
**Changes:**
- Auto-detect migration file changes (don't rely on env var)
- Fail hard if migrations changed without migration plan
- Require `MIGRATION_PLAN.md` in PR if schema changes detected
**Verification:** Change migration, verify gate blocks without plan
**Estimated Effort:** 30 minutes
**Depends On:** None

#### W1.3: Enable GraphQL Schema Compatibility Blocking
**File:** `/.github/workflows/ci-verify.yml`
**Changes:**
- Fix graphql-inspector loader issues OR replace with alternative tool
- Make schema check blocking (`continue-on-error: false`)
- Add breaking change detection to PR comments
**Verification:** Introduce breaking schema change, verify CI blocks
**Estimated Effort:** 1 hour (if fixing loader) OR 2 hours (if replacing tool)
**Depends On:** None

#### W1.4: Enable Policy Compliance Blocking
**Files:**
- `/.github/workflows/mvp4-gate.yml`
- `/.github/workflows/ci-verify.yml`
- `/policies/**/*.rego`
**Changes:**
- Update OPA to latest version (remove legacy Rego dependency)
- Modernize Rego syntax in all policy files
- Enable blocking (`continue-on-error: false`)
- Uncomment policy checks in gate aggregator
**Verification:** Violate policy, verify CI blocks
**Estimated Effort:** 2 hours
**Depends On:** None

#### W1.5: Enable Governance Checks Blocking
**File:** `/.github/workflows/ci-verify.yml`
**Changes:**
- Stabilize governance engine (fix known issues)
- Enable blocking (`continue-on-error: false`)
- Add governance drift detection
**Verification:** Violate governance rule, verify CI blocks
**Estimated Effort:** 1 hour
**Depends On:** W1.4 (policy compliance)

#### W1.6: Make Critical Security Scanning Blocking
**Files:**
- `/.github/workflows/ci-security.yml`
- `/.github/workflows/ga-risk-gate.yml`
**Changes:**
- Trivy filesystem scan: block on HIGH/CRITICAL
- Container scan: remain blocking
- CodeQL: block on HIGH/CRITICAL SAST findings
- Semgrep: block on security policy violations
- Keep DAST/Checkov/CIS advisory (environmental dependencies)
**Verification:** Introduce HIGH vuln, verify CI blocks
**Estimated Effort:** 1 hour
**Depends On:** None

#### W1.7: Add E2E Tests to Blocking Gates
**Files:**
- `/.github/workflows/ci-core.yml` OR create `/.github/workflows/ci-e2e.yml`
- `/e2e/**/*.spec.ts`
**Changes:**
- Identify critical E2E tests (top 10 user flows)
- Add E2E job to ci-core or create dedicated workflow
- Make blocking for PRs to main/release branches
- Fix disabled E2E tests or remove them
**Verification:** Break critical flow, verify E2E catches it
**Estimated Effort:** 2 hours
**Depends On:** None

**Wave 1 Total:** ~8 hours, 7 changes
**Wave 1 Verification:** All CI gates green and blocking

---

### WAVE 2: CREDENTIAL ERADICATION (Security) [PRIORITY: CRITICAL]

**Rationale:** Remove all hardcoded secrets before they leak.

#### W2.1: Remove Hardcoded Database Passwords
**Files:** (15 files)
- `/apps/workflow-engine/src/config.ts:16,27`
- `/apps/graph-analytics/src/config.ts:16,27`
- `/apps/analytics-engine/src/config.ts:16,27`
- `/apps/ml-engine/src/config.ts:16,27`
- `/deepagent-mvp/src/config.ts:11,17`
- `/services/warehouse-service/src/index.ts:28`
- (+ 9 more files)

**Changes:**
- Replace `|| 'password'` with exit-on-missing pattern
- Add to production guardrails check in `/server/src/config.ts`
- Validate `POSTGRES_PASSWORD` is set and secure (≥16 chars)
- Update `.env.example` with placeholder

**Pattern:**
```typescript
const password = process.env.POSTGRES_PASSWORD;
if (!password || password.length < 16) {
  console.error('POSTGRES_PASSWORD must be set with ≥16 characters');
  process.exit(1);
}
```

**Verification:**
- Start service without env var → exits with error
- Start with weak password → exits with error
- Add test: `config_guardrails.test.ts` validates rejection

**Estimated Effort:** 1 hour
**Depends On:** None

#### W2.2: Remove Hardcoded JWT Secrets
**Files:** (12 files)
- `/apps/workflow-engine/src/config.ts:63,91`
- `/apps/graph-analytics/src/config.ts:93`
- `/deepagent-mvp/src/config.ts:19`
- `/services/edge-gateway/src/middleware/auth.ts:4`
- (+ 8 more files)

**Changes:**
- Replace `|| 'workflow-engine-secret'` with exit-on-missing
- Reuse existing production guardrail pattern from `/server/src/config.ts`
- Require ≥32 characters, no insecure tokens

**Verification:**
- Same pattern as W2.1
- Integration test: service fails to start without secure JWT_SECRET

**Estimated Effort:** 1 hour
**Depends On:** W2.1 (same pattern)

#### W2.3: Remove Hardcoded API Keys
**Files:** (8 files)
- `/workers/ingest/src/connectors/HTTPConnector.ts:387`
- `/packages/maestro-cli/src/commands/run.ts:236`
- `/packages/federated-campaign-radar/src/index.ts:103`
- `/packages/shared/provenance.ts:11`
- (+ 4 more files)

**Changes:**
- Remove `|| 'demo-api-key'` fallbacks
- Exit if API key required but not set
- For optional features, gracefully disable (not default to demo key)

**Verification:**
- Service fails to start if key required
- Optional features log warning and disable gracefully

**Estimated Effort:** 45 minutes
**Depends On:** W2.1

#### W2.4: Secure Hardcoded Private Key
**File:** `/tools/legal/ltdim/index.ts:159`
**Current:** Hardcoded RSA private key with `TODO: Load from a secure location`

**Changes:**
- Load from environment variable `LTDIM_PRIVATE_KEY_PATH`
- Support file path or inline PEM
- Exit if not provided
- Add to `.env.example`

**Verification:**
- Tool fails without key
- Tool works with valid key from env

**Estimated Effort:** 30 minutes
**Depends On:** W2.1

#### W2.5: Remove Test Credentials from Production Code
**Files:**
- `/e2e/fixtures/test-data.ts:4,9,14`
- `/tests/e2e/tests/auth-setup.spec.ts:16,17`

**Changes:**
- Keep test passwords in test files (acceptable)
- Ensure test files never imported by production code
- Add CI check: `grep -r "password123" server/src/ client/src/` returns empty

**Verification:**
- CI fails if test credentials found in src/
- E2E tests still pass with test fixtures

**Estimated Effort:** 20 minutes
**Depends On:** None

#### W2.6: Update .env.example with All Required Secrets
**File:** `/.env.example`

**Changes:**
- Add all required environment variables with secure placeholders
- Document minimum requirements (length, entropy)
- Add comments explaining each variable's purpose

**Verification:**
- All services can start with `.env.example` values replaced with secure randoms
- No service starts with example values unchanged

**Estimated Effort:** 30 minutes
**Depends On:** W2.1-W2.5

**Wave 2 Total:** ~4.5 hours, 60+ file changes
**Wave 2 Verification:** `grep -r "password\|secret.*=.*['\"]" --include="*.ts" --include="*.js" src/` returns ONLY test files

---

### WAVE 3: SECURITY CONTROL HARDENING [PRIORITY: CRITICAL]

**Rationale:** Ensure security cannot be bypassed.

#### W3.1: Remove Policy Enforcement DISABLED Option
**File:** `/src/security/ZeroTrustArchitecture.ts`

**Current:**
```typescript
if (policy.enforcement === 'DISABLED') continue;
```

**Changes:**
- Remove `DISABLED` from enforcement enum
- Migrate any disabled policies to `AUDIT_ONLY` (logs violation but doesn't block)
- Update all policy definitions
- Add migration guide if policies need to be temporarily non-blocking

**Verification:**
- TypeScript compilation fails if 'DISABLED' used
- All policies either ENFORCED or AUDIT_ONLY

**Estimated Effort:** 45 minutes
**Depends On:** W1.4 (policy compliance)

#### W3.2: Make Security Triggers Always Enabled
**File:** `/agents/governance/src/rollback/RollbackManager.ts:151`

**Current:**
```typescript
if (!triggerConfig || !triggerConfig.enabled) { return false; }
```

**Changes:**
- Remove `enabled` flag from security trigger configs
- Security triggers always active
- Non-security triggers can still be disabled
- Classify all triggers as security or operational

**Verification:**
- Security triggers fire even if config missing
- Test: disable security trigger in config → still triggers

**Estimated Effort:** 1 hour
**Depends On:** None

#### W3.3: Enforce Production Auth (Remove Dev Bypass)
**File:** `/companyos/services/tenant-api/src/middleware/authContext.ts:194`

**Current:**
```typescript
if (process.env.NODE_ENV !== 'production') {
  // Create stub user
}
```

**Changes:**
- Remove NODE_ENV check (too easy to misconfigure)
- Add explicit `ALLOW_AUTH_BYPASS=true` flag
- Default to fail-closed
- Log warning if bypass enabled
- Add to production guardrails check

**Verification:**
- Production build fails to start with bypass enabled
- Development explicitly requires opt-in to bypass
- Audit log records bypass usage

**Estimated Effort:** 30 minutes
**Depends On:** W2.1 (credential pattern)

#### W3.4: Enforce GraphQL Introspection Filtering in All Environments
**File:** `/gateway/src/plugins/persisted.ts:17`

**Current:**
```typescript
if (process.env.NODE_ENV !== 'production') return;
```

**Changes:**
- Apply introspection filtering in all environments
- Add explicit `ENABLE_GRAPHQL_INTROSPECTION=true` flag for development
- Default to disabled
- Log introspection attempts

**Verification:**
- GraphQL introspection blocked by default
- Can be enabled via explicit flag
- Introspection attempts logged

**Estimated Effort:** 20 minutes
**Depends On:** None

#### W3.5: Add Fail-Closed Verification Tests
**New File:** `/server/tests/security/fail-closed-enforcement.test.ts`

**Tests:**
- All security middleware fails closed (401/403, not 500 or bypass)
- Policy enforcement fails closed
- Auth bypass prevented in production
- Security triggers cannot be disabled

**Verification:**
- Test suite passes
- Part of ci-core blocking gate

**Estimated Effort:** 1 hour
**Depends On:** W3.1-W3.4

**Wave 3 Total:** ~3.5 hours, 5 changes
**Wave 3 Verification:** Security tests pass, no bypassable controls

---

### WAVE 4: API COMPLETION (Features) [PRIORITY: HIGH]

**Rationale:** Implement or remove promised endpoints.

#### W4.1: Workflow Engine - Implement or Remove CRUD Operations
**File:** `/apps/workflow-engine/src/server.ts:192,203,277,291,325`

**Decision Matrix:**
- **If needed for GA:** Implement update, delete, cancel, retry, human tasks
- **If not needed:** Remove routes, update API docs to reflect create-only

**Recommended:** Remove for GA, implement in future version

**Changes (if removing):**
- Delete unimplemented routes
- Update OpenAPI spec
- Update client SDK
- Add deprecation notice in docs
- Return 404 instead of 501

**Changes (if implementing):**
- Implement each operation with full tests
- Add authorization checks
- Add audit logging
- Update OpenAPI spec

**Verification:**
- No 501 responses
- API docs match implementation
- Client SDK updated

**Estimated Effort:** 2 hours (remove) OR 16 hours (implement all)
**Depends On:** Product decision

#### W4.2: Graph Analytics - Implement or Remove Algorithms
**File:** `/apps/graph-analytics/src/server.ts:612,630,646`

**Endpoints:**
- Centrality analysis
- Community detection
- Motif detection

**Decision:** Remove for GA (complex algorithms, not core)

**Changes:**
- Delete unimplemented routes
- Update API docs
- Add to backlog for future implementation

**Verification:**
- No 501 responses
- Docs accurate

**Estimated Effort:** 1 hour
**Depends On:** None

#### W4.3: Feed Processor - Implement or Remove Update
**File:** `/apps/feed-processor/src/server.ts:224`

**Decision:** Implement (simple CRUD operation)

**Changes:**
- Implement update feed source endpoint
- Validate input
- Add authorization
- Add tests

**Verification:**
- Update endpoint works
- Tests pass

**Estimated Effort:** 2 hours
**Depends On:** None

#### W4.4: Analytics Engine - Implement or Remove API Data Sources
**File:** `/apps/analytics-engine/src/services/DashboardService.ts:571`

**Decision:** Remove for GA (advanced feature)

**Changes:**
- Remove route
- Update docs
- Add to backlog

**Verification:**
- No 501 response

**Estimated Effort:** 30 minutes
**Depends On:** None

#### W4.5: PDF Export - Implement or Remove
**File:** `/apps/analytics-engine/src/server.ts:462`

**Decision:** Implement (common enterprise requirement)

**Changes:**
- Add PDF generation library (e.g., puppeteer or pdfkit)
- Implement export endpoint
- Add authorization
- Add tests
- Update docs

**Verification:**
- PDF export works
- Renders correctly

**Estimated Effort:** 4 hours
**Depends On:** None

#### W4.6: Remove All Remaining 501 Endpoints
**Files:** Multiple

**Process:**
- Grep for `res.status(501)` or `throw.*501` or `Not implemented`
- For each: implement or remove
- Update documentation

**Verification:**
- `grep -r "501" --include="*.ts" --include="*.js" src/` returns only test files

**Estimated Effort:** 2 hours
**Depends On:** W4.1-W4.5

**Wave 4 Total:** ~11.5 hours (if removing most), 30+ changes
**Wave 4 Verification:** Zero HTTP 501 responses, API docs accurate

---

### WAVE 5: INTEGRATION COMPLETENESS [PRIORITY: HIGH]

**Rationale:** Replace stubs with real implementations.

#### W5.1: Implement SCIM Sync or Document Limitation
**File:** `/apps/gateway/src/rbac/scim.ts:2`

**Decision:** Implement basic SCIM 2.0 user/group sync

**Changes:**
- Implement SCIM 2.0 endpoints (Users, Groups)
- Add IdP integration guides (Okta, Azure AD, Google Workspace)
- Add configuration for SCIM bearer token
- Add tests with mock SCIM server
- Update SSO documentation

**Verification:**
- SCIM endpoints respond correctly
- User/group sync works with test IdP
- Integration tests pass

**Estimated Effort:** 8 hours
**Depends On:** W2.2 (JWT secrets)

#### W5.2: Replace OPA Stub with Real Integration
**File:** `/active-measures-module/src/index.ts:6`

**Current:** `import OPA from 'opa'; // OPA package not defined, using placeholder`

**Changes:**
- Install `@open-policy-agent/opa-wasm` or use HTTP API
- Replace stub with real OPA client
- Load policy bundles from `/policies/`
- Add OPA service to docker-compose
- Add integration tests

**Verification:**
- OPA policies evaluated correctly
- Integration tests pass
- No stub imports remain

**Estimated Effort:** 4 hours
**Depends On:** W1.4 (policy compliance)

#### W5.3: Complete Mobile Sync Implementation
**File:** `/apps/gateway/src/mobile/mobileRouter.ts`

**Current:** Mock data, placeholder logic

**Changes:**
- Implement actual sync logic
- Add conflict resolution
- Add offline support
- Add tests
- Update mobile app documentation

**OR Remove:** If mobile not GA scope

**Verification:**
- Mobile sync works end-to-end
- Offline mode functional

**Estimated Effort:** 12 hours (implement) OR 1 hour (remove)
**Depends On:** Product decision

#### W5.4: Fix All "TODO: Implement" in Active Code Paths
**Files:** 120+ instances

**Process:**
- Grep for `TODO.*implement` in non-test files
- Categorize: security, business logic, UI, nice-to-have
- Security: MUST implement
- Business logic: implement or remove feature
- UI: implement or gracefully degrade
- Nice-to-have: remove TODO, add to backlog

**Verification:**
- Security TODOs: all implemented
- Feature TODOs: all resolved (implemented or removed)
- Backlog TODOs: moved to issue tracker

**Estimated Effort:** 16 hours
**Depends On:** W5.1-W5.3

**Wave 5 Total:** ~41 hours (if implementing mobile), 120+ changes
**Wave 5 Verification:** No stub imports, no critical TODOs

---

### WAVE 6: ERROR HANDLING COMPLETENESS [PRIORITY: MEDIUM]

**Rationale:** Proper error handling for production operations.

#### W6.1: Replace Empty Catch Blocks
**Files:** (9 instances)
- `/apps/web/src/pages/admin/FeatureFlags.tsx:243`
- `/client/src/lib/assistant/transport.ts:178`
- `/apps/web/src/components/narrative/ScenarioSimulator.tsx:146`
- `/server/src/analytics/funnels/FunnelService.ts:139`
- (+ 5 more)

**Changes:**
- Log error with context
- Add correlation ID
- Re-throw if critical
- Handle gracefully if non-critical

**Pattern:**
```typescript
catch (error) {
  logger.error('Operation failed', {
    operation: 'parseFeatureFlag',
    error: error.message,
    stack: error.stack,
    correlationId: req.correlationId
  });
  // Re-throw if critical, or return safe default
}
```

**Verification:**
- No empty catch blocks in src/
- Error logging tests pass

**Estimated Effort:** 2 hours
**Depends On:** None

#### W6.2: Add Correlation IDs to All Requests
**Files:**
- `/server/src/middleware/correlation.ts` (create)
- `/server/src/app.ts` (register middleware)

**Changes:**
- Add middleware to generate/extract correlation ID
- Pass through all service calls
- Include in all logs
- Include in error responses

**Verification:**
- All logs have correlationId
- Error responses include correlationId

**Estimated Effort:** 3 hours
**Depends On:** None

#### W6.3: Classify All Error Types
**File:** `/server/src/errors/` (create hierarchy)

**Changes:**
- Define error classes: AuthError, ValidationError, NotFoundError, etc.
- Replace generic throws with typed errors
- Add error codes
- Update error documentation

**Verification:**
- All throws use typed errors
- Error codes documented

**Estimated Effort:** 4 hours
**Depends On:** W6.1

**Wave 6 Total:** ~9 hours, 15+ changes
**Wave 6 Verification:** No empty catches, all errors typed and logged

---

### WAVE 7: TEST COMPLETENESS [PRIORITY: MEDIUM]

**Rationale:** Ensure test suite is deterministic.

#### W7.1: Fix or Remove Skipped Tests
**Files:**
- `/apps/web/tests/tri-pane-view.spec.ts` (9 skipped)
- `/e2e/maestro-run-console.spec.ts` (disabled)

**Process:**
- For each skipped test: fix or delete
- No `test.skip` in main branch
- Move permanently disabled to `.archive/`

**Verification:**
- `grep -r "test.skip\|it.skip\|describe.skip\|xit" tests/ e2e/` returns empty

**Estimated Effort:** 4 hours
**Depends On:** None

#### W7.2: Move Quarantine Tests to Main Suite or Fix
**File:** `/server/jest.quarantine.config.js`

**Process:**
- Fix flaky tests to be deterministic
- Move fixed tests to main suite
- Delete permanently broken tests
- Empty quarantine config

**Verification:**
- Quarantine config empty or deleted
- All tests in main suite deterministic

**Estimated Effort:** 6 hours
**Depends On:** W7.1

#### W7.3: Add Missing Critical Path Tests
**Areas needing tests:**
- Security middleware coverage verification
- Policy enforcement edge cases
- Error handling paths
- Auth failure scenarios

**Verification:**
- Coverage ≥85% on critical paths
- All security controls tested

**Estimated Effort:** 8 hours
**Depends On:** W3.5

**Wave 7 Total:** ~18 hours, 30+ changes
**Wave 7 Verification:** No skipped tests, quarantine empty, coverage ≥85%

---

### WAVE 8: DOCUMENTATION ALIGNMENT [PRIORITY: HIGH]

**Rationale:** Docs must match reality.

#### W8.1: Update API Documentation
**Files:**
- OpenAPI specs
- GraphQL schema documentation
- Client SDK READMEs

**Changes:**
- Remove references to 501 endpoints
- Update authentication flows
- Document all required environment variables
- Add security best practices

**Verification:**
- Docs generate without errors
- No references to unimplemented features

**Estimated Effort:** 4 hours
**Depends On:** W4.6 (API completion)

#### W8.2: Update Security Documentation
**Files:**
- `/SECURITY.md`
- `/SECURITY/threat-models/`
- `/COMPLIANCE_CONTROLS.md`

**Changes:**
- Update threat models to reflect fixes
- Mark controls as COMPLETE (not PARTIAL)
- Document all security configurations
- Remove references to optional security

**Verification:**
- No "PARTIAL" or "PENDING" status on implemented controls
- All security claims verifiable

**Estimated Effort:** 3 hours
**Depends On:** W3.5 (security hardening)

#### W8.3: Update Configuration Documentation
**Files:**
- `README.md`
- `ENTERPRISE-SETUP.md`
- `.env.example`

**Changes:**
- Document all required environment variables
- Add deployment guides
- Update architecture diagrams
- Add troubleshooting section

**Verification:**
- New user can deploy following docs
- All env vars documented

**Estimated Effort:** 3 hours
**Depends On:** W2.6 (env example)

#### W8.4: Update GA Readiness Documentation
**Files:**
- `GA_READINESS_REPORT.md`
- `PROJECT_MANAGEMENT_SATURATION.md`

**Changes:**
- Update all status from PENDING to COMPLETE
- Add evidence links
- Add verification commands
- Document remaining known issues (if any)

**Verification:**
- All GA criteria marked complete
- Evidence verifiable

**Estimated Effort:** 2 hours
**Depends On:** All previous waves

#### W8.5: Remove Over-Promised Features from Docs
**Process:**
- Grep docs for features not in code
- Remove or mark as "roadmap"
- Update marketing materials
- Add disclaimer if needed

**Verification:**
- No docs promise unimplemented features

**Estimated Effort:** 2 hours
**Depends On:** W4.6

**Wave 8 Total:** ~14 hours, 20+ file changes
**Wave 8 Verification:** All docs accurate and verifiable

---

### WAVE 9: COMPLIANCE & LEGAL [PRIORITY: CRITICAL]

**Rationale:** Cannot claim GA without sign-off.

#### W9.1: Complete Legal Review
**Action:** Schedule legal review of:
- Licensing
- Terms of service
- Privacy policy
- Data handling
- Export controls

**Deliverable:** Legal sign-off document
**Estimated Effort:** 8 hours (preparation) + external time
**Depends On:** W8.2 (security docs)

#### W9.2: Complete Compliance Review
**Action:** Schedule compliance review for:
- SOC 2 readiness
- ISO 27001 alignment
- GDPR compliance (if applicable)
- HIPAA compliance (if applicable)

**Deliverable:** Compliance attestation
**Estimated Effort:** 8 hours (preparation) + external time
**Depends On:** W8.2, W9.1

#### W9.3: Complete Executive Approval
**Action:**
- Present GA readiness report
- Demonstrate fixed critical issues
- Show evidence bundle
- Get sign-off

**Deliverable:** Executive approval document
**Estimated Effort:** 4 hours (deck preparation) + meeting
**Depends On:** W9.1, W9.2

**Wave 9 Total:** ~20 hours + external reviews
**Wave 9 Verification:** All approvals documented

---

### WAVE 10: OPERATIONAL READINESS [PRIORITY: MEDIUM]

**Rationale:** Must be operable in production.

#### W10.1: Test Disaster Recovery Procedures
**Action:**
- Execute backup restore test
- Time recovery
- Document results
- Update runbooks

**Verification:**
- Restore test successful
- RTO/RPO documented

**Estimated Effort:** 4 hours
**Depends On:** None

#### W10.2: Validate Runbooks
**Action:**
- Execute each runbook
- Fix outdated steps
- Add screenshots
- Version control

**Verification:**
- All runbooks executable
- Incident response tested

**Estimated Effort:** 6 hours
**Depends On:** None

#### W10.3: Performance Baseline
**Action:**
- Run load tests
- Document baseline performance
- Set SLO targets
- Add performance regression tests to CI

**Verification:**
- Performance baselines documented
- CI fails on regression

**Estimated Effort:** 8 hours
**Depends On:** W1.7 (CI gates)

#### W10.4: Alert Coverage Validation
**Action:**
- Trigger each alert
- Verify firing
- Test notification channels
- Document alert response procedures

**Verification:**
- All critical alerts fire correctly
- On-call can respond

**Estimated Effort:** 4 hours
**Depends On:** W10.2

**Wave 10 Total:** ~22 hours
**Wave 10 Verification:** DR tested, runbooks validated, alerts working

---

## PHASE 5: VERIFICATION & EVIDENCE

### V1: Automated Verification Suite
**Create:** `/scripts/ga-verification.sh`

**Checks:**
- No hardcoded credentials
- No HTTP 501 responses
- No skipped tests
- No empty catch blocks
- No disabled security controls
- All CI gates blocking
- All docs accurate

**Estimated Effort:** 4 hours

### V2: Evidence Collection
**Create:** `/evidence/ga-completion/`

**Artifacts:**
- CI pipeline screenshots (all green)
- Security scan reports (all passing)
- Test coverage reports (≥85%)
- Performance baseline reports
- DR test results
- Legal/compliance sign-offs
- Executive approval

**Estimated Effort:** 2 hours

### V3: Regression Prevention
**Create:** `/tests/ga-compliance/`

**Tests ensuring:**
- Hardcoded credentials never return
- CI gates remain blocking
- Security controls stay mandatory
- API contracts stable

**Estimated Effort:** 6 hours

**Phase 5 Total:** ~12 hours

---

## PHASE 6: DOCUMENTATION TRUTH ALIGNMENT

**Covered in Wave 8 above.**

---

## PHASE 7: GA READINESS DECLARATION

### Final Deliverables

#### D1: GA Readiness Summary
**File:** `/GA_READINESS_SUMMARY.md`

**Contents:**
- All gaps addressed
- Evidence links
- Verification commands
- Known limitations (if any)
- Post-GA roadmap

**Estimated Effort:** 3 hours

#### D2: Evidence Bundle
**File:** `/evidence-bundles/ga-completion-v1.0.tar.gz`

**Contents:**
- All evidence artifacts
- Signed attestations
- Compliance reports
- Test results
- CI logs

**Estimated Effort:** 2 hours

#### D3: External Auditor Package
**File:** `/audit/ga-package/`

**Contents:**
- Architecture documentation
- Security controls inventory
- Test coverage reports
- Compliance mappings
- Incident response procedures

**Estimated Effort:** 4 hours

**Phase 7 Total:** ~9 hours

---

## EXECUTION TIMELINE

### Estimated Total Effort

| Wave | Effort | Criticality |
|------|--------|-------------|
| W1: CI Hardening | 8h | CRITICAL |
| W2: Credential Eradication | 4.5h | CRITICAL |
| W3: Security Hardening | 3.5h | CRITICAL |
| W4: API Completion | 11.5h | HIGH |
| W5: Integration Completion | 41h | HIGH |
| W6: Error Handling | 9h | MEDIUM |
| W7: Test Completeness | 18h | MEDIUM |
| W8: Documentation | 14h | HIGH |
| W9: Compliance & Legal | 20h + external | CRITICAL |
| W10: Operational Readiness | 22h | MEDIUM |
| Phase 5: Verification | 12h | CRITICAL |
| Phase 7: Declaration | 9h | CRITICAL |

**Total Implementation Time:** ~173 hours (~22 working days for 1 person, or ~5 days for 4-person team)
**Plus External Reviews:** Legal, Compliance, Executive (variable)

### Recommended Execution Order
1. **Day 1-2:** Waves 1, 2, 3 (CI + Security) - 16 hours
2. **Day 3-5:** Waves 4, 5 (Features + Integrations) - 52.5 hours
3. **Day 6-7:** Waves 6, 7 (Error + Tests) - 27 hours
4. **Day 8-9:** Wave 8 (Documentation) - 14 hours
5. **Day 10-12:** Wave 10 (Ops Readiness) - 22 hours
6. **Day 13-15:** Phase 5 (Verification) + Phase 7 (Evidence) - 21 hours
7. **Day 16-20:** Wave 9 (Legal/Compliance) + buffer - 20+ hours
8. **Day 21-22:** Final validation and sign-off

---

## RISK MITIGATION

### Risk 1: Breaking Changes During Hardening
**Mitigation:**
- All changes in feature branch `claude/mvp4-ga-completion-oHT3g`
- CI runs on every commit
- Incremental PRs for each wave
- Rollback plan for each change

### Risk 2: External Review Delays
**Mitigation:**
- Start legal/compliance reviews early (parallel with Wave 4)
- Prepare materials in advance
- Have backup reviewers identified

### Risk 3: Scope Creep
**Mitigation:**
- Strict adherence to plan
- Product decisions documented (implement vs. remove)
- "Nice to have" items go to backlog, not this GA

### Risk 4: Test Failures Blocking Progress
**Mitigation:**
- Fix tests before depending changes
- Parallel test fixing (Wave 7) with other work
- Quarantine truly broken tests, delete if unfixable

---

## SUCCESS METRICS

### Quantitative
- ✅ CI Gates Blocking: 7/7 (100%)
- ✅ Hardcoded Credentials: 0
- ✅ HTTP 501 Endpoints: 0
- ✅ Optional Security Controls: 0
- ✅ Skipped Tests: 0
- ✅ Empty Catch Blocks: 0 (in critical paths)
- ✅ Test Coverage: ≥85%
- ✅ GA Readiness Score: ≥90/100

### Qualitative
- ✅ External auditor can verify all claims
- ✅ Security reviewer finds no critical gaps
- ✅ Operations team can deploy and operate
- ✅ Legal/compliance sign-off obtained
- ✅ Documentation enables self-service

---

## EXECUTION AUTHORITY

This plan is **pre-approved for autonomous execution** under the master GA completion mandate.

**Authorization:**
- Modify any file required for GA completion
- Delete incomplete/misleading code
- Update architecture if needed for quality
- Make final product decisions (implement vs. remove features)

**Constraints:**
- No changes to core business logic without verification
- All changes must be verifiable
- All changes must be reversible (git history)
- Breaking changes must update dependent code

---

**Plan Status:** READY FOR EXECUTION
**Next Step:** Begin Wave 1 - CI/CD Hardening

*End of GA Completion Plan v1.0*
