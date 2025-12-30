# CRITICAL NEEDS RESOLUTION MATRIX
**Date**: 2025-12-30
**Phase**: 2 — Resolution Decision
**Authority**: Principal Architect + Security Lead

---

## RESOLUTION STRATEGY

For each of the 38 critical needs, this matrix assigns one of three resolutions:

- **FIX NOW**: Implement immediately (GA-blocking or high security risk)
- **GATE EXPLICITLY**: Add runtime check to block unsafe paths (acceptable risk if gated)
- **DEFER FORMALLY**: Post-GA with documented rationale and remediation plan

---

## TIER 1: IMMEDIATE FIX REQUIRED (GA-BLOCKING) — 12 Needs

### Security & Trust

| ID | Need | Resolution | Justification | Owner | ETA |
|----|------|------------|---------------|-------|-----|
| **CN-001** | API Routes Lack Authentication | **FIX NOW** | Zero-tolerance security gap; cannot ship unauthenticated privileged APIs | Security Lead | 2 hours |
| **CN-002** | Policy Enforcement Missing at Execute | **FIX NOW** | TOCTOU vulnerability; policy must be re-evaluated | Security Lead | 1 hour |
| **CN-003** | Tenant Isolation Not Enforced | **FIX NOW** | Cross-tenant leak risk unacceptable | Security Lead | 2 hours |
| **CN-004** | Tenant Isolation Tests Are Stubs | **FIX NOW** | Must verify isolation works | QA Lead | 3 hours |
| **CN-005** | Audit Logging Console-Only | **FIX NOW** | Compliance requirement; non-repudiation mandatory | Security Lead | 4 hours |
| **CN-012** | RBAC Never Integrated with Routes | **FIX NOW** | Authorization framework useless if not enforced | Security Lead | 2 hours |

### Release & GA Readiness

| ID | Need | Resolution | Justification | Owner | ETA |
|----|------|------------|---------------|-------|-----|
| **CN-015** | CitationGate Bypassable | **FIX NOW** | GA claim requires enforcement, not opt-in | Release Mgr | 1 hour |
| **CN-016** | DeploymentGateService Not Used | **FIX NOW** | Most comprehensive gate must be active | Release Mgr | 2 hours |
| **CN-018** | Smoke Tests Commented Out | **FIX NOW** | Golden path verification mandatory | QA Lead | 1 hour |
| **CN-020** | No Runtime Gate Verification | **FIX NOW** | Server must validate gates before accepting traffic | Release Mgr | 2 hours |

### Testing & Verification

| ID | Need | Resolution | Justification | Owner | ETA |
|----|------|------------|---------------|-------|-----|
| **CN-029** | 187+ Test Patterns Excluded | **FIX NOW** | 99% pass rate is false confidence; re-enable critical tests | QA Lead | 8 hours |
| **CN-030** | test:integration Missing | **FIX NOW** | CI gate is fake; must create or remove from CI | QA Lead | 1 hour |

### Planning & Integrity

| ID | Need | Resolution | Justification | Owner | ETA |
|----|------|------------|---------------|-------|-----|
| **CN-034** | Epic Status Claims Don't Match | **FIX NOW** | Cannot claim GA readiness with false status | Program Mgr | 2 hours |

---

## TIER 2: GATE EXPLICITLY (ACCEPTABLE IF BLOCKED AT RUNTIME) — 5 Needs

| ID | Need | Resolution | Justification | Implementation | Owner | ETA |
|----|------|------------|---------------|----------------|-------|-----|
| **CN-010** | Federal Intel Uses Mock Data | **GATE EXPLICITLY** | Experimental feature; add `FEATURE_EXPERIMENTAL=intel` gate that blocks unless explicitly enabled | Add startup check: fail if used without explicit flag | Architect | 1 hour |
| **CN-023** | HelpDesk Handlers Are Stubs | **GATE EXPLICITLY** | Support integrations not GA-required; gate with `HELPDESK_ENABLED` flag | Fail fast if called without implementation | Architect | 1 hour |
| **CN-024** | RevOpsAgent Has Fake Data | **GATE EXPLICITLY** | Agent feature not GA-critical; require `AGENT_REVOPS_ENABLED` flag | Throw error if used without real CRM config | Architect | 1 hour |
| **CN-026** | CloudOrchestrator Uses Random | **GATE EXPLICITLY** | Multi-cloud optional; gate with `CLOUD_ORCHESTRATOR_ENABLED` | Fail if enabled without real provider credentials | Architect | 1 hour |
| **CN-027** | MigrationValidator Fake Results | **GATE EXPLICITLY** | Disable migration validator unless explicitly enabled with real implementation | Hard-gate validator usage | Architect | 1 hour |

**Gating Strategy**: These features will have:
1. Startup validation that checks if enabled
2. Runtime error if called without proper implementation
3. Documentation marking them as "Experimental" or "Post-GA"
4. Clear error messages directing users to implementation requirements

---

## TIER 3: HIGH PRIORITY FIX (SHIP SOON AFTER GA) — 11 Needs

