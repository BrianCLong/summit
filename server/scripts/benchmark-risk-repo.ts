import { RiskRepository } from '../src/db/repositories/RiskRepository.js';
import { pg } from '../src/db/pg.js';

async function runBenchmark() {
  const signalCount = 250;
  const signals = Array.from({ length: signalCount }, (_, i) => ({
    type: `type_${i}`,
    source: 'source',
    value: i,
    weight: 0.1,
    contributionScore: i * 0.1,
    description: `desc_${i}`,
    detectedAt: new Date()
  }));

  const input = {
    tenantId: 't1',
    entityId: 'e1',
    entityType: 'Person',
    score: 0.8,
    level: 'high' as any,
    window: '24h' as any,
    modelVersion: '1.0',
    rationale: 'test',
    signals
  };

  const repo = new RiskRepository();

  const LATENCY_MS = 5;
  let queryCount = 0;

  // Mock pg.transaction and tx.query
  (pg as any).transaction = async (cb: any) => {
    const tx = {
      query: async (sql: string, params: any[]) => {
        queryCount++;
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, LATENCY_MS));

        // Return mock rows
        if (sql.includes('INSERT INTO risk_scores')) {
            return [{ id: 'score-id' }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
            // Return dummy rows for the batch/individual insert
            // Extract number of value sets to return correct number of rows
            // e.g. VALUES ($1...), ($9...)
            const placeholdersMatch = sql.match(/\(\$\d+[^)]*\)/g);
            const count = placeholdersMatch ? placeholdersMatch.length : 1;

            return Array.from({ length: count }, (_, i) => ({
                id: `sig-${i}`,
                risk_score_id: 'score-id',
                type: 'type',
                source: 'source',
                value: '0',
                weight: '0',
                contribution_score: '0',
                description: 'desc',
                detected_at: new Date()
            }));
        }
        return [];
      }
    };
    return await cb(tx);
  };

  console.log(`⚡ Bolt Benchmark: Saving risk score with ${signalCount} signals`);
  console.log(`Simulated Latency: ${LATENCY_MS}ms per DB round-trip`);

  const start = Date.now();
  await repo.saveRiskScore(input);
  const end = Date.now();

  const duration = end - start;
  console.log(`\nResults:`);
  console.log(`- Total Time: ${duration}ms`);
  console.log(`- Total DB Queries: ${queryCount}`);

  const expectedOldQueries = 1 + signalCount; // 1 for score + N for signals
  const expectedOldTime = expectedOldQueries * LATENCY_MS;
  const expectedNewQueries = 1 + Math.ceil(signalCount / 100); // 1 for score + ceil(N/100) for signals

  console.log(`\nComparison:`);
  console.log(`- Old Approach (estimated): ~${expectedOldTime}ms (${expectedOldQueries} queries)`);
  console.log(`- New Approach (measured): ${duration}ms (${queryCount} queries)`);
  const improvement = ((expectedOldTime - duration) / expectedOldTime * 100).toFixed(1);
  console.log(`- Speedup: ~${improvement}% faster`);
}

runBenchmark().catch(console.error);
