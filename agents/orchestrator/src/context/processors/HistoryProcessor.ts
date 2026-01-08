import { ContextProcessor, Session, WorkingContext, CompilationOptions, Event } from "../types.js";
import { LLMMessage } from "../../types/index.js";

/**
 * HistoryProcessor
 *
 * Selects and transforms Session Events into LLMMessage history.
 * Handles compaction, filtering, and role mapping.
 */
export class HistoryProcessor implements ContextProcessor {
  name = "HistoryProcessor";

  async process(
    context: WorkingContext,
    session: Session,
    options: CompilationOptions
  ): Promise<WorkingContext> {
    const limit = options.maxHistoryMessages ?? 50;

    // Select relevant events (messages, tool calls)
    // Filter out internal control events unless debug mode
    const relevantEvents = session.events.filter((e) =>
      ["message", "tool_call", "tool_result"].includes(e.type)
    );

    // Apply sliding window (take last N)
    const selectedEvents = relevantEvents.slice(-limit);

    // Transform to LLMMessage
    const messages: LLMMessage[] = selectedEvents.map((event) =>
      this.transformEventToMessage(event)
    );

    context.history.push(...messages);

    return context;
  }

  private transformEventToMessage(event: Event): LLMMessage {
    // Basic mapping, can be enhanced for specific models
    return {
      role: event.role,
      content: event.content,
      // Restore tool calls if stored in metadata
      ...(event.metadata?.toolCalls ? { toolCalls: event.metadata.toolCalls as any } : {}),
      ...(event.metadata?.toolCallId ? { toolCallId: event.metadata.toolCallId as string } : {}),
      ...(event.metadata?.name ? { name: event.metadata.name as string } : {}),
    };
  }
}