### Security Hardening

| ID | Need | Resolution | Justification | Remediation Plan | Owner | Target |
|----|------|------------|---------------|------------------|-------|--------|
| **CN-006** | WebAuthn Signature Verification Stub | **DEFER FORMALLY** | WebAuthn optional for initial GA; customers using password auth | Implement proper crypto verification in Sprint N+1 | Security Lead | Week 2 post-GA |
| **CN-007** | WebAuthn CBOR Parsing Mock | **DEFER FORMALLY** | Same as CN-006; not on critical path if WebAuthn disabled | Implement CBOR parser in Sprint N+1 | Security Lead | Week 2 post-GA |
| **CN-008** | Rate Limiting Missing | **FIX NOW** | Reconsidered: DoS risk too high; move to Tier 1 | Add express-rate-limit middleware | Security Lead | 2 hours |
| **CN-009** | Secrets Not Validated | **FIX NOW** | Reconsidered: weak secrets in prod unacceptable; move to Tier 1 | Add startup validation for required secrets | Security Lead | 1 hour |
| **CN-011** | RBAC In-Memory Only | **DEFER FORMALLY** | Acceptable for initial deployment; ops can restart | Add PostgreSQL persistence in Sprint N+2 | Architect | Week 4 post-GA |
| **CN-013** | SBOM Pipeline Inactive | **DEFER FORMALLY** | Manual SBOM generation sufficient for GA | Re-enable automated workflow in Sprint N+1 | DevOps | Week 2 post-GA |
| **CN-014** | No Package Signature Verification | **DEFER FORMALLY** | Lockfile + Snyk scanning sufficient for GA | Implement signature verification in Sprint N+2 | DevOps | Week 4 post-GA |

### Release & Deployment

| ID | Need | Resolution | Justification | Remediation Plan | Owner | Target |
|----|------|------------|---------------|------------------|-------|--------|
| **CN-017** | Migration Gates Not Called | **DEFER FORMALLY** | Manual migration review process in place | Integrate migration gates in Sprint N+1 | Architect | Week 2 post-GA |
| **CN-019** | Dependency Audit Disabled | **FIX NOW** | Reconsidered: CVE risk too high; move to Tier 1 | Un-comment audit in CI | DevOps | 15 min |
| **CN-021** | Manual Checklist Items Unverified | **DEFER FORMALLY** | Manual process acceptable with sign-off | Automate in Sprint N+2 | Release Mgr | Week 4 post-GA |
| **CN-022** | Canary Validation Not Automated | **DEFER FORMALLY** | Manual canary monitoring acceptable | Automate rollback in Sprint N+2 | DevOps | Week 4 post-GA |

**TIER 3 MOVES TO TIER 1**: CN-008, CN-009, CN-019 reconsidered as too risky to defer.

---

## TIER 4: DEFER FORMALLY (POST-GA, MANAGED DEBT) — 10 Needs

### Architecture Cleanup

| ID | Need | Resolution | Justification | Remediation Plan | Owner | Target |
|----|------|------------|---------------|------------------|-------|--------|
| **CN-025** | AnalyticsEngine Empty Methods | **DEFER FORMALLY** | Analytics optional; gate with feature flag | Implement in Sprint N+3 or remove | Architect | Week 6 post-GA |
| **CN-028** | 565 TODO Markers | **DEFER FORMALLY** | Tracked in debt registry; not GA-blocking | Burn 50/month starting Sprint N+1 | All teams | Ongoing |

### Testing Improvements

| ID | Need | Resolution | Justification | Remediation Plan | Owner | Target |
|----|------|------------|---------------|------------------|-------|--------|
| **CN-031** | Security Tests Disabled | **FIX NOW** | Reconsidered: security regression risk too high; move to Tier 1 | Re-enable security test patterns | QA Lead | 4 hours |
| **CN-032** | No Frozen Lockfile in Fast CI | **FIX NOW** | Reconsidered: supply-chain risk too high; move to Tier 1 | Change `--no-frozen-lockfile` to `--frozen-lockfile` | DevOps | 5 min |

### Planning & Governance

| ID | Need | Resolution | Justification | Remediation Plan | Owner | Target |
|----|------|------------|---------------|------------------|-------|--------|
| **CN-033** | No Sprint Delivery Tracking | **DEFER FORMALLY** | Retrospective tracking acceptable; future sprints will be tracked | Implement sprint dashboard in Sprint N+1 | Program Mgr | Week 2 post-GA |
| **CN-035** | ADRs 5-8 Proposed Not Implemented | **DEFER FORMALLY** | ADRs are design proposals; implementation scheduled post-GA | Review and accept/reject in Week 1 post-GA | Architect | Week 1 post-GA |
| **CN-036** | 14k Debt Entries No Plan | **DEFER FORMALLY** | Debt registry exists; burn target established (50/month) | Monthly review starting Sprint N+1 | All teams | Ongoing |
| **CN-037** | Governance Mandates Not Enforced | **DEFER FORMALLY** | Manual governance acceptable; automation is enhancement | Add pre-commit hooks in Sprint N+2 | DevOps | Week 4 post-GA |
| **CN-038** | Missing Governance Files | **DEFER FORMALLY** | AGENTS.md + GOVERNANCE-DESIGN.md sufficient for GA | Create referenced files in Sprint N+1 | Program Mgr | Week 2 post-GA |

