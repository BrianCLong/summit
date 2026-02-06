# OPA Policy Coverage Analysis

**Last Updated:** 2026-02-06
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
| **Maestro Agent Tasks** | **FIXED** | ✅ | Fail-closed behavior added 2026-02-06 | **RESOLVED** |
| **API Gateway** | Yes | ✅ | RBAC enforced | LOW |
| **GraphQL Resolvers** | Partial | 🟡 | Some resolvers bypass auth | MEDIUM |
| **Feature Flag API** | **FIXED** | ✅ | Auth middleware added 2026-01-20 | **RESOLVED** |
| **CompanyOS Tenant API** | **FIXED** | ✅ | OPA integration with fail-closed added 2026-02-06 | **RESOLVED** |
| **Background Jobs** | **FIXED** | ✅ | OPA wrapper created 2026-02-06 | **RESOLVED** |
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

### Gap 2: Maestro Agent Execution Paths (RESOLVED)

**Status:** ✅ **RESOLVED (2026-02-06)**

**Location:** `server/src/middleware/maestro-authz.ts`

**Resolution:**
- Added fail-closed behavior to Maestro authorization middleware
- Production: On any OPA evaluation error, request is DENIED (403)
- Non-production: Allows with warning for development convenience
- All policy evaluation failures are logged with `failClosed: true` flag

**Key Changes:**
```typescript
// Production: Always deny on policy evaluation failure
if (isProduction) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Authorization service unavailable - access denied',
    failClosed: true,
  });
}
```

**Behavior:**
- Production: OPA error → DENY request
- Non-production: OPA error → ALLOW with warning log
- All errors logged with full audit context

---

### Gap 3: Background Jobs and Async Workers (RESOLVED)

**Status:** ✅ **RESOLVED (2026-02-06)**

**Location:** `server/src/jobs/processors/opa-job-wrapper.ts`

**Resolution:**
- Created `withOpaPolicy()` wrapper for BullMQ job processors
- OPA policy at `policy/opa/jobs.rego` for job authorization
- Fail-closed behavior in production
- Jobs can be pre-validated before enqueue via `canEnqueueJob()`

**Usage:**
```typescript
import { withOpaPolicy } from './opa-job-wrapper.js';

export const myProcessor = withOpaPolicy('my_queue', async (job, policyContext) => {
  // Job logic - only runs if OPA allows
});
```

**Key Features:**
1. OPA evaluation before each job execution
2. Configurable via `OPA_JOBS_ENABLED` environment variable
3. Fail-closed in production (`FAIL_CLOSED` flag)
4. Policy decision logging for audit trail
5. Pre-enqueue validation via `canEnqueueJob()`

**Configuration:**
- `OPA_URL` - OPA server URL (default: `http://localhost:8181`)
- `OPA_JOBS_ENABLED` - Enable/disable OPA for jobs (default: `true`)
- `OPA_JOB_TIMEOUT_MS` - Request timeout (default: `5000`)

**Migration:**
Existing job processors can incrementally adopt the wrapper. The policy allows system jobs (no user context) by default for backward compatibility.

**Adopted Processors (2026-02-06):**
The following job processors have been updated to use the OPA wrapper:
1. `analytics.processor.ts` - Analytics job processing
2. `ingestionProcessor.ts` - File/data ingestion
3. `intent.processor.ts` - Federation intent processing
4. `notification.processor.ts` - Notification delivery
5. `report.processor.ts` - Report generation
6. `webhook.processor.ts` - Webhook handling

**Explicitly Excluded Processors (with rationale):**
1. `resource-janitor.ts` - System housekeeping (cleans stale runs); no user context, internal maintenance only
2. `soc2EvidenceJob.ts` - SOC2 evidence collection; uses pg-boss, system-scheduled, no external input
3. `retentionProcessor.ts` - Data retention purge; system-scheduled, operates on internal datasets
4. `ingestion.processor.ts` - **REMOVED** (was deprecated stub, superseded by `ingestionProcessor.ts`)

**Exclusion Criteria:**
- System-level jobs with no user context/input
- Jobs triggered by internal schedulers (not user requests)
- Jobs that don't process external/untrusted data

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
