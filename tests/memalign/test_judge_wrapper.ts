import { MemAlignJudgeWrapper } from '../../src/evals/judges/memalign_wrapper';
import { MockJudge } from '../../src/evals/judges/base_judge';
import { SemanticStore } from '../../src/evals/memalign/semantic_store';
import { EpisodicStore } from '../../src/evals/memalign/episodic_store';
import { SemanticRule } from '../../src/evals/memalign/memory_types';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testJudgeWrapper() {
  const semPath = path.join(__dirname, 'test_wrapper_sem.json');
  const epiPath = path.join(__dirname, 'test_wrapper_epi.json');
  if (fs.existsSync(semPath)) fs.unlinkSync(semPath);
  if (fs.existsSync(epiPath)) fs.unlinkSync(epiPath);

  const semStore = new SemanticStore(semPath);
  const epiStore = new EpisodicStore(epiPath);

  // Add a rule that matches "poem"
  await semStore.add({
    id: 'r1',
    content: 'When writing a poem, be concise',
    rule_type: 'guideline',
    metadata: {}
  });

  const baseJudge = new MockJudge('mock-1');
  const wrapper = new MemAlignJudgeWrapper(baseJudge, semStore, epiStore);

  const result = await wrapper.evaluate('Write a poem');

  if (!result.context || !result.context.some(s => s.includes('When writing a poem'))) {
    console.log('Result context:', result.context);
    throw new Error('Judge wrapper failed to inject semantic memory');
  }

  if (result.metadata?.memalign_retrieval_count !== 1) {
    throw new Error('Incorrect retrieval count in metadata');
  }

  // Cleanup
  if (fs.existsSync(semPath)) fs.unlinkSync(semPath);
  if (fs.existsSync(epiPath)) fs.unlinkSync(epiPath);
  console.log('JudgeWrapper test passed');
}

testJudgeWrapper().catch(e => {
  console.error(e);
  process.exit(1);
});
