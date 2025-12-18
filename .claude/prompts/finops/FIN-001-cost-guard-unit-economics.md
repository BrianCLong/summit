---
id: FIN-001
name: FinOps Cost-Guard & Unit-Economics Governor
slug: cost-guard-unit-economics
category: finops
subcategory: cost-optimization
priority: medium
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Implements a cost governor that tracks $/insight and joules/insight, enforces
  query budgets, auto-archives cold data, and recommends cheaper equivalent pipelines.

objective: |
  Control operational costs while maintaining analytical capability through automated
  optimization and budget enforcement.

tags:
  - finops
  - cost-optimization
  - budgets
  - unit-economics
  - energy-efficiency
  - auto-archival

dependencies:
  services:
    - postgresql
    - prometheus
  packages:
    - "@intelgraph/telemetry"
    - "@intelgraph/audit"

deliverables:
  - type: service
    description: Cost tracking and governance service
  - type: dashboard
    description: FinOps dashboard with cost visualizations
  - type: tests
    description: Budget enforcement test suite
  - type: documentation
    description: Cost optimization playbook

acceptance_criteria:
  - description: Cost per insight tracked for all queries
    validation: Query cost metrics API, verify $ and energy costs logged
  - description: Query budgets enforced
    validation: Exceed budget, verify query blocked
  - description: Cold data auto-archived
    validation: Check archival job runs, old data moved to cold storage
  - description: Cost recommendations generated
    validation: Expensive query triggers optimization recommendation

estimated_effort: 5-7 days
complexity: medium

related_prompts:
  - INT-001
  - DQ-001
  - OPS-001

blueprint_path: ../blueprints/templates/service
---

# FinOps Cost-Guard & Unit-Economics Governor

## Objective

Implement comprehensive cost governance for the intelligence platform, tracking unit economics ($/insight, joules/insight), enforcing budgets, and automatically optimizing resource usage without degrading analytical capability.

## Prompt

**Implement a cost governor that tracks $/insight and joules/insight, enforces query budgets, auto-archives cold data, and recommends cheaper equivalent pipelines (prove same conclusion with PCA replay). Provide dashboards and 'downward pressure' levers.**

### Core Requirements

**(a) Unit Economics Tracking**

Track cost and energy per analytical operation:

```typescript
interface UnitEconomics {
  operationId: string;
  operationType: 'query' | 'analysis' | 'export' | 'ml_inference';
  timestamp: Date;
  costs: {
    compute: number;  // $ (CPU/GPU time)
    storage: number;  // $ (data accessed)
    network: number;  // $ (data transfer)
    external: number;  // $ (third-party API calls)
    total: number;
  };
  energy: {
    cpuJoules: number;
    gpuJoules: number;
    networkJoules: number;
    totalJoules: number;
    carbonGrams: number;  // CO2 emissions
  };
  insights: number;  // Insights generated (entities discovered, relationships identified)
  costPerInsight: number;  // $/insight
  joulesPerInsight: number;
}

// Track query cost
async function trackQueryCost(query: Query, result: QueryResult): Promise<void> {
  const economics: UnitEconomics = {
    operationId: query.id,
    operationType: 'query',
    timestamp: new Date(),
    costs: {
      compute: await computeCost(query),
      storage: await storageCost(query),
      network: await networkCost(query),
      external: await externalAPICost(query),
      total: 0  // Computed below
    },
    energy: await computeEnergy(query),
    insights: result.entities.length + result.relationships.length,
    costPerInsight: 0,  // Computed below
    joulesPerInsight: 0
  };

  economics.costs.total = Object.values(economics.costs).reduce((a, b) => a + b, 0);
  economics.costPerInsight = economics.costs.total / Math.max(economics.insights, 1);
  economics.joulesPerInsight = economics.energy.totalJoules / Math.max(economics.insights, 1);

  // Store
  await unitEconomicsDb.insert(economics);

  // Export metrics
  prometheusClient.histogram('query_cost_usd', economics.costs.total);
  prometheusClient.histogram('query_energy_joules', economics.energy.totalJoules);
  prometheusClient.histogram('cost_per_insight_usd', economics.costPerInsight);
}

// Compute cost (example: AWS pricing)
async function computeCost(query: Query): Promise<number> {
  const executionTimeMs = query.metadata.executionTime;
  const cpuCoreHours = (executionTimeMs / 3600000) * query.metadata.cpuCores;
  const costPerCoreHour = 0.05;  // $0.05/core-hour (example)
  return cpuCoreHours * costPerCoreHour;
}

// Compute energy (using RAPL or cloud provider APIs)
async function computeEnergy(query: Query): Promise<Energy> {
  // Read from hardware counters (Intel RAPL)
  const cpuJoules = await raplReader.getCPUEnergy(query.startTime, query.endTime);
  const gpuJoules = await raplReader.getGPUEnergy(query.startTime, query.endTime);

  // Estimate network energy
  const networkJoules = query.metadata.bytesTransferred * 0.001;  // 1J/KB estimate

  const totalJoules = cpuJoules + gpuJoules + networkJoules;

  // Carbon intensity (g CO2/kWh varies by region, use 400g/kWh average)
  const carbonGrams = (totalJoules / 3600000) * 400;  // kWh * g/kWh

  return { cpuJoules, gpuJoules, networkJoules, totalJoules, carbonGrams };
}
```

