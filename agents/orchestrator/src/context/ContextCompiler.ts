import { v4 as uuid } from "uuid";
import { LLMRequest, LLMMessage } from "../../types/index.js";
import {
  ContextCompiler as IContextCompiler,
  Session,
  CompilationOptions,
  ContextProcessor,
  WorkingContext,
} from "./types.js";

/**
 * ContextCompiler
 *
 * The core engine that transforms a Session into an LLMRequest.
 * Runs a configured pipeline of processors.
 */
export class ContextCompiler implements IContextCompiler {
  private processors: ContextProcessor[] = [];

  constructor(processors: ContextProcessor[]) {
    this.processors = processors;
  }

  async compile(session: Session, options: CompilationOptions): Promise<LLMRequest> {
    // 1. Initialize empty Working Context
    let context: WorkingContext = {
      id: uuid(),
      instructions: [],
      history: [],
      artifacts: [],
      memories: [],
    };

    // 2. Run Processors Pipeline
    for (const processor of this.processors) {
      context = await processor.process(context, session, options);
    }

    // 3. Assemble Final LLMRequest (The "View")
    return this.assembleRequest(context, options);
  }

  private assembleRequest(context: WorkingContext, options: CompilationOptions): LLMRequest {
    const messages: LLMMessage[] = [];

    // A. Stable Prefix (System Instructions)
    if (context.instructions.length > 0) {
      messages.push({
        role: "system",
        content: context.instructions.join("\n\n"),
      });
    }

    // B. Memory Injection (if any)
    // Often injected as a system message or a user context block
    if (context.memories.length > 0) {
      const memoryBlock = context.memories
        .map((m) => `[Memory ID: ${m.id}] ${m.content}`)
        .join("\n");

      messages.push({
        role: "system",
        content: `Relevant Knowledge:\n${memoryBlock}`,
      });
    }

    // C. Artifacts (if loaded)
    if (context.artifacts.length > 0) {
      const artifactBlock = context.artifacts
        .map((a) => `[Artifact: ${a.name} (${a.type})]\n${a.content}`)
        .join("\n---\n");

      messages.push({
        role: "system",
        content: `Loaded Artifacts:\n${artifactBlock}`,
      });
    }

    // D. History (Events)
    messages.push(...context.history);

    return {
      messages,
      model: options.model as any,
      maxTokens: options.tokenLimit,
    };
  }
}
