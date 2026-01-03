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

export interface ProjectCount {
  projectName: string;
  count: number;
}
