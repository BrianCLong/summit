export interface SessionSummary {
  id: string;
  provider: string;
  projectName: string;
  title: string;
  startedAt: string;
  updatedAt: string;
  messageCount: number;
  resumeCommand: string;
}

export interface ToolCall {
  name: string;
  input?: unknown;
  output?: unknown;
  status?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface SessionMessage {
  id: string;
  ts?: string;
  role: string;
  contentText: string;
  contentBlocks?: unknown;
  toolCalls?: ToolCall[];
}

export interface SessionDetail {
  summary: SessionSummary;
  messages: SessionMessage[];
}

export interface SessionProjectCount {
  projectName: string;
  count: number;
}

export interface SessionListParams {
  project?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface AgentSessionProvider {
  listSessions(params: SessionListParams): Promise<{
    sessions: SessionSummary[];
    nextCursor?: string;
  }>;
  getSessionDetail(sessionId: string): Promise<SessionDetail | null>;
  getProjects(): Promise<SessionProjectCount[]>;
  watchSession(
    sessionId: string,
    onChange: () => void,
  ): { close: () => void } | null;
}
