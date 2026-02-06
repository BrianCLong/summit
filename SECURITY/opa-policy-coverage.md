# OPA Policy Coverage Analysis

**Last Updated:** 2026-01-20
**Owner:** Security Team
**Review Frequency:** Monthly

This document tracks Open Policy Agent (OPA) policy enforcement coverage across the Summit Platform to identify gaps where unauthorized agent actions could bypass governance.

---

## Executive Summary

**Current State:** OPA infrastructure exists but policy enforcement has gaps in several critical code paths.

**Risk Level:** 🟡 **MEDIUM** - Infrastructure present, but not enforced everywhere

**Key Findings:**
- ✅ OPA infrastructure deployed and configured
- ✅ Some agent endpoints have policy middleware
- ⚠️ Multiple TODOs indicate incomplete integration
- ❌ No evidence of "fail-closed" behavior (defaults to allow if OPA unreachable)
- ❌ Limited test coverage for policy denial scenarios

---

## OPA Integration Architecture

### Current Setup

**OPA Deployment:**
- Location: `docker-compose.opa.yml`, K8s deployment via Helm
- Policy Storage: `packages/policy-engine/policies/`
- Client Library: `packages/authz-core/`

**Integration Points:**
1. **Maestro Middleware** (`server/src/maestro/`) - Agent task execution
2. **API Gateway** (`apps/gateway/`) - HTTP request authorization
3. **GraphQL Resolvers** (`server/src/graphql/`) - Query/mutation authorization
4. **CompanyOS Services** (`companyos/services/`) - Tenant isolation

---

## Coverage Matrix

| Component | Policy Enforcement | Status | Evidence | Gap Severity |
|-----------|-------------------|--------|----------|--------------|
| **Maestro Agent Tasks** | Partial | 🟡 | Middleware exists but TODOs present | **HIGH** |
| **API Gateway** | Yes | ✅ | RBAC enforced | LOW |
| **GraphQL Resolvers** | Partial | 🟡 | Some resolvers bypass auth | MEDIUM |
| **Feature Flag API** | **FIXED** | ✅ | Auth middleware added 2026-01-20 | **RESOLVED** |
| **CompanyOS Tenant API** | **FIXED** | ✅ | OPA integration with fail-closed added 2026-02-06 | **RESOLVED** |
| **Background Jobs** | Unknown | ⚠️ | No policy checks visible | MEDIUM |
| **Webhook Handlers** | Unknown | ⚠️ | Requires audit | MEDIUM |
| **Admin Endpoints** | Partial | 🟡 | Inconsistent enforcement | HIGH |

---

## Identified Gaps

### Gap 1: CompanyOS Tenant API (RESOLVED)

**Status:** ✅ **RESOLVED (2026-02-06)**

**Location:** `companyos/services/tenant-api/src/middleware/authContext.ts`

**Resolution:**
- Added OPA integration with `evaluateOpaPolicy()` function
- Implemented fail-closed behavior in production (`FAIL_CLOSED = process.env.NODE_ENV === 'production'`)
- Added policy decision logging for audit trail
- RBAC fallback for development/test environments when OPA unavailable
- Created dedicated tenant policy at `companyos/policies/tenant.rego`

**Key Features:**
1. OPA evaluation with configurable timeout (`OPA_TIMEOUT_MS`)
2. Fail-closed: denies all requests if OPA is unreachable in production
3. Structured logging of all policy decisions
4. Graceful degradation to RBAC in non-production

**Configuration:**
- `OPA_URL` - OPA server URL (default: `http://localhost:8181`)
- `OPA_ENABLED` - Enable/disable OPA (default: `true`)
- `OPA_TIMEOUT_MS` - Request timeout (default: `5000`)
- `LOG_POLICY_DECISIONS` - Enable verbose logging in dev

---

### Gap 2: Maestro Agent Execution Paths

**Location:** `server/src/maestro/`

**Evidence:**
- Middleware exists for `executeTask` calls
- TODOs suggest incomplete coverage
- Unknown: Do all agent actions go through middleware?

**Risk:** Agent bypasses policy check via alternate code path

**Investigation Required:**
1. Map all agent execution entrypoints
2. Verify OPA middleware is called for each
3. Test negative cases (policy denies should block execution)

**Target Date:** Sprint 2 (weeks 3-4)

---

### Gap 3: Background Jobs and Async Workers

**Location:** `server/src/jobs/`, `server/src/workers/`, BullMQ queues

**Evidence:** No visible OPA integration in job processors

**Risk:** Background tasks bypass policy enforcement

**Scenarios:**
- Scheduled data export job runs without permission check
- Async notification job accesses data user no longer has access to
- Retry logic bypasses policy on subsequent attempts

**Recommendation:**
- Add OPA check at job enqueue time (store policy decision in job metadata)
- Re-check policy at job execution time (in case permissions changed)
- Fail job if policy check fails

**Target Date:** Q1 2026

---

### Gap 4: Webhook Handlers

**Location:** `server/src/webhooks/`, integration endpoints

**Evidence:** Requires code audit

**Risk:** External system triggers action without policy check

