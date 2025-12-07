
import { LlmProvider, ProviderId, ChatCompletionRequest, ChatCompletionResult } from '../types';

export class OpenAiProvider implements LlmProvider {
  id: ProviderId = 'openai';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  supports(model: string): boolean {
    return model.startsWith('gpt-');
  }

  async chat(request: ChatCompletionRequest & { model: string }): Promise<ChatCompletionResult> {
    if (!this.apiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    // Map internal messages to OpenAI format
    const messages = request.messages.map(m => {
        const msg: any = {
            role: m.role,
            content: m.content
        };
        if (m.name) msg.name = m.name;
        if (m.toolCalls) {
            msg.tool_calls = m.toolCalls.map(tc => ({
                id: tc.id,
                type: 'function',
                function: {
                    name: tc.toolName,
                    arguments: JSON.stringify(tc.args)
                }
            }));
        }
        if (m.toolCallId) {
            msg.tool_call_id = m.toolCallId;
        }
        return msg;
    });

    const payload: any = {
      model: request.model,
      messages: messages,
      temperature: request.temperature,
    };

    if (request.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    if (request.tools && request.tools.length > 0) {
       payload.tools = request.tools.map(t => ({
         type: 'function',
         function: {
           name: t.name,
           description: t.description,
           parameters: t.inputSchema
         }
       }));
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    // Calculate cost (rough estimate)
    let costUsd = 0;
    const input = data.usage?.prompt_tokens || 0;
    const output = data.usage?.completion_tokens || 0;

    if (request.model.includes('gpt-4o-mini')) {
        costUsd = (input * 0.15 + output * 0.60) / 1000000;
    } else if (request.model.includes('gpt-4o')) {
        costUsd = (input * 5.00 + output * 15.00) / 1000000;
    }

    return {
      provider: 'openai',
      model: data.model,
      content: choice?.message?.content || null,
      toolCalls: choice?.message?.tool_calls?.map((tc: any) => ({
          toolName: tc.function.name,
          args: JSON.parse(tc.function.arguments),
          id: tc.id
      })),
      usage: {
        inputTokens: input,
        outputTokens: output,
        totalTokens: data.usage?.total_tokens || 0,
        costUsd
      },
      raw: data
    };
  }
}
