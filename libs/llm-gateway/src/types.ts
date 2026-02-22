export type ConversationMode =
  | "summit-managed"
  | "openai-previous-response"
  | "openai-conversations";

export interface GatewayRequest {
  requestId: string;
  tenantId: string;
  userId: string;
  instructions?: string;
  input: string | Array<{ role: "user" | "system" | "assistant"; content: string }>;
  tools?: Array<{ name: string; description: string; parameters: unknown }>;
  conversationId?: string;
  conversationMode: ConversationMode;
  store?: boolean;
}

export interface GatewayResponse {
  responseId: string;
  outputText: string;
  toolCalls?: Array<{ name: string; arguments: unknown }>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export interface LlmGatewayAdapter {
  generate(request: GatewayRequest): Promise<GatewayResponse>;
  embed(request: { input: string | string[]; model?: string }): Promise<number[][]>;
}
