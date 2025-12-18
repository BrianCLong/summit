
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Intent {
  id: string;
  type: 'query' | 'command' | 'analysis' | 'graph_mutation';
  confidence: number;
  entities: string[]; // OSINT entities
  rawQuery: string;
  reasoning: string;
  modelsVoted: string[];
}

export interface MemoryItem {
  id: string;
  content: string;
  type: 'verbatim' | 'summary' | 'fact';
  timestamp: Date;
  relevanceScore?: number;
}

export interface AgentAction {
  type: 'search_graph' | 'read_memory' | 'execute_tool' | 'ask_user';
  payload: any;
  riskLevel: 'autonomous' | 'hitl' | 'prohibited';
}

export interface AgentResponse {
  content: string;
  actionsTaken: AgentAction[];
  traceId: string;
}
