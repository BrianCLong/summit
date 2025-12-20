# Graph Performance Benchmark Harness

A comprehensive benchmark suite for testing Neo4j graph query performance in the Summit stack.

## Overview

This benchmark harness helps you:
- **Measure performance** of core graph queries (k-hop traversal, centrality, shortest paths, etc.)
- **Detect regressions** by comparing against performance budgets
- **Generate reports** showing latency distributions (p50, p95, p99) and memory usage
- **Run in CI** to catch performance issues before they reach production

## Quick Start

### Prerequisites

1. **Neo4j running locally:**
   ```bash
   # From repository root
   docker compose -f docker-compose.neo4j.yml up -d
   ```

2. **Install dependencies:**
   ```bash
   cd benchmarks/graph
   npm install
   ```

### Running Benchmarks

**Quick benchmark (small dataset, essential queries):**
```bash
npm run bench:quick
```

**Full benchmark (all dataset sizes, all scenarios):**
```bash
npm run bench:full
```

**CI mode (small/medium datasets with budget checking):**
```bash
npm run bench:ci
```

**Custom benchmark:**
```bash
node runner/index.js \
  --size medium,large \
  --scenarios all \
  --iterations 100 \
  --warmup 10 \
  --budget-check \
  --neo4j-uri bolt://localhost:7687
```

### Viewing Results

**Generate reports:**
```bash
npm run report
```

This creates:
- `reports/report.md` - Markdown report with tables
- `reports/report.html` - Interactive HTML report
- `reports/latest.json` - Raw benchmark data

**Open HTML report:**
```bash
open reports/report.html  # macOS
xdg-open reports/report.html  # Linux
```

## Architecture

```
benchmarks/graph/
├── config/
│   └── budgets.json          # Performance budgets (p95 thresholds)
├── fixtures/
│   └── dataset-generator.js  # Synthetic graph data generator
├── scenarios/
│   └── index.js              # Query benchmark definitions
├── runner/
│   ├── index.js              # Main benchmark runner
│   └── report.js             # Report generator
├── reports/                  # Generated reports (gitignored)
│   ├── latest.json
│   ├── report.md
│   └── report.html
└── README.md
```

## Dataset Sizes

The harness generates synthetic investigation graphs with realistic properties:

| Size   | Nodes    | Edges     | Avg Degree | Use Case                          |
|--------|----------|-----------|------------|-----------------------------------|
| small  | 100      | 250       | 5.0        | Quick smoke tests, CI             |
| medium | 1,000    | 3,000     | 6.0        | Typical investigation size        |
| large  | 10,000   | 30,000    | 6.0        | Large investigations, stress test |
| xl     | 50,000   | 150,000   | 6.0        | Enterprise scale, perf profiling  |

**Dataset characteristics:**
- **Scale-free topology** (preferential attachment) - realistic network structure
- **Multiple entity types**: Person, Organization, Asset, Communication
- **Relationship types**: KNOWS, WORKS_FOR, OWNS, COMMUNICATES_WITH, RELATED_TO
- **Metadata**: Timestamps, confidence scores, tags, descriptions
- **Multi-tenancy**: Tenant ID and investigation ID filtering

## Benchmark Scenarios

### Entity CRUD (`entity_crud`)
- **entity_read**: Single entity lookup by ID
- **entity_update**: Entity property updates
- **relationship_read**: Fetch entity's neighbors

**Performance budgets:** p95 < 50ms

### K-Hop Traversal (`k_hop_traversal`)
Matches GraphRAG subgraph retrieval patterns.

- **k_hop_1**: 1-hop neighborhood expansion
- **k_hop_2**: 2-hop subgraph (GraphRAG pattern)
- **k_hop_3**: 3-hop deep traversal

**Performance budgets:**
- 1-hop: p95 < 75ms
- 2-hop: p95 < 150ms (critical)
- 3-hop: p95 < 300ms

### Shortest Path (`shortest_path`)
- **shortest_path_single**: Single shortest path between nodes
- **all_shortest_paths**: All shortest paths (limited to 10)

**Performance budgets:** p95 < 100ms (critical for single path)

### Centrality (`centrality`)
Based on `GraphAnalyticsService.js` patterns.

- **degree_centrality**: Count relationships per node
- **betweenness_centrality_approx**: Approximate betweenness via shortest paths
- **closeness_centrality**: Average distance to other nodes

**Performance budgets:** p95 < 150-500ms depending on algorithm

### Community Detection (`community_detection`)
- **connected_components**: Find strongly connected components
- **relationship_pattern_analysis**: Relationship type frequency

**Performance budgets:** p95 < 300ms

### Graph Metrics (`graph_metrics`)
- **basic_metrics**: Node count, edge count, degree distribution stats
- **degree_distribution**: Histogram of node degrees

**Performance budgets:** p95 < 120ms (critical)

## Scenario Groups

Predefined scenario combinations for different use cases:

- **`quick`**: Entity CRUD + k-hop traversal (fast smoke test)
- **`ci`**: Quick + shortest path + graph metrics (CI-friendly)
- **`all`**: All scenarios (comprehensive benchmarking)

