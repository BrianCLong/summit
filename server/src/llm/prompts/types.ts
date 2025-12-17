
import { ChatMessage, ChatCompletionRequest } from '../types';

export interface PromptTemplate {
  id: string;
  version: string;
  purpose: ChatCompletionRequest["purpose"];
  riskLevel: ChatCompletionRequest["riskLevel"];
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  messages: ChatMessage[]; // Content can contain {{variable}}
  metadata?: Record<string, unknown>;
}

export interface RenderedPrompt {
  messages: ChatMessage[];
  templateId: string;
  templateVersion: string;
}

export interface PromptService {
  register(template: PromptTemplate): void;
  get(id: string, version?: string): PromptTemplate | undefined;
  render(id: string, params: Record<string, any>, version?: string): Promise<RenderedPrompt>;
}
