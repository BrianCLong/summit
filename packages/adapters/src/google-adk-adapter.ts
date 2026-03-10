import { BaseAdapter } from './base-adapter.js';
import { AgentResult, AgentTask } from './types.js';

export class GoogleADKAdapter extends BaseAdapter {
  name = 'google-adk';
  private endpoint: string;

  constructor() {
    super();
    this.endpoint = process.env.GOOGLE_ADK_ENDPOINT || 'http://localhost:8080/adk';
  }

  async invoke(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    return this.withRetry(async () => {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
        signal: task.timeoutMs ? AbortSignal.timeout(task.timeoutMs) : undefined,
      });

      if (!response.ok) {
        throw new Error(`ADK responded with status: ${response.status}`);
      }

    const data = (await response.json()) as { output: string; tokensUsed?: number };
      return {
        taskId: task.taskId,
        output: data.output,
        tokensUsed: data.tokensUsed,
        durationMs: Date.now() - startTime,
      };
    });
  }
}
