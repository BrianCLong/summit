# IntelGraph Safe Mutations: Complete Canary Rollout Guide

## 🚀 **PRODUCTION-READY SYSTEM OVERVIEW**

The **IntelGraph Safe Mutations** system is now fully operationalized with enterprise-grade canary rollout capabilities:

### ✅ **Enforcement Layer**

- **Build-time CI linter**: Fails builds without `@budget` directives
- **Runtime Apollo plugin**: Blocks mutations missing budget declarations
- **OPA policy engine**: Four-eyes approval for `>$5` operations + risk tags
- **Persisted queries**: Two-phase rollout (log→enforce) with emergency bypass

### ✅ **Budget Control Layer**

- **Postgres budget ledger**: FinOps source of truth with daily/monthly limits
- **Redis rate limiting**: Token buckets with tenant/operation isolation
- **Real-time monitoring**: 80%/100% threshold alerts for canary tenants

### ✅ **Resilience Layer**

- **Neo4j compensation logs**: Bulletproof rollbacks with audit correlation
- **BullMQ reconciliation**: Post-hoc token usage accuracy
- **Chaos engineering**: Injectable faults for Neo4j/Redis/LLM providers

---

## 📋 **CANARY ROLLOUT CHECKLIST**

### **Phase 1: Infrastructure Setup** ✅

```bash
# 1. Run database migrations
psql -d intelgraph -f db/migrations/20250906_budget_ledger.sql
psql -d intelgraph -f db/migrations/20250906_canary_limits.sql

# 2. Verify canary tenant seeding
npm run db:query "SELECT tenant_id, daily_usd_limit, canary FROM tenant_budget WHERE canary = TRUE"

# 3. Enable CI budget enforcement
echo "npm run check:budget" >> .github/workflows/ci.yml
```

### **Phase 2: Policy & Security** ✅

```bash
# 1. Deploy OPA policies
opa test policies/
kubectl apply -f ops/opa-deployment.yaml

# 2. Enable persisted query logging (Phase 1)
export PQ_PHASE=log
export PQ_BYPASS=0
export PQ_INTROSPECTION=0

# 3. Wire Apollo plugins
# Add requireBudgetPlugin + persistedEnforcer to Apollo server
```

### **Phase 3: Observability & Alerts** ✅

```bash
# 1. Deploy Prometheus rules
kubectl apply -f monitoring/canary-budget-alerts.yml

# 2. Configure Alertmanager routing
kubectl apply -f alertmanager.yml

# 3. Import Grafana dashboards
curl -X POST grafana/api/dashboards/import -d @monitoring/promql-panels.yml
```

### **Phase 4: Workers & Automation** ✅

```bash
# 1. Start reconciliation worker
npm run worker:reconcile

# 2. Start auto-escalation worker
export PROMQL_URL=http://prometheus:9090
export CANARY_CLEAN_DAYS=7
export CANARY_ESCALATION_DRY_RUN=false
npm run worker:escalate

# 3. Verify workers are running
curl http://localhost:4000/admin/workers/status
```

---

## 🎯 **CANARY TENANT CONFIGURATION**

### **Initial Limits** (Seeded)

| Tenant             | Daily Limit | Monthly Limit | Alert Threshold | Auto-Escalate |
| ------------------ | ----------- | ------------- | --------------- | ------------- |
| `test`             | $25.00      | $750.00       | 80%             | ✅            |
| `demo`             | $25.00      | $750.00       | 80%             | ✅            |
| `maestro-internal` | $25.00      | $750.00       | 80%             | ✅            |

### **Auto-Escalation Criteria**

- **7 clean days**: No `CanaryDailyBudgetExceeded` alerts
- **No rollback storms**: Zero rollback events in evaluation period
- **Automatic promotion**: $25→$50 daily, $750→$1,500 monthly
- **Monitoring**: Prometheus queries validate clean behavior

---

## 🔒 **FOUR-EYES APPROVAL RULES**

### **Required for:**

- **Risk tags**: `destructive`, `bulk_delete`, `merge_entities`, `purge`, `cross_tenant_move`, `bulk_update`, `schema_change`, `data_export`
- **Cost threshold**: Any operation `>$5.00 USD`
- **Cross-tenant**: Operations affecting multiple tenants
- **Large tokens**: Operations `>50,000` tokens

### **Valid Approvers:**

- **Admins**: `admin`, `finance_admin`, `security_admin`
- **Senior staff**: `senior_analyst`
- **Team leads**: For their own tenant only

### **Emergency Overrides:**

- **Time-limited**: Max 24 hours
- **Audit-logged**: All usage tracked
- **Self-serve UI**: Available in admin panel
- **Budget multipliers**: Up to 3x temporary increase

---

## 🚨 **ALERT PLAYBOOKS**

### **CanaryDailyBudgetApproaching (80% Warning)**

1. **Check Grafana dashboard** for usage patterns
2. **Review recent mutations** in audit log
3. **Normal for canaries** - monitor for unusual spikes
4. **Contact tenant admin** if sustained high usage

**Runbook**: https://runbooks.intelgraph.com/canary-budget-approaching

### **CanaryDailyBudgetExceeded (100% Critical)**

