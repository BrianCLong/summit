import { Judge, JudgeResult } from '../types';
import { SemanticStore } from '../memalign/semantic_store';
import { EpisodicStore } from '../memalign/episodic_store';
import { retrieveContext, formatContext } from '../memalign/retrieve';

export class MemAlignJudgeWrapper implements Judge {
  private baseJudge: Judge;
  private semanticStore: SemanticStore;
  private episodicStore: EpisodicStore;
  name: string;

  constructor(
    baseJudge: Judge,
    semanticStore: SemanticStore,
    episodicStore: EpisodicStore
  ) {
    this.baseJudge = baseJudge;
    this.name = `memalign-${baseJudge.name}`;
    this.semanticStore = semanticStore;
    this.episodicStore = episodicStore;
  }

  async evaluate(input: string, context?: any): Promise<JudgeResult> {
    // 1. Retrieve memory
    const retrieved = await retrieveContext(input, this.semanticStore, this.episodicStore);

    // 2. Format context
    const memoryContext = formatContext(retrieved);

    // 3. Inject into base judge context
    // This assumes the base judge knows how to handle 'additional_context' or we prompt inject here.
    // For this wrapper, we'll append it to the input if the judge is simple, or pass in context.

    // We'll pass it in the result's context for visibility, and try to pass to judge.
    // If the base judge takes a simple string, we might need to modify the prompt.
    // Here we assume we can pass it via the context object.

    const augmentedContext = {
      ...(context || {}),
      memalign: memoryContext
    };

    // Also prompt injection simulation:
    const augmentedInput = `${input}\n\n${memoryContext.join('\n')}`;

    const result = await this.baseJudge.evaluate(augmentedInput, augmentedContext);

    return {
      ...result,
      context: memoryContext, // Expose what was retrieved
      metadata: {
        ...result.metadata,
        memalign_retrieval_count: retrieved.rules.length + retrieved.examples.length
      }
    };
  }
}
