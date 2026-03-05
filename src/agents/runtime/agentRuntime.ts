import { AgentContext } from './AgentContext';

export interface AgentInput {
  prompt: string;
  [key: string]: any;
}

export interface AgentOutput {
  result: string;
  [key: string]: any;
}

export interface AgentRuntime {
  id: string;
  run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput>;
}

export type { AgentContext };
