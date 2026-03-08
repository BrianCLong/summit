"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCompiler = void 0;
const uuid_1 = require("uuid");
/**
 * ContextCompiler
 *
 * The core engine that transforms a Session into an LLMRequest.
 * Runs a configured pipeline of processors.
 */
class ContextCompiler {
    processors = [];
    constructor(processors) {
        this.processors = processors;
    }
    async compile(session, options) {
        // 1. Initialize empty Working Context
        let context = {
            id: (0, uuid_1.v4)(),
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
    assembleRequest(context, options) {
        const messages = [];
        // A. Stable Prefix (System Instructions)
        if (context.instructions.length > 0) {
            messages.push({
                role: 'system',
                content: context.instructions.join('\n\n'),
            });
        }
        // B. Memory Injection (if any)
        // Often injected as a system message or a user context block
        if (context.memories.length > 0) {
            const memoryBlock = context.memories
                .map(m => `[Memory ID: ${m.id}] ${m.content}`)
                .join('\n');
            messages.push({
                role: 'system',
                content: `Relevant Knowledge:\n${memoryBlock}`,
            });
        }
        // C. Artifacts (if loaded)
        if (context.artifacts.length > 0) {
            const artifactBlock = context.artifacts
                .map(a => `[Artifact: ${a.name} (${a.type})]\n${a.content}`)
                .join('\n---\n');
            messages.push({
                role: 'system',
                content: `Loaded Artifacts:\n${artifactBlock}`
            });
        }
        // D. History (Events)
        messages.push(...context.history);
        return {
            messages,
            model: options.model,
            maxTokens: options.tokenLimit,
        };
    }
}
exports.ContextCompiler = ContextCompiler;
