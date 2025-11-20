# Implementation Quick Reference

## Absolute File Paths

### Core Query Execution
- `/home/user/summit/server/src/graphql/resolvers.ts` - Main GraphQL resolvers
- `/home/user/summit/server/src/index.ts` - Server entry point
- `/home/user/summit/server/src/app.ts` - Express app configuration
- `/home/user/summit/server/src/db/neo4j.ts` - Neo4j database driver
- `/home/user/summit/server/src/db/postgres.js` - PostgreSQL client
- `/home/user/summit/server/src/db/redis.js` - Redis client

### Audit & Logging
- `/home/user/summit/server/src/audit/advanced-audit-system.ts` - Immutable audit system
- `/home/user/summit/server/src/middleware/audit-logger.ts` - HTTP audit middleware
- `/home/user/summit/server/src/graphql/plugins/auditLogger.ts` - GraphQL audit plugin
- `/home/user/summit/server/src/routes/audit.ts` - Audit API routes
- `/home/user/summit/server/src/db/repositories/audit.ts` - Audit data access

### Security & Policy
- `/home/user/summit/server/src/policy/enforcer.ts` - Policy enforcement engine
- `/home/user/summit/server/src/policy/opa.ts` - OPA integration
- `/home/user/summit/server/src/policy/opaClient.ts` - OPA client
- `/home/user/summit/server/src/policy/residencyEnforcer.ts` - Data residency
- `/home/user/summit/server/src/middleware/rbac.ts` - RBAC middleware
- `/home/user/summit/server/src/middleware/security.ts` - Security headers

### Compliance & Reporting
- `/home/user/summit/server/src/services/ComplianceService.ts` - Compliance automation
- `/home/user/summit/server/src/services/ReportingService.js` - Report generation
- `/home/user/summit/server/src/routes/compliance.ts` - Compliance endpoints
- `/home/user/summit/server/src/services/DataRetentionService.ts` - Data lifecycle
- `/home/user/summit/server/src/conductor/compliance/compliance-engine.ts` - Conductor compliance

### Monitoring & Analytics
- `/home/user/summit/server/src/services/monitoringObservabilityService.ts` - Monitoring
- `/home/user/summit/server/src/routes/monitoring.ts` - Monitoring endpoints
- `/home/user/summit/server/src/anomaly.ts` - Anomaly detection algorithms
- `/home/user/summit/active-measures-module/src/monitoring/realTimeMonitor.ts` - Real-time monitoring

---

## Key Integration Hooks for Selector Minimization

### 1. GraphQL Resolver Hook Point

**File:** `/home/user/summit/server/src/graphql/resolvers.ts`

**Add Hook Before Query Execution:**
```typescript
async someResolver(_: any, args: any, ctx: any) {
  // NEW: Calculate selector expansion
  const selectorMetrics = await calculateSelectorExpansion(args, ctx);
  
  // NEW: Log to audit system
  if (selectorMetrics.expansionRatio > EXPANSION_THRESHOLD) {
    await auditSystem.recordEvent({
      eventType: 'resource_access',
      level: 'warn',
      message: `High query selector expansion detected: ${selectorMetrics.expansionRatio}x`,
      details: selectorMetrics,
      complianceRelevant: true,
    });
  }
  
  // Existing policy enforcement
  const policyDecision = await policyEnforcer.requirePurpose(...);
  
  // ... rest of resolver
}
```

### 2. Policy Enforcer Hook Point

**File:** `/home/user/summit/server/src/policy/enforcer.ts`

**Add Selector Validation to Policy Decision:**
```typescript
async enforce(context: PolicyContext): Promise<PolicyDecision> {
  const startTime = Date.now();
  
  // NEW: Validate selector expansion
  if (context.expandedSelectors) {
    const expansionRatio = context.expandedSelectors.length / context.baseSelectors.length;
    if (expansionRatio > policyConfig.maxSelectorExpansion) {
      return {
        allow: false,
        reason: 'Query selector expansion exceeds policy limit',
        auditRequired: true,
      };
    }
  }
  
  // Existing policy logic
  // ...
}
```

### 3. Audit System Hook Point

**File:** `/home/user/summit/server/src/audit/advanced-audit-system.ts`

