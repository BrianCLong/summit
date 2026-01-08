import { ContextProcessor, Session, WorkingContext, CompilationOptions } from "../types.js";

/**
 * InstructionProcessor
 *
 * Injects system instructions into the Working Context.
 * Ensures stable prefix for context caching.
 */
export class InstructionProcessor implements ContextProcessor {
  name = "InstructionProcessor";

  constructor(private readonly instructions: string[]) {}

  async process(
    context: WorkingContext,
    session: Session,
    options: CompilationOptions
  ): Promise<WorkingContext> {
    // Append configured instructions to the context
    context.instructions.push(...this.instructions);

    // Add any session-specific override instructions if present
    if (session.metadata?.systemInstructions) {
      context.instructions.push(session.metadata.systemInstructions as string);
    }

    return context;
  }
}
