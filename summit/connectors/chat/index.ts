export const CHAT_CONNECTORS_ENABLED = false;

export interface ChatMessage {
  channel: "whatsapp" | "telegram";
  userId: string;
  text: string;
}

export interface ChatConnector {
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(cb: (m: ChatMessage) => Promise<void>): void;
  send(userId: string, text: string): Promise<void>;
}

// TODO: Implement in a separate repo/package to keep core clean.
