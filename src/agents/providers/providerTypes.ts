export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

export type ChatResult = {
  text: string;
  raw?: unknown;
};

export interface ChatProvider {
  readonly name: string;
  chat(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<ChatResult>;
}
