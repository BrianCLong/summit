"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
const store_1 = require("../memory/store");
class Planner {
    tenantId;
    runId;
    llm;
    memoryStore;
    constructor(tenantId, runId, llm) {
        this.tenantId = tenantId;
        this.runId = runId;
        this.llm = llm;
        this.memoryStore = new store_1.MemoryStore();
    }
    async decide() {
        const workingMemory = await this.memoryStore.getWorkingMemory(this.tenantId, this.runId);
        const lastEvents = await this.memoryStore.getEpisodicMemory(this.tenantId, this.runId);
        // In a real implementation, the prompt would be constructed from the task, memory, and available tools.
        const prompt = `
      PREVIOUS_SUMMARY:
      ${workingMemory?.summary || 'Nothing yet.'}

      RECENT_EVENTS:
      ${lastEvents.map(e => JSON.stringify(e.event_json)).join('\n') || 'No events yet.'}

      What is the next step?
    `;
        const response = await this.llm.generate({
            system: 'You are a helpful assistant that decides the next action for an autonomous agent.',
            prompt: prompt,
        });
        try {
            const action = JSON.parse(response);
            return action;
        }
        catch (e) {
            console.error("Failed to parse LLM response:", response);
            // Fallback to a finish action in case of a parsing error.
            return { type: 'finish', answer: 'I seem to have run into an unexpected error.', evidence: [] };
        }
    }
}
exports.Planner = Planner;
