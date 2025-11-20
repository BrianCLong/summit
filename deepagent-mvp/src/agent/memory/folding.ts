import { MemoryStore } from './store';
import { LLM } from '../reasoning/llm';

export class MemoryFolding {
  private memoryStore: MemoryStore;

  constructor(private tenantId: string, private llm: LLM, private purpose: string) {
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

    const retentionTier = this.getRetentionTier(this.purpose);
    await this.memoryStore.updateWorkingMemory(this.tenantId, {
      run_id: runId,
      tenant_id: this.tenantId,
      summary,
      key_facts,
      ts: new Date(),
    }, retentionTier);

    // Prune the episodic memory to save space, keeping the last 5 events.
    await this.memoryStore.pruneEpisodicMemory(this.tenantId, runId, 5);
  }

  private getRetentionTier(purpose: string): string {
    if (purpose === 'pii') {
      return 'short-30d';
    }
    return 'standard-365d';
  }
}