🚨 **IMMEDIATE ACTION REQUIRED**

1. **Check for runaway operations:**

   ```bash
   kubectl logs intelgraph-server | grep "Budget denial"
   curl "http://prometheus:9090/api/v1/query?query=budget_denials_total"
   ```

2. **Review compensation log:**

   ```bash
   psql -d intelgraph -c "
     SELECT * FROM budget_ledger
     WHERE tenant_id = 'TENANT'
     AND created_at > NOW() - INTERVAL '1 hour'
     ORDER BY created_at DESC;
   "
   ```

3. **Emergency actions:**
   - **Temporary override**: Use admin UI to create 2x budget multiplier
   - **Rate limit**: Reduce tenant rate limits via Redis
   - **Investigate**: Check for misconfigured prompts or batch operations

**Runbook**: https://runbooks.intelgraph.com/canary-budget-exceeded

### **BudgetEnforcementNotWorking**

1. **Verify Apollo plugins** are loaded and active
2. **Check OPA connectivity** and policy evaluation
3. **Review CI enforcement** with `npm run check:budget`
4. **Test manually** with non-budgeted mutation

---

## 🔧 **OPERATIONAL COMMANDS**

### **Budget Management**

```bash
# Check canary status
curl -s http://localhost:4000/admin/budget/canary-status | jq

# Create emergency override (24h, 2x budget)
curl -X POST http://localhost:4000/admin/budget/override \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test","budget_multiplier":2.0,"note":"Emergency maintenance","expires_hours":24}'

# Force escalation check (dry run)
curl -X POST http://localhost:4000/admin/workers/canary-escalate \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}'
```

### **Chaos Engineering**

```bash
# Enable database chaos for resilience testing
npm run chaos:enable

# Test system under database failures
BASE_URL=http://localhost:4000 PQ_PHASE=enforce npm run load:test

# Disable chaos
npm run chaos:disable
```

### **Persisted Queries**

```bash
# Check current enforcement status
curl http://localhost:4000/admin/persisted-queries

# Add new query to allowlist
curl -X POST http://localhost:4000/admin/persisted-queries/allowlist \
  -H "Content-Type: application/json" \
  -d '{"hashes":["abc123def456"],"action":"add"}'

# Move from log to enforce phase
export PQ_PHASE=enforce
kubectl rollout restart deployment/intelgraph-server
```

### **Monitoring**

```bash
# View budget utilization
curl "http://prometheus:9090/api/v1/query?query=intelgraph:daily_utilization_ratio{canary=\"true\"}"

# Check auto-escalation readiness
curl "http://prometheus:9090/api/v1/query?query=intelgraph:canary_escalation_ready"

# Alert manager status
curl http://alertmanager:9093/api/v1/alerts | jq '.data[] | select(.labels.tenant_type=="canary")'
```

---

## 🔐 **ADMIN UI: SELF-SERVE OVERRIDES**

### **Override Creation Form**

- **Tenant selection**: Dropdown of eligible tenants
- **Override type**: Budget multiplier (1.5x, 2.0x, 3.0x)
- **Duration**: 1h, 4h, 12h, 24h (max)
- **Justification**: Required text field
- **Approval**: Auto-approved for `<2x`, manual approval for `>=2x`

### **Active Overrides Dashboard**

- **Real-time view** of all active overrides
- **Expiration countdown** with auto-refresh
- **Extend/revoke** controls
- **Usage tracking** with cost attribution
- **Audit log** with full change history

### **Canary Health Dashboard**

- **Utilization widgets**: Daily/monthly spend vs limits
- **Escalation status**: Days clean, eligible for promotion
- **Recent operations**: Last 24h mutation activity
- **Alert history**: Budget warnings and critical events

---

## 📊 **SUCCESS METRICS**

### **Week 1 (Log Phase)**

- **Persisted query violations**: Should detect non-compliant queries
- **Budget denials**: Should see appropriate enforcement
- **System stability**: No rollback storms or outages

### **Week 2 (Enforce Phase)**

- **Persisted query compliance**: 100% for canary tenants
- **Four-eyes approvals**: Proper workflow for high-risk operations
- **Auto-escalation**: First tenants promoted to $50/day if clean

### **Week 4 (Full Production)**

- **Cost predictability**: Budget overruns <5%
- **Operation reliability**: Rollback rate <1%
- **Performance**: P95 latency <2 seconds

---

## 🚀 **LAUNCH COMMANDS**

Ready to ship? Execute the complete deployment:

```bash
# 1. Final system check
npm run check:budget
npm test
npm run lint:strict

# 2. Deploy to production
export ENVIRONMENT=production
export PQ_PHASE=log
export CANARY_ESCALATION_DRY_RUN=false
npm run deploy:prod

# 3. Verify health
curl https://api.intelgraph.com/health
curl https://api.intelgraph.com/admin/budget/canary-status

# 4. Monitor alerts
curl https://prometheus.intelgraph.com/api/v1/alerts
```

**🎯 System Status: PRODUCTION READY** ✅

Your IntelGraph Safe Mutations system is now fully buttoned-up with enterprise-grade operationalization, comprehensive monitoring, and bulletproof canary rollout capabilities.
