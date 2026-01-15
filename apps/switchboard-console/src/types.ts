export type ProviderId = 'claude' | 'codex' | 'gemini' | 'fake';

export type EventType =
  | 'session_start'
  | 'step_start'
  | 'tool_exec'
  | 'file_read'
  | 'file_write'
  | 'tests_run'
  | 'session_end';

export type ToolActionType = 'tool_exec' | 'file_read' | 'file_write';

export interface ToolAction {
  type: ToolActionType;
  command?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface EventRecord {
  id: string;
  type: EventType;
  timestamp: string;
  sessionId: string;
  data: Record<string, unknown>;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  mode: 'deny-by-default' | 'allow-all' | 'allowlist';
}

export interface Skillset {
  name: string;
  description: string;
  systemPrompt: string;
}

export interface ProviderSession {
  sendMessage(
    input: string,
    handlers: {
      onToken: (token: string) => void;
      onToolAction?: (action: ToolAction) => void;
    },
  ): Promise<void>;
  stop(): Promise<void>;
}

export interface ProviderAdapter {
  id: ProviderId;
  displayName: string;
  isAvailable(): Promise<boolean>;
  startSession(options: {
    sessionId: string;
    systemPrompt: string;
  }): Promise<ProviderSession>;
}