**Investigation:**
1. Identify all webhook endpoints
2. Verify signature validation + policy check
3. Add tests for unauthorized webhook attempts

**Target Date:** Q1 2026

---

### Gap 5: Admin Endpoints (Inconsistent)

**Evidence:**
- Feature flags API: **FIXED** (2026-01-20)
- Other admin endpoints: Unknown

**Recommendation:**
- Audit all routes with "admin" or "internal" in path
- Ensure `requireAdmin` middleware applied
- Centralize admin auth logic

**Target Date:** Sprint 1

---

## Missing Features

### 1. Fail-Closed Default (RESOLVED)

**Status:** ✅ **IMPLEMENTED (2026-02-06)**

**Implementation:**
The following components now implement fail-closed behavior:

1. **authz-core** (`packages/authz-core/src/AuthorizationService.ts`)
   - `failSecure: process.env.NODE_ENV === 'production'`

2. **CompanyOS Tenant API** (`companyos/services/tenant-api/src/middleware/authContext.ts`)
   - `FAIL_CLOSED = process.env.NODE_ENV === 'production'`

3. **CompanyOS disclosure-export** (`companyos/src/authz/disclosure-export.ts`)
   - Always fail-closed: `return { allow: false, reason: 'authorization_error' }`

4. **CompanyOS opa-client** (`companyos/src/authz/opa-client.ts`)
   - Always fail-closed: `return { allow: false, reason: 'opa_error' }`

**Behavior:**
- Production: If OPA unreachable → **DENY** all requests
- Non-production: Falls back to RBAC with warning log
- All OPA errors are logged with structured output

---

### 2. Policy Decision Logging (PARTIALLY RESOLVED)

**Status:** 🟡 **PARTIALLY IMPLEMENTED (2026-02-06)**

**Implemented:**
- CompanyOS Tenant API now logs all policy decisions via `logPolicyDecision()`
- Structured JSON logs include: timestamp, subject, action, resource, decision, reason, obligations
- Production logs go to stdout for ingestion by logging infrastructure
- Development logging controllable via `LOG_POLICY_DECISIONS=true`

**Example Log Entry:**
```json
{
  "timestamp": "2026-02-06T10:30:00.000Z",
  "type": "policy_decision",
  "subject": "user-123",
  "action": "tenant:read",
  "resource": {"type": "tenant", "tenant_id": "acme-corp"},
  "decision": "allow",
  "reason": "OPA policy allowed",
  "obligations": []
}
```

**TODO:**
- [ ] Integrate with provenance ledger for immutable audit trail
- [ ] Add policy decision logging to other services (authz-core, etc.)
- [ ] Set up alerting for unusual denial patterns

---

### 3. Policy Testing Framework

**Current State:** No evidence of OPA policy unit tests

**Required:**
- Unit tests for each Rego policy
- Integration tests for policy enforcement
- Negative tests (verify denial works)
- Policy simulation tools

**Target Date:** Sprint 2

---

## Audit Action Plan

### Week 1: Discovery

- [ ] Map all agent execution entrypoints
- [ ] Identify all admin/privileged endpoints
- [ ] List all background job types
- [ ] Inventory webhook handlers

### Week 2: Gap Analysis

- [ ] Test each entrypoint for OPA enforcement
- [ ] Document findings in this file
- [ ] Create Jira tickets for each gap
- [ ] Prioritize by risk level

### Week 3-4: Critical Fixes (Sprint 1)

- [ ] Implement fail-closed default
- [ ] Add policy decision logging
- [ ] Fix CompanyOS tenant API gap
- [ ] Audit admin endpoints

### Week 5-8: Comprehensive Coverage (Sprint 2-3)

- [ ] Fix Maestro agent paths
- [ ] Add policy checks to background jobs
- [ ] Audit webhook handlers
- [ ] Build policy testing framework

---

## Testing Checklist

For each integration point, verify:

### Positive Tests (Should Allow)
- [ ] Authorized user can perform allowed action
- [ ] Policy evaluation is logged
- [ ] Performance is acceptable (<50ms p99)

### Negative Tests (Should Deny)
- [ ] Unauthorized user is blocked (401/403)
- [ ] Denial is logged
- [ ] Error message doesn't leak sensitive info
- [ ] User sees helpful error

### Resilience Tests
- [ ] OPA service down → requests denied (fail-closed)
- [ ] OPA policy syntax error → requests denied
- [ ] Timeout → requests denied (with alert)

---

## Monitoring & Alerting

### Required Metrics

- `opa.evaluations_total{result="allow|deny"}`
- `opa.evaluation_duration_ms`
- `opa.service_errors_total`
- `opa.policy_load_errors`

### Required Alerts

- OPA service down >1 minute → Page on-call
- OPA error rate >1% → Warn team
- Unusual spike in denials → Investigate

---

## Related Resources

- [SECURITY.md](../SECURITY.md) - Overall security policy
- [TECHNICAL_AUDIT_REPORT_2026-01-20.md](../TECHNICAL_AUDIT_REPORT_2026-01-20.md) - Audit findings
- [ROADMAP.md](../ROADMAP.md) - Epic 1 (Agent Governance)

---

**Questions?** Contact #security-team in Slack or email security@summit.ai
