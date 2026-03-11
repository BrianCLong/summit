# Summit Performance Benchmarks

This directory contains standalone benchmark scripts designed to measure end-to-end performance of Summit's GraphRAG pipeline and other critical systems. These tools run independently of the main application server, focusing on measuring raw pipeline performance under various load conditions.

## GraphRAG Performance Benchmark (`graphrag-perf.ts`)

Measures the core execution performance of the GraphRAG pipeline using simulated, mocked services to focus strictly on throughput, latency, and system capability without external network bottlenecks.

### What it Measures
- **Single Query Latency**: p50, p95, p99 latency in milliseconds for executing a single simple query.
- **Concurrent Throughput**: Queries per second (QPS) and latencies at varying concurrency levels (10, 50, 100 concurrent queries).
- **Memory Traversal**: Simulated memory usage (in MB) used by the system during complex graph traversals.
- **Query Complexity Execution**: Latencies segmented by query complexity (`simple`, `multi-hop`, `deep-chain`).
- **Ingestion Throughput**: Number of documents processed per second during data ingestion.

### Running the Benchmark

You can run the benchmark script directly with `node` or `tsx` from the project root. Since it is written in TypeScript and does not rely heavily on external imports, Node's built-in execution or `tsx` works flawlessly.

```bash
# Using Node with built-in TS support (Node 22+)
node scripts/benchmarks/graphrag-perf.ts

# Or using tsx (if installed)
npx tsx scripts/benchmarks/graphrag-perf.ts
```

### Outputs

The benchmark outputs live statistics to `stdout` during execution and finalizes by writing reports to the following files in the `scripts/benchmarks/` directory:

1. `performance_report.json`: A structured JSON file containing exact numerical metrics across all tested scenarios.
2. `performance_report.csv`: A flattened CSV format, ideal for importing into spreadsheets or trend analysis tools.

## Guidelines and Boundaries
- These scripts must **not** modify production source code or depend on live production databases.
- They are designed to be run in isolated CI steps or local developer environments.
- Workflows triggering these tests should only invoke the CLI interface and capture the resulting output files for historical trend comparisons.
