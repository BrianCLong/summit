"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryProcessor = void 0;
/**
 * HistoryProcessor
 *
 * Selects and transforms Session Events into LLMMessage history.
 * Handles compaction, filtering, and role mapping.
 */
class HistoryProcessor {
    name = 'HistoryProcessor';
    async process(context, session, options) {
        const limit = options.maxHistoryMessages ?? 50;
        // Select relevant events (messages, tool calls)
        // Filter out internal control events unless debug mode
        const relevantEvents = session.events.filter(e => ['message', 'tool_call', 'tool_result'].includes(e.type));
        // Apply sliding window (take last N)
        const selectedEvents = relevantEvents.slice(-limit);
        // Transform to LLMMessage
        const messages = selectedEvents.map(event => this.transformEventToMessage(event));
        context.history.push(...messages);
        return context;
    }
    transformEventToMessage(event) {
        // Basic mapping, can be enhanced for specific models
        return {
            role: event.role,
            content: event.content,
            // Restore tool calls if stored in metadata
            ...(event.metadata?.toolCalls ? { toolCalls: event.metadata.toolCalls } : {}),
            ...(event.metadata?.toolCallId ? { toolCallId: event.metadata.toolCallId } : {}),
            ...(event.metadata?.name ? { name: event.metadata.name } : {}),
        };
    }
}
exports.HistoryProcessor = HistoryProcessor;
