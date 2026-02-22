import { SemanticStore } from '../../src/evals/memalign/semantic_store';
import { EpisodicStore } from '../../src/evals/memalign/episodic_store';
import { SemanticRule, EpisodicExample } from '../../src/evals/memalign/memory_types';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSemanticStore() {
  const testPath = path.join(__dirname, 'test_semantic.json');
  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);

  const store = new SemanticStore(testPath);
  const rule: SemanticRule = {
    id: 'test-rule-1',
    content: 'Be polite',
    rule_type: 'guideline',
    metadata: { tags: ['politeness'] }
  };

  await store.add(rule);
  const retrieved = await store.retrieve({ query: 'polite' });

  if (retrieved.length !== 1 || retrieved[0].id !== 'test-rule-1') {
    throw new Error('Semantic retrieve failed');
  }

  await store.delete('test-rule-1');
  const empty = await store.retrieve({ query: 'polite' });
  if (empty.length !== 0) {
    throw new Error('Semantic delete failed');
  }

  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  console.log('SemanticStore test passed');
}

async function testEpisodicStore() {
  const testPath = path.join(__dirname, 'test_episodic.json');
  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);

  const store = new EpisodicStore(testPath);
  const example: EpisodicExample = {
    id: 'ex-1',
    content: 'Example interaction',
    input: 'Hello',
    output: 'Hi there',
    label: 'positive',
    rationale: 'Friendly greeting',
    metadata: {}
  };

  await store.add(example);
  const retrieved = await store.retrieve({ query: 'Hello' });

  if (retrieved.length !== 1 || retrieved[0].id !== 'ex-1') {
    throw new Error('Episodic retrieve failed');
  }

  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  console.log('EpisodicStore test passed');
}

async function run() {
  try {
    await testSemanticStore();
    await testEpisodicStore();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