**(b) Query Budget Enforcement**

Prevent cost overruns:

```typescript
interface Budget {
  id: string;
  scope: 'user' | 'team' | 'project';
  scopeId: string;
  period: 'daily' | 'weekly' | 'monthly';
  limits: {
    totalCost: number;  // $ cap
    totalEnergy: number;  // Joules cap
    queryCount: number;  // # queries
  };
  current: {
    totalCost: number;
    totalEnergy: number;
    queryCount: number;
  };
  resetAt: Date;
}

interface BudgetGuard {
  // Check if query within budget
  checkBudget(user: User, estimatedCost: number): Promise<BudgetCheck>;

  // Deduct from budget
  deductBudget(user: User, actualCost: UnitEconomics): Promise<void>;

  // Reset budgets periodically
  resetBudgets(): Promise<void>;
}

// Before executing query
async function executeQuery(query: Query, user: User): Promise<QueryResult> {
  // Estimate cost
  const estimate = await costEstimator.estimate(query);

  // Check budget
  const budgetCheck = await budgetGuard.checkBudget(user, estimate.totalCost);

  if (!budgetCheck.allowed) {
    throw new Error(
      `Budget exceeded: ${budgetCheck.reason}\n` +
      `Current: $${budgetCheck.current.toFixed(2)} / $${budgetCheck.limit.toFixed(2)}\n` +
      `Resets: ${budgetCheck.resetAt.toISOString()}`
    );
  }

  // Execute query
  const result = await graphDb.execute(query);

  // Track actual cost
  const actual = await trackQueryCost(query, result);

  // Deduct from budget
  await budgetGuard.deductBudget(user, actual);

  return result;
}
```

**(c) Auto-Archive Cold Data**

Move infrequently accessed data to cold storage:

```typescript
interface ArchivalPolicy {
  dataType: string;
  coldThreshold: number;  // Days since last access
  archiveTo: 'glacier' | 's3-ia' | 'tape';
  retentionPeriod: number;  // Days to keep in cold storage
}

const archivalPolicies: ArchivalPolicy[] = [
  {
    dataType: 'investigation',
    coldThreshold: 180,  // 6 months
    archiveTo: 's3-ia',
    retentionPeriod: 2555  // 7 years
  },
  {
    dataType: 'entity',
    coldThreshold: 365,  // 1 year
    archiveTo: 'glacier',
    retentionPeriod: 3650  // 10 years
  }
];

// Daily archival job
async function runArchivalJob(): Promise<void> {
  for (const policy of archivalPolicies) {
    // Find cold records
    const coldRecords = await findColdRecords(policy);

    for (const record of coldRecords) {
      // Archive to cold storage
      await archiveRecord(record, policy.archiveTo);

      // Remove from hot storage
      await deleteFromHotStorage(record.id);

      // Log
      console.log(`Archived ${record.id} to ${policy.archiveTo}`);
    }
  }
}

async function findColdRecords(policy: ArchivalPolicy): Promise<Record[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.coldThreshold);

  return db.query(`
    SELECT id, data
    FROM records
    WHERE type = $1
      AND last_accessed_at < $2
      AND archived_at IS NULL
  `, [policy.dataType, cutoffDate]);
}

// Cost savings
// Hot storage: $0.023/GB/month
// S3-IA: $0.0125/GB/month
// Glacier: $0.004/GB/month
// Potential savings: ~80% for rarely accessed data
```

**(d) Cheaper Equivalent Pipeline Recommendations**

Suggest optimizations:

```typescript
interface CostOptimization {
  queryId: string;
  currentCost: number;
  optimizedQuery: string;
  estimatedCost: number;
  savings: number;  // $
  savingsPercent: number;
  proofOfEquivalence: EquivalenceProof;
}

interface EquivalenceProof {
  method: 'pca_replay' | 'sampling' | 'approximation';
  testCases: number;
  matchRate: number;  // % of test cases with same result
  confidence: number;
}

// Detect expensive queries
async function detectExpensiveQueries(): Promise<Query[]> {
  const threshold = 1.00;  // $1/query

  return unitEconomicsDb.query(`
    SELECT *
    FROM unit_economics
    WHERE costs->>'total' > $1
    ORDER BY (costs->>'total')::numeric DESC
    LIMIT 100
  `, [threshold]);
}

// Generate optimization
async function optimizeQuery(query: Query): Promise<CostOptimization> {
  // Example optimizations:
  // 1. Add index hints
  // 2. Use approximate algorithms (e.g., HyperLogLog for COUNT DISTINCT)
  // 3. Downsample data
  // 4. Cache intermediate results

  const optimized = await queryOptimizer.optimize(query);

  // Prove equivalence using PCA replay
  const proof = await proveEquivalence(query, optimized);

  return {
    queryId: query.id,
    currentCost: query.cost,
    optimizedQuery: optimized.cypher,
    estimatedCost: await costEstimator.estimate(optimized).totalCost,
    savings: query.cost - optimized.cost,
    savingsPercent: ((query.cost - optimized.cost) / query.cost) * 100,
    proofOfEquivalence: proof
  };
}

// Prove equivalence
async function proveEquivalence(
  original: Query,
  optimized: Query
): Promise<EquivalenceProof> {
  const testCases = await generateTestCases(original, 100);
  let matches = 0;

  for (const testCase of testCases) {
    const origResult = await execute(original, testCase);
    const optResult = await execute(optimized, testCase);

    if (resultsEquivalent(origResult, optResult)) {
      matches++;
    }
  }

  return {
    method: 'pca_replay',
    testCases: testCases.length,
    matchRate: matches / testCases.length,
    confidence: matches / testCases.length
  };
}
```

