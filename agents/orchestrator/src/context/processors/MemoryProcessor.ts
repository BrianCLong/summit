import { ContextProcessor, Session, WorkingContext, CompilationOptions } from "../types.js";

/**
 * MemoryProcessor
 *
 * Injects semantic memory search results (Reactive/Proactive).
 */
export class MemoryProcessor implements ContextProcessor {
  name = "MemoryProcessor";

  async process(
    context: WorkingContext,
    session: Session,
    options: CompilationOptions
  ): Promise<WorkingContext> {
    // Check if session has pro-active memory hits in metadata
    if (session.metadata?.relevantMemories) {
      const memories = session.metadata.relevantMemories as any[];
      context.memories.push(...memories);
    }
    return context;
  }
}
