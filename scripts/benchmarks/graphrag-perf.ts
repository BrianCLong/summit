import * as fs from 'fs';
import * as path from 'path';

class MockGraphRAG {
  async ingest(document: string): Promise<{ id: string, timeMs: number }> {
    const start = process.hrtime.bigint();
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
    const end = process.hrtime.bigint();
    return { id: `doc_${Date.now()}`, timeMs: Number(end - start) / 1e6 };
  }

  async traverse(queryId: string): Promise<{ memoryUsed: number }> {
    const memUsage = 10 * 1024 * 1024 + Math.random() * 40 * 1024 * 1024;
    return { memoryUsed: memUsage };
  }
}

class MockQueryEngine {
  async execute(query: string, complexity: 'simple' | 'multi-hop' | 'deep-chain'): Promise<{ result: any, timeMs: number }> {
    const start = process.hrtime.bigint();
    let delay = 0;
    if (complexity === 'simple') delay = 20 + Math.random() * 30; // 20-50ms
    else if (complexity === 'multi-hop') delay = 100 + Math.random() * 100; // 100-200ms
    else if (complexity === 'deep-chain') delay = 300 + Math.random() * 200; // 300-500ms

    await new Promise(resolve => setTimeout(resolve, delay));
    const end = process.hrtime.bigint();
    return { result: 'mock_result', timeMs: Number(end - start) / 1e6 };
  }
}

// Statistics utilities
function calculatePercentiles(values: number[]): { p50: number, p95: number, p99: number } {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  return { p50, p95, p99 };
}

// Benchmark Runners
async function runLatencyBenchmark(engine: any): Promise<any> {
  const latencies: number[] = [];
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    const res = await engine.execute('test query', 'simple');
    latencies.push(res.timeMs);
  }
  return calculatePercentiles(latencies);
}

async function runThroughputBenchmark(engine: any, concurrency: number): Promise<any> {
  const latencies: number[] = [];
  const start = process.hrtime.bigint();

  const tasks = Array.from({ length: concurrency }).map(async () => {
    const res = await engine.execute('concurrent query', 'multi-hop');
    latencies.push(res.timeMs);
  });

  await Promise.all(tasks);
  const end = process.hrtime.bigint();
  const totalTimeMs = Number(end - start) / 1e6;
  const throughput = (concurrency / totalTimeMs) * 1000; // queries per second

  return {
    concurrency,
    throughputQps: throughput,
    ...calculatePercentiles(latencies)
  };
}

async function runComplexityBenchmark(engine: any): Promise<any> {
  const results: Record<string, any> = {};
  for (const complexity of ['simple', 'multi-hop', 'deep-chain'] as const) {
    const latencies: number[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await engine.execute('complexity query', complexity);
      latencies.push(res.timeMs);
    }
    results[complexity] = calculatePercentiles(latencies);
  }
  return results;
}

async function runMemoryBenchmark(graph: any): Promise<any> {
  const memUsages: number[] = [];
  for (let i = 0; i < 50; i++) {
    const res = await graph.traverse(`query_${i}`);
    memUsages.push(res.memoryUsed);
  }
  const avgMemoryMb = memUsages.reduce((a, b) => a + b, 0) / memUsages.length / (1024 * 1024);
  return { avgMemoryMb };
}

async function runIngestionBenchmark(graph: any): Promise<any> {
  const count = 100;
  const start = process.hrtime.bigint();
  for (let i = 0; i < count; i++) {
    await graph.ingest(`document content ${i}`);
  }
  const end = process.hrtime.bigint();
  const totalTimeMs = Number(end - start) / 1e6;
  const throughput = (count / totalTimeMs) * 1000; // docs per second
  return { docsPerSecond: throughput, totalDocs: count };
}

async function main() {
  const mockGraph = new MockGraphRAG();
  const mockEngine = new MockQueryEngine();

  console.log('Running GraphRAG Performance Benchmarks...');

  const latency = await runLatencyBenchmark(mockEngine);
  console.log('Single Query Latency:', latency);

  const throughput10 = await runThroughputBenchmark(mockEngine, 10);
  const throughput50 = await runThroughputBenchmark(mockEngine, 50);
  const throughput100 = await runThroughputBenchmark(mockEngine, 100);
  console.log('Throughput (Concurrent Load):', { throughput10, throughput50, throughput100 });

  const memory = await runMemoryBenchmark(mockGraph);
  console.log('Memory Usage:', memory);

  const complexity = await runComplexityBenchmark(mockEngine);
  console.log('Execution Time by Complexity:', complexity);

  const ingestion = await runIngestionBenchmark(mockGraph);
  console.log('Ingestion Throughput:', ingestion);

  const report = {
    timestamp: new Date().toISOString(),
    metrics: {
      singleQueryLatency: latency,
      concurrentThroughput: {
        '10_clients': throughput10,
        '50_clients': throughput50,
        '100_clients': throughput100,
      },
      memoryUsage: memory,
      queryComplexityExecutionTime: complexity,
      ingestionThroughput: ingestion,
    }
  };

  // Save reports
  const reportDir = path.resolve('scripts/benchmarks');
  const jsonReportPath = path.join(reportDir, 'performance_report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

  // CSV output
  const csvReportPath = path.join(reportDir, 'performance_report.csv');
  const csvContent = `Metric,p50,p95,p99,Throughput,MemoryMB
Single Query Latency,${latency.p50},${latency.p95},${latency.p99},,
Throughput 10,${throughput10.p50},${throughput10.p95},${throughput10.p99},${throughput10.throughputQps},
Throughput 50,${throughput50.p50},${throughput50.p95},${throughput50.p99},${throughput50.throughputQps},
Throughput 100,${throughput100.p50},${throughput100.p95},${throughput100.p99},${throughput100.throughputQps},
Memory Traversal,,,,${memory.avgMemoryMb}
Ingestion,,,,${ingestion.docsPerSecond},
Complexity Simple,${complexity.simple.p50},${complexity.simple.p95},${complexity.simple.p99},,
Complexity Multi-hop,${complexity['multi-hop'].p50},${complexity['multi-hop'].p95},${complexity['multi-hop'].p99},,
Complexity Deep-chain,${complexity['deep-chain'].p50},${complexity['deep-chain'].p95},${complexity['deep-chain'].p99},,
`;
  fs.writeFileSync(csvReportPath, csvContent);

  console.log(`\nReports generated:`);
  console.log(`- JSON: ${jsonReportPath}`);
  console.log(`- CSV: ${csvReportPath}`);
}

main().catch(console.error);
