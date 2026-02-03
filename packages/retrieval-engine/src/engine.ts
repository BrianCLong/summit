import { RetrievalPlan, RetrievalResult, RetrievalBackend } from './types.js';
import { canonicalize, sha256 } from './util/canonical.js';
import { emitEvidence } from './evidence/emitter.js';

export class RetrievalEngine {
  async compile(intent: string, options: { topK?: number; backend?: RetrievalBackend } = {}): Promise<RetrievalPlan> {
    const plan: RetrievalPlan = {
      query: { text: intent },
      topK: options.topK || 5,
      backend: options.backend || 'local_stub'
    };
    return plan;
  }

  async executeLocalStub(plan: RetrievalPlan): Promise<RetrievalResult> {
    const planJson = canonicalize(plan);
    const planHash = sha256(planJson);

    // Deterministic stub results based on input hash
    const contexts = [
      {
        chunkId: `chunk_${planHash.substring(0, 8)}_1`,
        score: 0.95,
        uri: "doc:stub/1",
        textHash: sha256("stub content 1"),
        content: "This is stub content 1 for " + plan.query.text
      },
      {
        chunkId: `chunk_${planHash.substring(0, 8)}_2`,
        score: 0.88,
        uri: "doc:stub/2",
        textHash: sha256("stub content 2"),
        content: "This is stub content 2"
      }
    ];

    const result: RetrievalResult = {
      contexts,
      graph: { entities: 5, relations: 10, hops: 2 },
      evidenceBundleRef: `retrieval_${planHash}` // Placeholder ref
    };

    // Emit evidence side-effect
    // In a real system, we might fetch the actual policy object. Here we use a stub.
    const policyStub = { version: 1, gates: { execution: { allowed: true } } };
    await emitEvidence(plan, result, policyStub, []);

    return result;
  }
}
