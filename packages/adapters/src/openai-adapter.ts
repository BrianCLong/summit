import OpenAI from 'openai';
import { BaseAdapter } from './base-adapter.js';
import { AgentResult, AgentTask } from './types.js';

export class OpenAIAdapter extends BaseAdapter {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string, private model: string = 'gpt-4o') {
    super();
    this.client = new OpenAI({
      apiKey,
      fetch: global.fetch
    });
  }

  async invoke(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    return this.withRetry(async () => {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: task.instruction }],
      });

      return {
        taskId: task.taskId,
        output: completion.choices[0].message.content || '',
        tokensUsed: completion.usage?.total_tokens,
        durationMs: Date.now() - startTime,
      };
    });
  }
}
