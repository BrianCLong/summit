# Quick Start Guide - Graph Benchmarks

## 30-Second Setup

```bash
# 1. Start Neo4j
cd /path/to/summit
docker compose -f docker-compose.neo4j.yml up -d

# 2. Install dependencies
cd benchmarks/graph
npm install

# 3. Run quick benchmark
npm run bench:quick

# 4. View results
npm run report
open reports/report.html  # or xdg-open on Linux
```

## What You Get

**p95 latencies for core queries on dataset X:**
```
✅ entity_read: 15.2ms (budget: 50ms)
✅ k_hop_2: 132.7ms (budget: 150ms)
✅ degree_centrality: 89.4ms (budget: 150ms)
```

## Common Commands

```bash
# Quick smoke test (2 minutes)
npm run bench:quick

# Full benchmark all sizes (15 minutes)
npm run bench:full

# CI mode with budget checking
npm run bench:ci

# Custom run
node runner/index.js --size medium --scenarios all --iterations 100
```

## Reading Results

**Markdown report:** `reports/report.md` - Easy to share
**HTML report:** `reports/report.html` - Interactive, visual
**Raw JSON:** `reports/latest.json` - For automation

## Performance Budgets

Located in `config/budgets.json`:

- **Critical queries** (❌ fails CI): k-hop 2, shortest path, degree centrality
- **Warning queries** (⚠️ logs only): k-hop 3, betweenness, communities

## CI Integration

Runs automatically on PRs touching:
- GraphRAG/Analytics services
- Entity/Relationship repositories
- Neo4j driver code
- Benchmark files themselves

**Manual trigger:**
```bash
gh workflow run graph-benchmark.yml -f size=medium -f scenarios=ci
```

## Troubleshooting

**"Connection refused"**
```bash
docker compose -f docker-compose.neo4j.yml up -d
```

**"Benchmarks too slow"**
```bash
npm run bench:quick  # Uses small dataset
```

**"Budget failures"**
Check `reports/report.html` → identify slow query → optimize or update budget

## Next Steps

- [Full Documentation](./README.md)
- [Query Optimization Tips](./README.md#query-optimization-tips)
- [Adding Custom Scenarios](./README.md#custom-scenarios)
