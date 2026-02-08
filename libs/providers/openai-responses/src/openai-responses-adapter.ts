import { LlmGatewayAdapter, GatewayRequest, GatewayResponse } from '@intelgraph/llm-gateway';

export class OpenAIResponsesAdapter implements LlmGatewayAdapter {
  async generate(request: GatewayRequest): Promise<GatewayResponse> {
    // Stub implementation for OpenAI Responses Adapter
    return {
      responseId: `resp-${Date.now()}`,
      outputText: 'This is a stub response from OpenAI Responses Adapter.',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    };
  }

  async embed(request: { input: string | string[]; model?: string }): Promise<number[][]> {
    const input = Array.isArray(request.input) ? request.input : [request.input];
    // Return dummy embeddings
    return input.map(() => [0.1, 0.2, 0.3]);
  }
}