## Performance Budgets

Performance budgets are defined in `config/budgets.json` and specify acceptable latency thresholds.

**Example budget:**
```json
{
  "k_hop_traversal_2": {
    "description": "2-hop subgraph retrieval (GraphRAG pattern)",
    "thresholds": {
      "p50": 50,
      "p95": 150,
      "p99": 300
    },
    "critical": true
  }
}
```

- **critical: true**: Failures block CI (must pass)
- **critical: false**: Warnings only, doesn't block CI
- **regression_threshold**: 15% - Fail if p95 increases by >15%

### Adjusting Budgets

Edit `config/budgets.json` to update thresholds based on:
- Infrastructure changes (faster hardware)
- Query optimizations (indexes, query rewrites)
- Business requirements (stricter SLAs)

## CI Integration

The benchmark runs automatically on PRs that modify graph-related code:

**Trigger paths:**
- `server/src/services/GraphRAGService.ts`
- `server/src/services/GraphAnalyticsService.js`
- `server/src/repos/EntityRepo.ts`
- `server/src/repos/RelationshipRepo.ts`
- `server/src/db/neo4j.ts`
- `server/src/ai/nl-to-cypher/**`
- `benchmarks/graph/**`
- `docker-compose.neo4j.yml`

**CI behavior:**
1. Spins up Neo4j service container
2. Runs benchmarks with small/medium datasets
3. Checks against performance budgets
4. Posts comment on PR with results
5. **Fails PR if critical budgets exceeded**

**Manual trigger:**
```bash
gh workflow run graph-benchmark.yml \
  -f size=small,medium \
  -f scenarios=ci
```

## CLI Reference

### Runner Options

```bash
node runner/index.js [options]
```

| Option              | Description                           | Default           |
|---------------------|---------------------------------------|-------------------|
| `--size`            | Dataset sizes (comma-separated)       | `small`           |
| `--scenarios`       | Scenario group: quick, ci, all        | `all`             |
| `--iterations`      | Iterations per query                  | `100`             |
| `--warmup`          | Warmup iterations                     | `10`              |
| `--budget-check`    | Check budgets and exit 1 if exceeded  | `false`           |
| `--neo4j-uri`       | Neo4j connection URI                  | `bolt://localhost:7687` |
| `--neo4j-user`      | Neo4j username                        | `neo4j`           |
| `--neo4j-password`  | Neo4j password                        | `testtest1`       |

### NPM Scripts

- `npm run bench:quick` - Quick benchmark (small dataset, quick scenarios)
- `npm run bench:full` - Full benchmark (all sizes, all scenarios)
- `npm run bench:ci` - CI mode (small/medium, ci scenarios, budget check)
- `npm run bench:profile` - Run with Node.js inspector for profiling
- `npm run report` - Generate HTML and Markdown reports
- `npm run clean` - Remove generated reports

## Interpreting Results

### Latency Metrics

- **p50 (median)**: 50% of queries complete within this time
- **p95**: 95% of queries complete within this time (SLA target)
- **p99**: 99% of queries complete within this time (tail latency)
- **mean**: Average latency (affected by outliers)
- **stddev**: Standard deviation (consistency indicator)

**Example:**
```
k_hop_2: p50: 45.2ms, p95: 132.7ms, p99: 201.3ms
```
- Typical query: ~45ms
- SLA target: <150ms (95% of requests)
- Worst case: ~200ms (1% of requests)

### Status Indicators

- ✅ **PASS**: Query within all budgets
- ⚠️ **WARN**: Exceeded budget, but not critical
- ❌ **FAIL**: Exceeded critical budget (blocks CI)

### Common Patterns

**Query too slow?**
1. Check Neo4j indexes: `CREATE INDEX entity_investigation IF NOT EXISTS FOR (e:Entity) ON (e.investigationId)`
2. Add query limits: `LIMIT 100`
3. Use APOC for k-hop traversal instead of variable-length patterns
4. Profile query: `EXPLAIN` / `PROFILE` in Neo4j Browser

**High variance (large stddev)?**
- JVM warmup issues (increase `--warmup`)
- Garbage collection pauses (tune Neo4j heap)
- Query plan changes (missing indexes)
- Cache thrashing (dataset too large for page cache)

**Memory growth?**
- Result set too large (add `LIMIT`)
- Relationship explosion in k-hop traversal
- Neo4j driver not releasing sessions

## Query Optimization Tips

### Use Indexes

```cypher
CREATE INDEX entity_investigation IF NOT EXISTS FOR (e:Entity) ON (e.investigationId);
CREATE INDEX entity_id IF NOT EXISTS FOR (e:Entity) ON (e.id);
CREATE CONSTRAINT entity_uuid IF NOT EXISTS FOR (e:Entity) REQUIRE e.uuid IS UNIQUE;
```

### Limit Result Sets

```cypher
-- Before (slow)
MATCH (n)-[r*1..3]-(m)
RETURN n, r, m

-- After (fast)
MATCH (n)-[r*1..3]-(m)
RETURN n, r, m
LIMIT 100
```

### Use APOC for K-Hop

