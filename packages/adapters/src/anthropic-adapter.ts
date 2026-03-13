import Anthropic from '@anthropic-ai/sdk';
import { BaseAdapter } from './base-adapter.js';
import { AgentResult, AgentTask } from './types.js';

export class AnthropicAdapter extends BaseAdapter {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string, private model: string = 'claude-opus-4-5') {
    super();
    this.client = new Anthropic({
      apiKey,
      fetch: global.fetch
    });
  }

  async invoke(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    return this.withRetry(async () => {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: task.instruction }],
      });

      return {
        taskId: task.taskId,
        output: message.content[0].type === 'text' ? message.content[0].text : '',
        tokensUsed: message.usage.total_tokens,
        durationMs: Date.now() - startTime,
      };
    });
  }
}
