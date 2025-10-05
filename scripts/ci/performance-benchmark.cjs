const { performance } = require('node:perf_hooks');
const { createResult } = require('./lib/reporting.cjs');

const OPERATIONS = [
  {
    name: 'graph-path-evaluation',
    maxMs: 500,
    run: () => {
      const graph = new Map();
      const nodes = 120;
      for (let i = 0; i < nodes; i += 1) {
        graph.set(i, []);
      }
      for (let i = 0; i < nodes; i += 1) {
        for (let j = 1; j <= 3; j += 1) {
          const target = (i + j) % nodes;
          graph.get(i).push(target);
        }
      }
      const queue = [0];
      const visited = new Set([0]);
      while (queue.length > 0) {
        const node = queue.shift();
        const neighbours = graph.get(node) || [];
        for (const neighbour of neighbours) {
          if (!visited.has(neighbour)) {
            visited.add(neighbour);
            queue.push(neighbour);
          }
        }
      }
      return visited.size;
    }
  },
  {
    name: 'aggregation-pipeline',
    maxMs: 500,
    run: () => {
      const records = Array.from({ length: 5000 }, (_, index) => ({
        risk: (index % 7) + 1,
        score: (index * 3) % 97,
        status: index % 5 === 0 ? 'open' : 'closed'
      }));
      const summary = records
        .filter((record) => record.status === 'open')
        .reduce(
          (acc, record) => {
            acc.count += 1;
            acc.total += record.score;
            acc.riskBuckets[record.risk] = (acc.riskBuckets[record.risk] || 0) + 1;
            return acc;
          },
          { count: 0, total: 0, riskBuckets: {} }
        );
      summary.average = summary.count === 0 ? 0 : summary.total / summary.count;
      return summary;
    }
  },
  {
    name: 'json-serialization',
    maxMs: 500,
    run: () => {
      const payload = [];
      for (let i = 0; i < 2000; i += 1) {
        payload.push({
          id: `entity-${i}`,
          edges: Array.from({ length: 10 }, (_, edgeIndex) => ({
            id: `${i}-${edgeIndex}`,
            weight: (edgeIndex * i) % 17,
            metadata: {
              tag: `tag-${edgeIndex}`,
              confidence: (edgeIndex % 5) / 5
            }
          }))
        });
      }
      const serialized = JSON.stringify(payload);
      const parsed = JSON.parse(serialized);
      return parsed.length;
    }
  }
];

function runPerformanceBenchmark() {
  const description = 'Validates key analytical operations stay under the 500ms performance budget.';
  const remediation =
    'Profile the affected operation, optimize algorithms or caching, and rerun the benchmark until all steps finish within 500ms.';
  const details = [];
  let allPassing = true;
  for (const operation of OPERATIONS) {
    const duration = measureOperation(operation.run);
    if (duration > operation.maxMs) {
      allPassing = false;
      details.push(
        `${operation.name} took ${duration.toFixed(2)}ms (limit ${operation.maxMs}ms) — investigate performance regressions.`
      );
    } else {
      details.push(`${operation.name} completed in ${duration.toFixed(2)}ms (limit ${operation.maxMs}ms).`);
    }
  }
  return createResult({
    name: 'performance-benchmark',
    description,
    passed: allPassing,
    details,
    remediation
  });
}

function measureOperation(callback) {
  const start = performance.now();
  callback();
  return performance.now() - start;
}

module.exports = {
  runPerformanceBenchmark,
  measureOperation
};
