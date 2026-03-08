"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstructionProcessor = void 0;
/**
 * InstructionProcessor
 *
 * Injects system instructions into the Working Context.
 * Ensures stable prefix for context caching.
 */
class InstructionProcessor {
    instructions;
    name = 'InstructionProcessor';
    constructor(instructions) {
        this.instructions = instructions;
    }
    async process(context, session, options) {
        // Append configured instructions to the context
        context.instructions.push(...this.instructions);
        // Add any session-specific override instructions if present
        if (session.metadata?.systemInstructions) {
            context.instructions.push(session.metadata.systemInstructions);
        }
        return context;
    }
}
exports.InstructionProcessor = InstructionProcessor;
