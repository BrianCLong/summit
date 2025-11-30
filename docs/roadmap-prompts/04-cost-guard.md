# Prompt #4: Cost Guard - Budget Enforcement & Query Optimization

**Target**: Ops Q4 2025
**Owner**: Platform/Ops team
**Depends on**: Neo4j, Cost estimation from Prompt #1

---

## Pre-Flight Checklist

```bash
# ✅ Check existing cost tracking
grep -r "budget\|cost" services/*/src/ | head -10

# ✅ Verify archival infrastructure
ls -la services/archive/ 2>/dev/null || echo "Need archival service"

# ✅ Check observability stack
curl http://localhost:9090/api/v1/query?query=up

# ✅ Verify S3/storage access
aws s3 ls 2>/dev/null || echo "Configure AWS CLI or use localstack"
```

---

## Claude Prompt

```
You are implementing Cost Guard for IntelGraph - budget enforcement, query optimization, and archival tiering.

CONTEXT:
- Stack: Node.js + Neo4j 5.24.0, S3/Glacier (or compatible storage), Prometheus
- Existing: server/src/ai/nl-graph-query/cost-estimator.ts (from Prompt #1)
- Frontend: apps/web/src/components/

REQUIREMENTS:
Build a cost control system with:

1. **Per-Tenant Budgets**:
   - Model: {tenantId, monthlyBudget (credits), currentUsage, alertThresholds[]}
   - Storage: PostgreSQL or Redis
   - Middleware: Check budget before query execution
   - Actions: warn (80%), throttle (90%), block (100%)

2. **Query Cost Estimation**:
   - Integrate with CypherCostEstimator (Prompt #1)
   - Cost formula: baseCost + (dbHits * 0.01) + (rows * 0.1) + (pathLength * 10)
   - Return: {estimatedCost (credits), cheaperAlternatives[]}
   - Example alternative: "Use index on :Person(name) → -50% cost"

3. **Slow Query Killer**:
   - Monitor: Long-running queries (>5s by default, configurable)
   - Actions:
     - Log slow query with EXPLAIN plan
     - Send alert to Prometheus/Grafana
     - Kill query if >maxExecutionTime (30s default)
     - Suggest optimizations (add index, reduce path length)

4. **Archival Tiering**:
   - Identify cold subgraphs:
     - Entities/relationships not accessed in >90 days
     - Cases marked as "archived" status
   - Export to S3/Glacier:
     - Format: GraphML or JSON-LD
     - Metadata: {archivedAt, originalGraphId, accessCount}
   - Automatic restore:
     - On access: Fetch from S3 → Load into Neo4j (read-only)
     - Cache for 24h, then re-archive
   - Delete from hot storage after successful archive

5. **Cost Dashboard UI**:
   - apps/web/src/components/cost/CostGuardBanner.tsx
   - Display: "You've used 75 of 100 credits this month"
   - Suggestions: "Switch to indexed query → Save 20 credits"
   - Drill-down: Top 10 expensive queries this month

DELIVERABLES:

1. server/src/cost-guard/budget-manager.ts
   - export class BudgetManager
   - Methods: checkBudget(tenantId, estimatedCost), deductCredits(tenantId, actualCost)
   - Storage: PostgreSQL table tenant_budgets

2. server/src/cost-guard/query-optimizer.ts
   - export class QueryOptimizer
   - Methods: suggestCheaperAlternative(cypher, cost), analyzeIndexUsage(explain)
   - Returns: {alternative: string, savings: number, explanation: string}

3. server/src/cost-guard/slow-query-killer.ts
   - export class SlowQueryMonitor
   - Methods: startMonitoring(), killQuery(queryId), logSlowQuery(query, plan)
   - Uses: Neo4j system database (SHOW TRANSACTIONS, TERMINATE TRANSACTION)

4. services/archive/
   - jobs/archive-cold-subgraphs.ts (cron job, daily)
   - lib/s3-archiver.ts (export to S3)
   - lib/restore-from-archive.ts (restore on access)
   - Schema: Track archived graphs in PostgreSQL (archived_graphs table)

5. server/src/middleware/budget-check.ts
   - Express/Apollo middleware
   - Before query execution: Check budget → Estimate cost → Allow/Block
   - After execution: Deduct actual cost

6. apps/web/src/components/cost/CostGuardBanner.tsx
   - Banner at top of app
   - Color-coded: green (<80%), yellow (80-90%), red (>90%)
   - Link to /cost-dashboard for details

7. apps/web/src/pages/CostDashboard.tsx
   - Charts: Monthly usage trend, top queries, cost breakdown
   - Table: Recent queries with cost, duration, optimization suggestions
   - Actions: "Optimize this query" → Open in NL Query Panel with suggestions

8. observability/prometheus/recording-rules.yaml (add):
   - query_cost_credits_total (counter)
   - slow_queries_total (counter)
   - budget_usage_percent (gauge)

9. observability/grafana/provisioning/dashboards/cost-dashboard.json
   - Panels: Budget usage, slow queries, archival stats
   - Alerts: Budget exceeded, too many slow queries

10. Tests:
    - server/tests/cost-guard.budget.test.ts
    - server/tests/cost-guard.optimizer.test.ts
    - services/archive/tests/archival.integration.test.ts
    - k6 load test: Verify ≥20% cost reduction on benchmark workloads

ACCEPTANCE CRITERIA:
✅ Reduce cost by ≥20% on benchmark workloads without accuracy loss
✅ Budget enforcement: Block queries at 100% budget, warn at 80%
✅ Slow queries killed after configurable timeout (default 30s)
✅ Cold subgraphs archived to S3, restored on access within 5s
✅ UI shows real-time budget usage and optimization suggestions

TECHNICAL CONSTRAINTS:
- Neo4j: Use system database for transaction monitoring:
  SHOW TRANSACTIONS YIELD transactionId, elapsedTime WHERE elapsedTime > 5000
  TERMINATE TRANSACTION 'transaction-123'
- S3: Use AWS SDK v3 or compatible (MinIO, Localstack for dev)
- Cost formula: Tunable weights (expose in config)
- Archival format: GraphML with custom namespace for metadata
- Budget persistence: PostgreSQL with daily snapshots

SAMPLE BUDGET SCHEMA (PostgreSQL):
```sql
CREATE TABLE tenant_budgets (
  tenant_id TEXT PRIMARY KEY,
  monthly_budget_credits INT NOT NULL DEFAULT 1000,
  current_usage_credits INT NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL,
  alert_thresholds JSONB DEFAULT '[0.8, 0.9, 1.0]'
);

