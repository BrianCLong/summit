
import { LlmProvider, ProviderId, ChatCompletionRequest, ChatCompletionResult } from '../types';

export class AnthropicProvider implements LlmProvider {
  id: ProviderId = 'anthropic';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
  }

  supports(model: string): boolean {
    return model.startsWith('claude-');
  }

  async chat(request: ChatCompletionRequest & { model: string }): Promise<ChatCompletionResult> {
    if (!this.apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY');
    }

    const systemMessage = request.messages.find(m => m.role === 'system');

    // Anthropic Block Format mapping
    const messages = request.messages
        .filter(m => m.role !== 'system')
        .map(m => {
            if (m.role === 'tool') {
                return {
                    role: 'user',
                    content: [
                        {
                            type: 'tool_result',
                            tool_use_id: m.toolCallId,
                            content: m.content
                        }
                    ]
                };
            }
            if (m.role === 'assistant') {
                const content: any[] = [];
                if (m.content) {
                    content.push({ type: 'text', text: m.content });
                }
                if (m.toolCalls) {
                    m.toolCalls.forEach(tc => {
                        content.push({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.toolName,
                            input: tc.args
                        });
                    });
                }
                return { role: 'assistant', content };
            }
            // User role
            return {
                role: m.role,
                content: m.content
            };
        });

    const payload: any = {
      model: request.model,
      messages: messages,
      max_tokens: 4096,
      temperature: request.temperature,
    };

    if (systemMessage) {
        payload.system = systemMessage.content;
    }

    if (request.tools && request.tools.length > 0) {
        payload.tools = request.tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema
        }));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();

    let textContent = '';
    const toolCalls: any[] = [];

    if (Array.isArray(data.content)) {
        for (const block of data.content) {
            if (block.type === 'text') {
                textContent += block.text;
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    toolName: block.name,
                    args: block.input,
                    id: block.id
                });
            }
        }
    }

    // Cost estimation
    let costUsd = 0;
    const input = data.usage?.input_tokens || 0;
    const output = data.usage?.output_tokens || 0;

    if (request.model.includes('sonnet')) {
        costUsd = (input * 3.00 + output * 15.00) / 1000000;
    } else if (request.model.includes('haiku')) {
        costUsd = (input * 0.25 + output * 1.25) / 1000000;
    }

    return {
      provider: 'anthropic',
      model: data.model,
      content: textContent || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: input,
        outputTokens: output,
        totalTokens: (input + output),
        costUsd
      },
      raw: data
    };
  }
}