```cypher
-- Before (slow, exponential expansion)
MATCH (anchor)-[*1..3]-(node)
RETURN DISTINCT node

-- After (fast, controlled expansion)
CALL apoc.path.subgraphAll(anchor, {
  maxLevel: 3,
  relationshipFilter: 'RELATIONSHIP>',
  labelFilter: 'Entity'
}) YIELD nodes, relationships
RETURN nodes, relationships
```

### Filter Early

```cypher
-- Before (slow, filter after expansion)
MATCH (n)-[r]-(m)
WHERE n.investigationId = $invId
RETURN m

-- After (fast, filter before expansion)
MATCH (n {investigationId: $invId})-[r]-(m)
RETURN m
```

## Advanced Usage

### Custom Scenarios

Add new scenarios in `scenarios/index.js`:

```javascript
export const myCustomScenario = {
  name: 'my_scenario',
  description: 'My custom benchmark',
  setup: async (session, dataset) => {
    // Setup phase (e.g., precompute anchors)
    return { /* context */ };
  },
  queries: [
    {
      name: 'my_query',
      query: `MATCH (n) WHERE n.id = $id RETURN n`,
      params: (ctx, dataset) => ({ id: 'entity-123' })
    }
  ]
};
```

Then add to scenario groups:

```javascript
export const scenarioGroups = {
  all: [...existingScenarios, myCustomScenario]
};
```

### Custom Datasets

Generate datasets programmatically:

```javascript
import { generateDataset, generateCypherStatements } from './fixtures/dataset-generator.js';

const dataset = generateDataset('medium', 'my-seed');
const statements = generateCypherStatements(dataset);

// Modify dataset before loading
dataset.nodes.push({ id: 'custom-node', ... });
```

### Profiling

Run with Node.js inspector:

```bash
npm run bench:profile
# Then open chrome://inspect in Chrome
```

Or use Neo4j `PROFILE`:

```bash
node -e "
const driver = require('neo4j-driver').default;
const d = driver('bolt://localhost:7687', driver.auth.basic('neo4j', 'testtest1'));
const session = d.session();
session.run('PROFILE MATCH (n)-[r*1..2]-(m) RETURN n, r, m LIMIT 10')
  .then(r => console.log(r.summary.profile))
  .finally(() => { session.close(); d.close(); });
"
```

## Troubleshooting

### Neo4j connection refused

```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Start Neo4j
docker compose -f docker-compose.neo4j.yml up -d

# Check logs
docker logs neo4j-ephemeral
```

### Out of memory errors

Increase Neo4j heap size in `docker-compose.neo4j.yml`:

```yaml
environment:
  - NEO4J_server_memory_heap_max__size=1g  # Increase from 512m
  - NEO4J_dbms_memory_pagecache_size=512m  # Increase from 256m
```

### Benchmarks too slow

Reduce iterations or dataset size:

```bash
node runner/index.js --size small --iterations 20 --warmup 2
```

### Budget check failures

1. Review `reports/report.html` to identify slow queries
2. Profile queries in Neo4j Browser with `PROFILE`
3. Check for missing indexes
4. Consider adjusting budgets if infrastructure changed

## Contributing

### Adding New Query Patterns

1. Identify query pattern in production code
2. Add scenario to `scenarios/index.js`
3. Add performance budget to `config/budgets.json`
4. Run benchmark: `npm run bench:full`
5. Review results and adjust budgets
6. Update documentation

### Updating Budgets

After infrastructure improvements:

1. Run full benchmark: `npm run bench:full`
2. Review p95 latencies in report
3. Update `config/budgets.json` with new thresholds
4. Document changes in commit message

## FAQ

**Q: Why do results vary between runs?**

A: JVM warmup, garbage collection, and OS scheduling cause natural variance. Run with higher `--iterations` (>100) for stable results.

**Q: Should I run benchmarks in CI on every PR?**

A: The workflow only triggers on graph-related code changes to minimize CI time. You can also manually trigger for specific PRs.

**Q: How do I compare performance before/after a change?**

A: Run benchmarks on both branches and compare `reports/latest.json`:

```bash
git checkout main
npm run bench:full
cp reports/latest.json /tmp/baseline.json

git checkout my-feature
npm run bench:full
# Compare reports/latest.json with /tmp/baseline.json
```

**Q: Can I use this with production Neo4j?**

A: **No.** Benchmarks load synthetic data and can affect production. Always use a dedicated test instance.

**Q: What if a query is consistently over budget?**

A:
1. Optimize the query (indexes, limits, APOC)
2. If optimization isn't feasible, update the budget with justification
3. Consider caching at the application layer
4. Document the limitation for users

## Related Documentation

- [Neo4j Performance Tuning](https://neo4j.com/docs/operations-manual/current/performance/)
- [APOC Procedures](https://neo4j.com/labs/apoc/4.4/)
- [GraphRAG Service](../../server/src/services/GraphRAGService.ts)
- [Graph Analytics Service](../../server/src/services/GraphAnalyticsService.js)
- [Summit Dev Stack](../../compose/README.md)

## License

Internal use only - Summit Intelligence Platform
