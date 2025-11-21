import { LLM } from './llm';
import { MemoryStore } from '../memory/store';

export type AgentAction =
  | { type: 'search_tools'; query: string }
  | { type: 'call_tool'; toolId: string; name: string; params: Record<string, any> }
  | { type: 'fold_memory'; reason: string }
  | { type: 'finish'; answer: string; evidence: string[] };

export class Planner {
  private memoryStore: MemoryStore;

  constructor(private tenantId: string, private runId: string, private llm: LLM) {
    this.memoryStore = new MemoryStore();
  }

  public async decide(): Promise<AgentAction> {
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
      return action as AgentAction;
    } catch (e) {
      console.error("Failed to parse LLM response:", response);
      // Fallback to a finish action in case of a parsing error.
      return { type: 'finish', answer: 'I seem to have run into an unexpected error.', evidence: [] };
    }
  }
}
