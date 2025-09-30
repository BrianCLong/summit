export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  safetySettings?: any[];
  hints?: Record<string, string>;
}

export interface EmbedOptions {
  model?: string; // e.g., text-embedding-004
}

export interface VectorDoc {
  id: string;
  text?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface AIGenerateResult {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  raw?: any;
}

export interface AIVectorSearchResult {
  matches: Array<{ docId: string; chunkId: string; score: number; title?: string }>;
}

export interface AIProvider {
  name(): string;
  generate(messages: AIMessage[], opts?: GenerateOptions): Promise<AIGenerateResult>;
  embed(texts: string[], opts?: EmbedOptions): Promise<number[][]>;
  vectorUpsert?(caseId: string, docs: VectorDoc[]): Promise<void>;
  vectorSearch?(caseId: string, query: string, k: number): Promise<AIVectorSearchResult>;
}
