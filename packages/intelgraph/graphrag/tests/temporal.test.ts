import { TimeScopeResolver } from '../temporal/time_scope_resolver.js';
import { TGRAGScorer } from '../temporal/scoring.js';
import { DynamicSubgraph } from '../temporal/dynamic_subgraph.js';
import { PPR } from '../temporal/ppr.js';
import { TemporalEdge, Chunk } from '../temporal/types.js';

async function runTests() {
  console.log('Running Temporal GraphRAG Unit Tests...');

  // 1. TimeScopeResolver
  const resolver = new TimeScopeResolver();
  const s1 = await resolver.resolve('revenue in 2023');
  if (s1.start.getFullYear() !== 2023) throw new Error('TimeScopeResolver failed on year');
  console.log('✅ TimeScopeResolver: Year parsing passed');

  const s2 = await resolver.resolve('events in Oct 2025');
  if (s2.start.getMonth() !== 9) throw new Error('TimeScopeResolver failed on month');
  console.log('✅ TimeScopeResolver: Month parsing passed');

  const s3 = await resolver.resolve('attacks on 2024-05-20');
  if (!s3.start.toISOString().includes('2024-05-20')) throw new Error('TimeScopeResolver failed on ISO date');
  console.log('✅ TimeScopeResolver: ISO date parsing passed');

  // 2. DynamicSubgraph & PPR
  const edges: TemporalEdge[] = [
    { v1: 'A', v2: 'B', rel: 'KNOWS', timestamp: '2023-01-01T00:00:00Z', chunkIds: ['c1'] },
    { v1: 'B', v2: 'C', rel: 'KNOWS', timestamp: '2024-01-01T00:00:00Z', chunkIds: ['c2'] },
    { v1: 'A', v2: 'C', rel: 'KNOWS', timestamp: '2023-06-01T00:00:00Z', chunkIds: ['c3'] }
  ];
  const scope2023 = { start: new Date('2023-01-01'), end: new Date('2023-12-31') };
  const adj = DynamicSubgraph.build(edges, scope2023);
  if (adj['B'] && adj['B']['C']) throw new Error('DynamicSubgraph failed to filter by time');
  console.log('✅ DynamicSubgraph: Temporal filtering passed');

  const pprScores = PPR.calculate(adj, ['A'], 0.15, 10);
  if (pprScores['A'] <= pprScores['B']) throw new Error('PPR failed: seed node should have highest score');
  console.log('✅ PPR: Salience scoring passed');

  // 3. TGRAGScorer
  const edgeIn = { v1: 'A', v2: 'B', rel: 'R', timestamp: '2023-05-01T00:00:00Z', chunkIds: [] };
  const edgeOut = { v1: 'A', v2: 'B', rel: 'R', timestamp: '2024-05-01T00:00:00Z', chunkIds: [] };
  if (TGRAGScorer.scoreEdge(edgeIn, pprScores, scope2023) === 0) throw new Error('TGRAGScorer failed to score edge in scope');
  if (TGRAGScorer.scoreEdge(edgeOut, pprScores, scope2023) !== 0) throw new Error('TGRAGScorer failed to zero out edge out of scope');
  console.log('✅ TGRAGScorer: Edge scoring passed');

  console.log('\nAll Temporal GraphRAG Unit Tests Passed! 🚀');
}

runTests().catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