**(e) FinOps Dashboard**

Visualize costs and trends:

```typescript
interface FinOpsDashboard {
  // Overview metrics
  totalCostToday: number;
  totalCostMonth: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  topCostDrivers: Array<{ service: string; cost: number }>;

  // Unit economics
  avgCostPerInsight: number;
  avgEnergyPerInsight: number;
  carbonFootprint: number;  // kg CO2

  // Budget status
  budgets: Array<{
    name: string;
    spent: number;
    limit: number;
    remaining: number;
    daysLeft: number;
  }>;

  // Optimization opportunities
  recommendations: CostOptimization[];
  potentialSavings: number;

  // Archival stats
  archivedDataGB: number;
  savingsFromArchival: number;
}

// React dashboard
function FinOpsDashboard() {
  const { data } = useQuery(GET_FINOPS_METRICS);

  return (
    <div>
      <MetricCards
        totalCost={data.totalCostMonth}
        costPerInsight={data.avgCostPerInsight}
        carbonFootprint={data.carbonFootprint}
      />

      <CostTrendChart data={data.costHistory} />

      <BudgetGauges budgets={data.budgets} />

      <OptimizationRecommendations
        recommendations={data.recommendations}
        onApply={applyOptimization}
      />

      <ArchivalStats
        archivedGB={data.archivedDataGB}
        savings={data.savingsFromArchival}
      />
    </div>
  );
}
```

**(f) Downward Pressure Levers**

Manual cost controls:

```yaml
# cost-levers.yml
levers:
  - id: reduce-retention
    name: "Reduce hot data retention"
    action: decrease_cold_threshold
    from: 180_days
    to: 90_days
    estimated_savings: 1200  # $/month

  - id: limit-ml-inference
    name: "Limit ML inference to high-value queries"
    action: disable_ml_for_low_priority
    estimated_savings: 800

  - id: compress-archives
    name: "Enable compression for cold archives"
    action: enable_compression
    estimated_savings: 400

  - id: cache-popular-queries
    name: "Cache top 100 queries"
    action: enable_query_cache
    size: 100
    estimated_savings: 600
```

Execute lever:
```bash
finops apply-lever reduce-retention --dry-run
finops apply-lever reduce-retention --confirm
```

### Deliverables Checklist

- [x] Unit economics tracking
- [x] Cost estimation engine
- [x] Budget enforcement service
- [x] Auto-archival job
- [x] Query optimizer with equivalence proofs
- [x] FinOps dashboard (React)
- [x] Prometheus metrics export
- [x] Cost lever CLI
- [x] Budget notification system
- [x] Cost optimization playbook

### Acceptance Criteria

1. **Unit Economics**
   - [ ] Execute 10 queries
   - [ ] Verify costs logged
   - [ ] Check $/insight computed

2. **Budget Enforcement**
   - [ ] Set budget to $10/day
   - [ ] Execute queries totaling $11
   - [ ] Verify last query blocked

3. **Auto-Archival**
   - [ ] Create old records (>180 days)
   - [ ] Run archival job
   - [ ] Verify moved to cold storage

4. **Optimization**
   - [ ] Generate optimization for expensive query
   - [ ] Verify equivalence proof
   - [ ] Apply optimization
   - [ ] Confirm cost savings

## Implementation Notes

### Cloud Provider Integration

- AWS: CloudWatch + Cost Explorer API
- Azure: Cost Management API
- GCP: Cloud Billing API

### Energy Measurement

- **Hardware**: Intel RAPL (Linux)
- **Cloud**: Use provider carbon APIs
- **Estimation**: Fallback to TDP-based estimates

### Caching Strategy

- Cache popular queries (top 100 by frequency)
- TTL: 1 hour
- Invalidate on source data change

## References

- [FinOps Foundation](https://www.finops.org/)
- [Intel RAPL](https://www.intel.com/content/www/us/en/developer/articles/technical/software-security-guidance/advisory-guidance/running-average-power-limit-energy-reporting.html)

## Related Prompts

- **INT-001**: API Gateway (enforce query costs at gateway)
- **DQ-001**: Data Quality Dashboard (correlate DQ with costs)
- **OPS-001**: Runbook Engine (automate cost optimization playbooks)
