import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock types
interface LatencyBreakdown {
  retrieval: number;
  reasoning: number;
  synthesis: number;
}

interface MockGraphRAGResponse {
  answer: string;
  latency_ms: LatencyBreakdown;
}

// Simulates the GraphRAG pipeline and measures per-stage latency without hitting real APIs
export class MockQueryEngine {
  async execute(): Promise<number> {
    const t0 = performance.now();
    await new Promise(resolve => setTimeout(resolve, 145 + Math.random() * 10)); // ~150ms
    return performance.now() - t0;
  }
}

export class MockGraphRAG {
  private queryEngine: MockQueryEngine;

  constructor() {
    this.queryEngine = new MockQueryEngine();
  }

  async answer(query: string): Promise<MockGraphRAGResponse> {
    // Retrieval stage
    const retrievalTime = await this.queryEngine.execute();

    // Reasoning stage
    const t1 = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 395 + Math.random() * 10)); // ~400ms
    const reasoningTime = performance.now() - t1;

    // Synthesis stage
    const t2 = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 195 + Math.random() * 10)); // ~200ms
    const synthesisTime = performance.now() - t2;

    return {
      answer: `Mock answer for: ${query}`,
      latency_ms: {
        retrieval: retrievalTime,
        reasoning: reasoningTime,
        synthesis: synthesisTime,
      },
    };
  }
}

interface BaselineConfig {
  queries: string[];
  baseline_ms: LatencyBreakdown;
}

test('Latency Regression Detection Harness', async (t) => {
  // 1. Read the baseline JSON
  const baselinePath = path.resolve(__dirname, '../fixtures/latency/baseline.json');
  const baselineRaw = fs.readFileSync(baselinePath, 'utf-8');
  const baselineConfig: BaselineConfig = JSON.parse(baselineRaw);

  const { queries, baseline_ms } = baselineConfig;

  // Simulate current pipeline with slight, realistic jitter (using base baseline)
  const currentPipeline = new MockGraphRAG();

  const recordedLatencies: LatencyBreakdown[] = [];

  // 2. Iterate over benchmark queries and record timings
  for (const query of queries) {
    const res = await currentPipeline.answer(query);
    recordedLatencies.push(res.latency_ms);
  }

  // Calculate averages
  const numQueries = queries.length;
  const avgLatencies: LatencyBreakdown = {
    retrieval: recordedLatencies.reduce((acc, l) => acc + l.retrieval, 0) / numQueries,
    reasoning: recordedLatencies.reduce((acc, l) => acc + l.reasoning, 0) / numQueries,
    synthesis: recordedLatencies.reduce((acc, l) => acc + l.synthesis, 0) / numQueries,
  };

  // 3. Compare with a 10% threshold
  const THRESHOLD = process.env.LATENCY_THRESHOLD ? parseFloat(process.env.LATENCY_THRESHOLD) : 1.10;

  const results = {
    retrieval: {
      baseline: baseline_ms.retrieval,
      average: avgLatencies.retrieval,
      status: avgLatencies.retrieval > baseline_ms.retrieval * THRESHOLD ? 'fail' : 'pass',
      ratio: avgLatencies.retrieval / baseline_ms.retrieval,
    },
    reasoning: {
      baseline: baseline_ms.reasoning,
      average: avgLatencies.reasoning,
      status: avgLatencies.reasoning > baseline_ms.reasoning * THRESHOLD ? 'fail' : 'pass',
      ratio: avgLatencies.reasoning / baseline_ms.reasoning,
    },
    synthesis: {
      baseline: baseline_ms.synthesis,
      average: avgLatencies.synthesis,
      status: avgLatencies.synthesis > baseline_ms.synthesis * THRESHOLD ? 'fail' : 'pass',
      ratio: avgLatencies.synthesis / baseline_ms.synthesis,
    },
  };

  const report = {
    timestamp: new Date().toISOString(),
    num_queries: numQueries,
    threshold: THRESHOLD,
    status: (results.retrieval.status === 'pass' && results.reasoning.status === 'pass' && results.synthesis.status === 'pass') ? 'pass' : 'fail',
    stages: results
  };

  // 4. Generate latency_report.json
  const reportPath = path.resolve(__dirname, 'latency_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // 5. Add test assertions
  await t.test('Retrieval Latency Regression', () => {
    assert.strictEqual(results.retrieval.status, 'pass', `Retrieval regressed by >10%. Expected <${baseline_ms.retrieval * THRESHOLD}ms, got ${avgLatencies.retrieval}ms`);
  });

  await t.test('Reasoning Latency Regression', () => {
    assert.strictEqual(results.reasoning.status, 'pass', `Reasoning regressed by >10%. Expected <${baseline_ms.reasoning * THRESHOLD}ms, got ${avgLatencies.reasoning}ms`);
  });

  await t.test('Synthesis Latency Regression', () => {
    assert.strictEqual(results.synthesis.status, 'pass', `Synthesis regressed by >10%. Expected <${baseline_ms.synthesis * THRESHOLD}ms, got ${avgLatencies.synthesis}ms`);
  });
});
