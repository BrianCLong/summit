export type ToolSchema = {
  input: unknown;
  output: unknown;
};

export type Tool = {
  id: string;
  name: string;
  description: string;
  schema: ToolSchema;
  invoke: (input: unknown, env: Environment) => Promise<unknown>;
};

export type Environment = {
  id: string;
  kind: 'workspace' | 'graph' | 'browser' | 'custom';
  state: Record<string, unknown>;
};

export type AgentDefinition = {
  id: string;
  role: string;
  tools: string[];
  environments: string[];
};

export type ToolCall = {
  toolId: string;
  input: unknown;
};

export type PlanStep = {
  summary: string;
  calls: ToolCall[];
};

export interface TeaLlmClient {
  plan: (task: string, env: Environment, tools: Tool[]) => Promise<PlanStep[]>;
}