**Log Selector Expansion Events:**
```typescript
async recordSelectorExpansionEvent(
  userId: string,
  tenantId: string,
  selectorMetrics: {
    baseSelectors: number;
    expandedSelectors: number;
    expansionRatio: number;
    timeMs: number;
    anomalous: boolean;
  }
): Promise<string> {
  return this.recordEvent({
    eventType: 'resource_access',
    level: selectorMetrics.anomalous ? 'warn' : 'info',
    correlationId: /* from context */,
    tenantId,
    serviceId: 'graphql-engine',
    userId,
    resourceType: 'graphql_query',
    action: 'selector_expansion',
    outcome: 'success',
    message: `Query selector expansion: ${selectorMetrics.expansionRatio.toFixed(2)}x`,
    details: selectorMetrics,
    complianceRelevant: true,
    complianceFrameworks: ['SOC2', 'GDPR'],
    dataClassification: 'internal',
  });
}
```

### 4. Anomaly Detection Hook Point

**File:** `/home/user/summit/server/src/anomaly.ts`

**Add Expansion Anomaly Detection:**
```typescript
export function detectExpansionAnomaly(
  userHistory: number[],
  currentExpansion: number
) {
  const mu = userHistory.reduce((a, b) => a + b, 0) / Math.max(1, userHistory.length);
  const mad = median(userHistory.map((v) => Math.abs(v - mu)));
  const z = robustZ(currentExpansion, mu, mad);
  
  return {
    anomaly: z >= 4,
    z,
    severity: z >= 4 ? 'critical' : z >= 2 ? 'high' : 'low',
    userBaseline: mu,
    currentValue: currentExpansion,
    deviations: z,
  };
}
```

### 5. Compliance Reporting Hook Point

**File:** `/home/user/summit/server/src/services/ComplianceService.ts`

**Add Selector Minimization to Compliance Assessment:**
```typescript
private async assessQueryMinimizationRequirement(
  requirement: ComplianceRequirement
): Promise<any> {
  const findings: ComplianceFinding[] = [];
  
  // Check query expansion policies
  const expansionPolicy = policyConfig.maxSelectorExpansion;
  const violations = await this.queryAuditForExpansionViolations(
    expansionPolicy
  );
  
  if (violations.length > 0) {
    findings.push({
      id: 'query-minimization-violations',
      severity: 'high',
      title: 'Query Selector Expansion Violations',
      description: `${violations.length} queries exceeded selector expansion threshold`,
      impact: 'Potential resource exhaustion and performance degradation',
      riskRating: 7,
      // ...
    });
  }
  
  return { status: findings.length === 0 ? 'compliant' : 'non-compliant', findings };
}
```

---

## Required Environment Variables

### Audit & Logging
```bash
AUDIT_LOGGING_ENABLED=true
AUDIT_RETENTION_DAYS=2555  # 7 years
AUDIT_BUFFER_FLUSH_INTERVAL_MS=5000
AUDIT_CRITICAL_FLUSH_ENABLED=true
```

### Policy Enforcement
```bash
POLICY_ENFORCEMENT_ENABLED=true
OPA_URL=http://opa:8181
OPA_POLICY_PATH=policies/main.rego
MAX_SELECTOR_EXPANSION_RATIO=10
SELECTOR_EXPANSION_ALERT_THRESHOLD=5
```

### Compliance
```bash
COMPLIANCE_FRAMEWORKS=GDPR,SOC2,ISO27001
COMPLIANCE_ASSESSMENT_FREQUENCY=monthly
COMPLIANCE_REPORT_RETENTION_DAYS=2555
```

### Monitoring
```bash
MONITORING_ENABLED=true
ANOMALY_DETECTION_ENABLED=true
Z_SCORE_THRESHOLD=4
PERFORMANCE_ALERT_THRESHOLD_MS=1000
```

### Report Generation
```bash
REPORT_STORAGE_PATH=/tmp
REPORT_RETENTION_DAYS=30
SCHEDULED_REPORT_ENABLED=true
REPORT_GENERATION_TIMEOUT_MS=300000  # 5 minutes
```

---

## Database Schemas for Selector Minimization

### PostgreSQL Table for Tracking Query Expansion

```sql
CREATE TABLE IF NOT EXISTS query_expansion_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  correlation_id UUID NOT NULL,
  session_id UUID,
  
  -- Query identification
  graphql_operation_name TEXT,
  base_selectors INTEGER NOT NULL,
  expanded_selectors INTEGER NOT NULL,
  expansion_ratio FLOAT NOT NULL,
  
  -- Execution metrics
  execution_time_ms INTEGER,
  data_transferred_bytes BIGINT,
  result_count INTEGER,
  
  -- Analysis
  is_anomalous BOOLEAN DEFAULT FALSE,
  z_score FLOAT,
  user_baseline_expansion FLOAT,
  
  -- Classification
  severity TEXT,  -- low, medium, high, critical
  data_classification TEXT,
  
  -- Compliance
  policy_violation BOOLEAN DEFAULT FALSE,
  violation_type TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

CREATE INDEX idx_query_expansion_tenant ON query_expansion_metrics(tenant_id);
CREATE INDEX idx_query_expansion_user ON query_expansion_metrics(user_id);
CREATE INDEX idx_query_expansion_anomalous ON query_expansion_metrics(is_anomalous);
CREATE INDEX idx_query_expansion_violation ON query_expansion_metrics(policy_violation);
CREATE INDEX idx_query_expansion_created ON query_expansion_metrics(created_at DESC);
```