**TIER 4 MOVES TO TIER 1**: CN-031, CN-032 reconsidered as too risky to defer.

---

## REVISED TIER ASSIGNMENTS AFTER RECONSIDERATION

### **TIER 1: FIX NOW (IMMEDIATE)** — 20 Needs

**Added from Tier 3/4**:
- CN-008: Rate Limiting Missing (security)
- CN-009: Secrets Not Validated (security)
- CN-019: Dependency Audit Disabled (security)
- CN-031: Security Tests Disabled (verification)
- CN-032: No Frozen Lockfile (supply-chain)

**Total**: 12 original + 5 moved = **17 FIX NOW**

### **TIER 2: GATE EXPLICITLY** — 5 Needs
- CN-010, CN-023, CN-024, CN-026, CN-027 (experimental features)

### **TIER 3: DEFER FORMALLY (HIGH PRIORITY)** — 7 Needs
- CN-006, CN-007, CN-011, CN-013, CN-014, CN-017, CN-021, CN-022

### **TIER 4: DEFER FORMALLY (MANAGED DEBT)** — 6 Needs
- CN-025, CN-028, CN-033, CN-035, CN-036, CN-037, CN-038

---

## EXECUTION PLAN

### Immediate (Next 4 Hours)

**Quick Wins (<30 min each)**:
1. CN-032: Change CI to use `--frozen-lockfile` (5 min)
2. CN-019: Un-comment dependency audit (15 min)
3. CN-030: Fix or remove `test:integration` script (1 hour)
4. CN-018: Un-comment `make smoke` (15 min)
5. CN-015: Make CitationGate non-bypassable (1 hour)

**Security Critical (2-4 hours each)**:
6. CN-001: Add authentication middleware (2 hours)
7. CN-002: Add policy re-evaluation in execute (1 hour)
8. CN-003: Add tenant isolation validation (2 hours)
9. CN-008: Add rate limiting middleware (2 hours)
10. CN-009: Add secrets validation at startup (1 hour)
11. CN-012: Integrate RBAC with routes (2 hours)

### Short-Term (Next 8 Hours)

**Testing & Verification**:
12. CN-004: Implement real tenant isolation tests (3 hours)
13. CN-029: Re-enable critical test patterns (security, GraphQL, billing) (8 hours)
14. CN-031: Re-enable security tests (4 hours)

**Release Gates**:
15. CN-016: Integrate DeploymentGateService (2 hours)
16. CN-020: Add runtime gate validation (2 hours)

**Planning**:
17. CN-034: Update epic status to match reality (2 hours)

### Gating (Next 2 Hours)

**Experimental Feature Gates**:
18. CN-010: Gate federal intel system (1 hour)
19. CN-023: Gate helpdesk integrations (1 hour)
20. CN-024: Gate RevOpsAgent (1 hour)
21. CN-026: Gate CloudOrchestrator (1 hour)
22. CN-027: Gate MigrationValidator (1 hour)

---

## ESTIMATED EFFORT

| Tier | Count | Estimated Hours | Priority | Start |
|------|-------|-----------------|----------|-------|
| **Tier 1: FIX NOW** | 17 | 32 hours | P0 | Immediate |
| **Tier 2: GATE** | 5 | 5 hours | P0 | After critical fixes |
| **Tier 3: DEFER (High)** | 8 | N/A (post-GA) | P1 | Sprint N+1 |
| **Tier 4: DEFER (Managed)** | 8 | N/A (post-GA) | P2 | Sprint N+2+ |

**Total Immediate Work**: 37 hours (can be parallelized across 3 engineers to complete in ~12-14 hours)

---

## DEFERRAL RATIONALE (FORMAL)

All DEFER decisions documented with:
1. **Risk Assessment**: Why deferral is acceptable
2. **Mitigation**: What controls are in place
3. **Remediation Plan**: Specific sprint/timeline for fix
4. **Owner**: Accountable party
5. **Review Date**: When decision will be re-evaluated

**Authority**: Principal Architect + Security Lead approve all deferrals.

**Non-Negotiable**: All Tier 1 (FIX NOW) items must be completed before GA deployment.

---

## APPROVAL REQUIRED

**Security Lead**: Approve security-related deferrals (CN-006, CN-007, CN-011, CN-013, CN-014)
**Release Manager**: Approve release-related deferrals (CN-017, CN-021, CN-022)
**Program Manager**: Approve planning-related deferrals (CN-033, CN-035, CN-036, CN-037, CN-038)

**Pending Signatures**: [Awaiting approval]

---

*Resolution Matrix — Phase 2 Complete — Ready for Phase 3 Execution*
