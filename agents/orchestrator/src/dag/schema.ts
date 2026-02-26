export interface DagNode {
  id: string;
  agent: string;
  input?: string;
}

export interface DagEdge {
  id?: string;
  from: string;
  to: string;
  tool?: string;
}

export interface DagWorkflow {
  id: string;
  nodes: DagNode[];
  edges: DagEdge[];
}

export interface AgentExecutionInput {
  node: DagNode;
  upstream: ReadonlyArray<{
    from: string;
    output: string;
  }>;
}

export type AgentExecutor = (
  input: AgentExecutionInput,
) => Promise<string> | string;

export type AgentExecutorRegistry = Record<string, AgentExecutor>;