### Redis Keys for Caching Expansion Baselines

```
# User baseline expansion ratios
expansion:baseline:{tenant_id}:{user_id} => { average_ratio, last_update }

# Anomaly flags
expansion:anomaly:{tenant_id}:{user_id}:{timewindow} => { count, severity }

# Real-time alerts
expansion:alerts:{tenant_id} => [{ user_id, timestamp, severity, message }]
```

---

## Testing Integration Points

### Unit Test Template

```typescript
describe('Query Selector Minimization', () => {
  it('should detect high selector expansion', async () => {
    const metrics = {
      baseSelectors: 5,
      expandedSelectors: 50,
      expansionRatio: 10,
    };
    
    const policy = await policyEnforcer.enforce({
      tenantId: 'test-tenant',
      userId: 'test-user',
      action: 'read',
      expandedSelectors: metrics.expandedSelectors,
      baseSelectors: metrics.baseSelectors,
    });
    
    expect(policy.allow).toBe(false);
    expect(policy.reason).toContain('expansion');
  });
  
  it('should log expansion anomalies', async () => {
    const anomaly = detectExpansionAnomaly([2, 2.1, 2.2], 15);
    expect(anomaly.anomaly).toBe(true);
    expect(anomaly.z).toBeGreaterThan(4);
    
    const auditId = await auditSystem.recordEvent({
      eventType: 'anomaly_detected',
      details: { ...anomaly },
    });
    
    expect(auditId).toBeDefined();
  });
  
  it('should generate compliance findings for violations', async () => {
    const assessment = await complianceService.runAssessment('soc2');
    const findings = assessment.findings.filter(f =>
      f.title.includes('Query')
    );
    
    expect(findings.length).toBeGreaterThan(0);
  });
});
```

---

## Dashboard Metrics for Selector Minimization

### New Widget for Security Dashboard

```typescript
{
  type: 'metric',
  title: 'Query Expansion Anomalies (24h)',
  query: 'query_expansion_anomalies_24h',
  threshold: 10,
  severity_alert: 5,
}

{
  type: 'chart',
  title: 'Selector Expansion Distribution',
  query: 'selector_expansion_distribution',
  chartType: 'histogram',
}

{
  type: 'table',
  title: 'Top Query Expansion Violators',
  query: 'top_expansion_violators',
  columns: ['user', 'count', 'max_ratio', 'severity'],
}

{
  type: 'gauge',
  title: 'Compliance Score - Query Minimization',
  query: 'query_minimization_compliance_score',
  min: 0,
  max: 100,
  thresholds: { yellow: 80, red: 60 },
}
```

---

## Alerting Rules

### Prometheus Alert Rules

```yaml
- alert: QuerySelectorExpansionThresholdExceeded
  expr: |
    query_expansion:ratio:max{job="graphql"} > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High query selector expansion detected"
    
- alert: SelectorExpansionAnomalyDetected
  expr: |
    increase(query_expansion:anomalies:total[5m]) > 5
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Multiple anomalous query expansions detected"
    
- alert: QueryMinimizationComplianceViolation
  expr: |
    compliance:query_minimization:violation:total > 0
  for: 10m
  labels:
    severity: high
  annotations:
    summary: "Query minimization compliance violations detected"
```

---

## Performance Benchmarks

### Expected Metrics

| Metric | Baseline | Alert Threshold |
|--------|----------|-----------------|
| Selector expansion detection latency | <10ms | >100ms |
| Anomaly detection latency | <50ms | >500ms |
| Policy enforcement latency | <20ms | >200ms |
| Audit event flush rate | <5s | >30s |
| Compliance assessment duration | <60s | >120s |

---

## Integration Checklist

- [ ] Query expansion metric collection implemented
- [ ] Policy enforcer integrated with selector validation
- [ ] Audit system logging selector expansion events
- [ ] Anomaly detection integrated for expansion metrics
- [ ] Compliance assessment includes selector minimization
- [ ] Access prompt mechanism for high-expansion queries
- [ ] Real-time alerts configured
- [ ] Dashboard widgets created
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance benchmarks validated
- [ ] Documentation updated

