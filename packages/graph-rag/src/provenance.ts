import { v4 as uuidv4 } from 'uuid';
import {
  GraphRAGInput,
  RetrievalResult,
  Context,
  GraphRAGOutput,
  GraphRAGProvenance,
  ModelInvocation
} from './types.js';

export class ProvenanceRecorder {
  private runId: string;
  private input: GraphRAGInput | null = null;
  private retrieval: RetrievalResult | null = null;
  private context: Context | null = null;
  private output: GraphRAGOutput | null = null;
  private modelInvocation: ModelInvocation | null = null;

  constructor(runId?: string) {
    this.runId = runId || uuidv4();
  }

  start(input: GraphRAGInput) {
    this.input = input;
  }

  recordRetrieval(retrieval: RetrievalResult) {
    this.retrieval = retrieval;
  }

  recordContext(context: Context) {
    this.context = context;
  }

  recordModelInvocation(invocation: ModelInvocation) {
    this.modelInvocation = invocation;
  }

  recordOutput(output: GraphRAGOutput) {
    this.output = output;
  }

  finalize(): GraphRAGProvenance {
    if (!this.input || !this.retrieval || !this.context || !this.output) {
      throw new Error('Cannot finalize provenance: missing required steps.');
    }

    return {
      run_id: this.runId,
      timestamp: new Date().toISOString(),
      inputs: this.input,
      retrieval: {
        traversal_path: this.retrieval.traversal_path,
        ranked_candidates: this.retrieval.ranked_candidates.map(c => ({
          id: c.id,
          score: c.score,
          source: c.source
        }))
      },
      context: this.context,
      model_invocation: this.modelInvocation || undefined,
      outputs: this.output
    };
  }
}
