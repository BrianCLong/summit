"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryProcessor = void 0;
/**
 * MemoryProcessor
 *
 * Injects semantic memory search results (Reactive/Proactive).
 */
class MemoryProcessor {
    name = 'MemoryProcessor';
    async process(context, session, options) {
        // Check if session has pro-active memory hits in metadata
        if (session.metadata?.relevantMemories) {
            const memories = session.metadata.relevantMemories;
            context.memories.push(...memories);
        }
        return context;
    }
}
exports.MemoryProcessor = MemoryProcessor;
