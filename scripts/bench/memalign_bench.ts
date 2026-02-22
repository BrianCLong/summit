import { EpisodicStore } from '../../src/evals/memalign/episodic_store';
import { SemanticStore } from '../../src/evals/memalign/semantic_store';
import { retrieveContext } from '../../src/evals/memalign/retrieve';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBench() {
  console.log('Running MemAlign Benchmark...');

  const benchDir = path.join(__dirname, 'bench_data');
  if (!fs.existsSync(benchDir)) fs.mkdirSync(benchDir);

  const semStore = new SemanticStore(path.join(benchDir, 'sem.json'));
  const epiStore = new EpisodicStore(path.join(benchDir, 'epi.json'));

  // Seed data
  for (let i = 0; i < 1000; i++) {
    await semStore.add({
      id: `r${i}`,
      content: `Rule number ${i} about general principles of AI safety and politeness`,
      rule_type: 'guideline',
      metadata: { tags: ['safety', 'politeness'] }
    });
    if (i % 10 === 0) {
      await epiStore.add({
        id: `e${i}`,
        content: `Example content ${i}`,
        input: `Input query ${i}`,
        output: `Output ${i}`,
        label: 1,
        rationale: `Rationale ${i}`,
        metadata: {}
      });
    }
  }

  // Bench Retrieval
  const start = performance.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    await retrieveContext('safety', semStore, epiStore);
  }
  const end = performance.now();

  const avgLatency = (end - start) / iterations;
  console.log(`Avg Retrieval Latency: ${avgLatency.toFixed(2)}ms`);

  // Cleanup
  fs.rmSync(benchDir, { recursive: true, force: true });

  if (avgLatency > 200) {
    console.error('Latency exceeded budget of 200ms');
    process.exit(1);
  }
}

runBench();
