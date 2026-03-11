import { LLM } from './llm';
import { MemoryStore } from '../memory/store';
import { StrategyEngine } from './strategy-engine';

export type AgentAction =
  | { type: 'search_tools'; query: string }
  | { type: 'call_tool'; toolId: string; name: string; params: Record<string, any> }
  | { type: 'fold_memory'; reason: string }
  | { type: 'finish'; answer: string; evidence: string[] };

export class Planner {
  private memoryStore: MemoryStore;
  private strategyEngine: StrategyEngine;

  constructor(
    private tenantId: string,
    private runId: string,
    private task: string,
    private goalHints: string[],
    private llm: LLM
  ) {
    this.memoryStore = new MemoryStore();
    this.strategyEngine = new StrategyEngine();
  }

  public async decide(): Promise<AgentAction> {
    const workingMemory = await this.memoryStore.getWorkingMemory(this.tenantId, this.runId);
    const lastEvents = await this.memoryStore.getEpisodicMemory(this.tenantId, this.runId);
    const strategy = this.strategyEngine.assess(this.task, this.goalHints, lastEvents);

    // In a real implementation, the prompt would be constructed from the task, memory, and available tools.
    const prompt = `
      PREVIOUS_SUMMARY:
      ${workingMemory?.summary || 'Nothing yet.'}

      RECENT_EVENTS:
      ${lastEvents.map(e => JSON.stringify(e.event_json)).join('\n') || 'No events yet.'}

      STRATEGY_RECOMMENDATION:
      ${JSON.stringify(strategy.recommended)}

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
      console.error('Failed to parse LLM response:', response);
      if (strategy.recommended.nextAction === 'search_tools') {
        return {
          type: 'search_tools',
          query: [this.task, ...this.goalHints].filter(Boolean).join(' ').trim(),
        };
      }

      if (strategy.recommended.nextAction === 'fold_memory') {
        return { type: 'fold_memory', reason: strategy.recommended.rationale };
      }

      return {
        type: 'finish',
        answer: 'Execution completed with governed fallback planning.',
        evidence: [strategy.recommended.rationale],
      };
    }
  }
}
