import type { ContractContext, ContractResult, ProviderAdapter, ToolDefinition } from '../types.js';
import type { ContractTest } from './types.js';

const toolDefinition: ToolDefinition = {
  name: 'report_status',
  description: 'Report an ok status.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
    },
    required: ['status'],
    additionalProperties: false,
  },
};

export const toolCallsContract: ContractTest = {
  id: 'tool_calls',
  description: 'Detect tool call support',
  run: async (adapter: ProviderAdapter, context: ContractContext): Promise<ContractResult> => {
    const prompt = 'Call the report_status tool with status \"ok\".';
    const response = await adapter.run({
      prompt,
      maxTokens: 64,
      temperature: 0,
      tools: [toolDefinition],
    });

    const supportsToolCalls = Boolean(response.toolCalls && response.toolCalls.length > 0);
    return {
      id: 'tool_calls',
      passed: true,
      details: supportsToolCalls
        ? 'Tool calls returned.'
        : 'No tool calls returned by provider.',
      capabilities: {
        toolCalls: supportsToolCalls,
      },
      metadata: {
        toolCallCount: response.toolCalls?.length ?? 0,
        promptHash: context.promptHash(prompt),
        request: {
          maxTokens: 64,
          temperature: 0,
          toolCount: 1,
        },
        response: {
          headerKeys: Object.keys(response.headers),
        },
      },
    };
  },
};
