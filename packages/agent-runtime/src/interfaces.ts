import { z } from "zod";

export enum AgentStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export interface AgentLifecycle {
  id: string;
  status: AgentStatus;
  resume(state: any): Promise<void>;
  replay(logId: string): Promise<void>;
}

export interface AgentStream {
  streamId: string;
  subscribe(callback: (chunk: any) => void): void;
}

export interface ToolGraph {
  plan(goal: string): Promise<any>;
  execute(plan: any): Promise<any>;
}

export const RuntimeConfigSchema = z.object({
  persistence: z.boolean(),
  streaming: z.boolean(),
  routingPolicy: z.enum(["static", "dynamic"])
});
