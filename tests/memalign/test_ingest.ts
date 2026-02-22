import { ingestFeedback } from '../../src/evals/memalign/ingest';
import { distillMemories } from '../../src/evals/memalign/distill';
import { SemanticStore } from '../../src/evals/memalign/semantic_store';
import { EpisodicStore } from '../../src/evals/memalign/episodic_store';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testIngestAndDistill() {
  const epiPath = path.join(__dirname, 'test_ingest_episodic.json');
  const semPath = path.join(__dirname, 'test_ingest_semantic.json');
  if (fs.existsSync(epiPath)) fs.unlinkSync(epiPath);
  if (fs.existsSync(semPath)) fs.unlinkSync(semPath);

  const epiStore = new EpisodicStore(epiPath);
  const semStore = new SemanticStore(semPath);

  const fixturePath = path.join(__dirname, '../../fixtures/memalign/feedback/sample.jsonl');

  // Test Ingest
  const ingestedCount = await ingestFeedback(fixturePath, epiStore, 'politeness');
  if (ingestedCount !== 2) {
    throw new Error(`Expected 2 ingested items, got ${ingestedCount}`);
  }

  const episodes = await epiStore.list();
  if (episodes.length !== 2) {
     throw new Error(`Expected 2 episodes in store, got ${episodes.length}`);
  }

  // Test Distill
  const distilledCount = await distillMemories(epiStore, semStore, 'politeness');
  if (distilledCount !== 2) { // 2 unique rationales
    throw new Error(`Expected 2 distilled rules, got ${distilledCount}`);
  }

  const rules = await semStore.list();
  const ruleContent = rules.map(r => r.content);
  if (!ruleContent.some(c => c.includes('Avoid demanding language'))) {
    throw new Error('Failed to distill demanding language rule');
  }

  // Cleanup
  if (fs.existsSync(epiPath)) fs.unlinkSync(epiPath);
  if (fs.existsSync(semPath)) fs.unlinkSync(semPath);
  console.log('Ingest and Distill test passed');
}

testIngestAndDistill().catch(e => {
  console.error(e);
  process.exit(1);
});
