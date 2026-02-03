import { emitEvidence } from '../evidence/emitter.js';
import { RetrievalPlan, RetrievalResult } from '../types.js';

const mockPlan: RetrievalPlan = {
  query: { text: "test query" },
  topK: 5,
  backend: "local_stub"
};

const mockResult: RetrievalResult = {
  contexts: [],
  graph: { entities: 0, relations: 0, hops: 0 },
  evidenceBundleRef: "ref-123"
};

const mockPolicy = { version: 1, gates: {} };

async function run() {
  try {
    const dir = await emitEvidence(mockPlan, mockResult, mockPolicy, []);
    console.log(`Evidence emitted to: ${dir}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
