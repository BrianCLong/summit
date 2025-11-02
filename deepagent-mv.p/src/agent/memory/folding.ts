import { MemoryStore } from './store';
import { LLM } from '../reasoning/llm';

export class MemoryFolding {
  private memoryStore: MemoryStore;

  constructor(private tenantId: string, private llm: LLM) {
    this.memoryStore = new MemoryStore();
  }

  public async fold(runId: string): Promise<void> {
    const episodicMemories = await this.memoryStore.getEpisodicMemory(this.tenantId, runId);

    // In a real implementation, this would use an LLM to generate a summary.
    const summary = await this.llm.generate({
      system: 'You are a summarization assistant.',
      prompt: `Summarize the following events:\n${episodicMemories.map(e => JSON.stringify(e.event_json)).join('\n')}`,
    });

    const key_facts = {
      events_processed: episodicMemories.length,
    };

    await this.memoryStore.updateWorkingMemory(this.tenantId, {
      run_id: runId,
      tenant_id: this.tenantId,
      summary,
      key_facts,
      ts: new Date(),
    });

    // A real implementation would prune the episodic memory here to save space.
  }
}
