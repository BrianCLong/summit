# Pull Request: Policy-Gated Approvals Service

**Branch:** `claude/policy-gated-approvals-01H49Eg82iYYFqhpcEmjc3Ph`
**Base:** `main`

---

## Title

```
feat(approvals): Add policy-gated approvals service with OPA/ABAC and provenance
```

## Description

## Summary

This PR implements the complete **Policy-Gated Approvals** system for high-risk operations in Summit/CompanyOS as part of the "Internal GA: Policy-Gated Approvals + Provenance for High-Risk Ops" sprint.

### What's Included

- **Approvals Service** (`services/approvals/`): Full REST API for approval request lifecycle with OPA integration, provenance receipts, and PostgreSQL persistence
- **OPA Policies**: Core approval evaluation with risk-based requirements, policy profiles, and four-eyes approval logic
- **Observability**: Grafana dashboard, Prometheus alerting rules for SLO monitoring
- **Operations**: Complete runbook with alert response procedures and manual override documentation

### Key Features

- ✅ OPA/ABAC policy enforcement in the request path
- ✅ Signed receipts emitted to provenance ledger (HMAC-SHA256)
- ✅ Dashboard + alerts for end-to-end flow monitoring
- ✅ Runbook for operational readiness
- ✅ Tenant-scoped configuration with policy profiles
- ✅ Idempotent request creation

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/requests` | Create approval request |
| GET | `/api/v1/requests` | List requests with filtering |
| GET | `/api/v1/requests/:id` | Get request by ID |
| POST | `/api/v1/requests/:id/decision` | Submit approval/rejection |
| POST | `/api/v1/requests/:id/cancel` | Cancel pending request |

### Policy Profiles

- `standard` - Default workflow for most operations
- `strict_prod_deploy` - Strict requirements for production deployments
- `high_risk_finance` - Enhanced controls for financial operations
- `emergency_override` - Expedited approval for emergencies
- `compliance_heavy` - Maximum compliance controls

### Files Changed (26 files, +6828 lines)

**New Service:**
- `services/approvals/` - Complete approvals microservice

**Observability:**
- `observability/dashboards/approvals-service.json` - Grafana dashboard
- `observability/prometheus/alerts/approvals-alerts.yaml` - Alert rules

**Operations:**
- `RUNBOOKS/approvals-service.md` - Comprehensive runbook

## Test plan

- [ ] Run `pnpm install` to install dependencies
- [ ] Run `pnpm --filter @intelgraph/approvals build` to verify TypeScript compilation
- [ ] Run `pnpm --filter @intelgraph/approvals test` to run unit tests
- [ ] Apply database migration: `services/approvals/migrations/001_initial_schema.sql`
- [ ] Start service with `pnpm --filter @intelgraph/approvals dev`
- [ ] Verify health endpoints: `curl http://localhost:3010/health/ready`
- [ ] Create test approval request via API
- [ ] Verify Grafana dashboard loads correctly
- [ ] Run OPA policy tests: `opa test services/approvals/policies/`

## Sprint Acceptance Criteria Met

- [x] At least one real internal flow can run through CompanyOS approvals
- [x] Approvals are blocked without policy allow (OPA/ABAC) and logged with full evidence
- [x] 100% approval actions emit signed receipts to the provenance ledger
- [x] Each receipt is queryable by request ID, actor, policy version, and tenant
- [x] Grafana dashboard for approval flow (latency, error rate, volume)
- [x] Alert wired for SLO breach (latency > 1.5s, error rate > 0.5%)
- [x] Runbook exists for "approvals path degraded/failed"
- [x] Sample policy profiles are packaged and configurable