CREATE TABLE query_costs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  query_hash TEXT NOT NULL,
  estimated_cost INT,
  actual_cost INT,
  duration_ms INT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

SAMPLE OPTIMIZATION SUGGESTION:
```json
{
  "original": "MATCH (p:Person)-[*1..5]->(o:Organization) WHERE p.name = 'John' RETURN o",
  "alternative": "MATCH (p:Person)-[*1..3]->(o:Organization) USING INDEX p:Person(name) WHERE p.name = 'John' RETURN o",
  "savings": 45,
  "explanation": "Reduced path length (5→3) and used index on Person.name"
}
```

SAMPLE ARCHIVAL METADATA (GraphML):
```xml
<graphml>
  <graph id="case-123-archive-2025-11-29">
    <data key="archived_at">2025-11-29T10:00:00Z</data>
    <data key="original_graph_id">case-123</data>
    <data key="access_count">0</data>
    <node id="n1">
      <data key="labels">Person</data>
      <data key="name">Alice</data>
    </node>
  </graph>
</graphml>
```

K6 BENCHMARK WORKLOAD (tests/k6/cost-benchmark.js):
```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  const queries = [
    'MATCH (p:Person)-[*1..3]->(o) RETURN count(o)',
    'MATCH (p:Person) WHERE p.name STARTS WITH "A" RETURN p LIMIT 100'
  ];

  queries.forEach(q => {
    const res = http.post('http://localhost:4000/graphql', JSON.stringify({
      query: `query { runCypher(cypher: "${q}") { cost } }`
    }));
    check(res, { 'cost reduced': (r) => JSON.parse(r.body).data.cost < 100 });
  });
}
```

OUTPUT:
Provide:
(a) Budget manager + middleware
(b) Query optimizer with suggestion engine
(c) Slow query killer
(d) Archival service (S3 export/restore)
(e) React components (CostGuardBanner, CostDashboard)
(f) Prometheus metrics + Grafana dashboard
(g) k6 benchmark suite
(h) Integration tests
```

---

## Success Metrics

- [ ] ≥20% cost reduction on k6 benchmark workloads
- [ ] Budget enforcement: 0 queries executed at >100% budget
- [ ] Slow queries killed within 2s of timeout
- [ ] Archival restore <5s p95 latency
- [ ] UI suggestions improve query performance by ≥15% when followed

---

## Follow-Up Prompts

1. **Predictive budgeting**: ML model to forecast monthly costs
2. **Cost alerts**: Slack/email notifications at budget thresholds
3. **Tiered storage**: Hot (Neo4j) → Warm (S3 Standard) → Cold (Glacier)

---

## References

- Neo4j transaction management: https://neo4j.com/docs/operations-manual/current/manage-databases/queries/
- AWS S3 SDK: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
- GraphML format: http://graphml.graphdrawing.org/
- k6 load testing: https://k6.io/docs/
