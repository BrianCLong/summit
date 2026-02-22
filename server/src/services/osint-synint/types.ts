export type SynintMode = "http" | "cli";

export interface SynintAgentResult {
  agentName: string;
  success: boolean;
  findings: unknown;
  errors?: string[];
  warnings?: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface SynintSweepResult {
  target: string;
  startedAt: string;
  completedAt: string;
  agents: SynintAgentResult[];
  meta?: Record<string, unknown>;
}

export type GraphMutation =
  | { kind: "upsertNode"; node: { id: string; labels: string[]; props: Record<string, unknown> } }
  | { kind: "upsertEdge"; edge: { id: string; type: string; from: string; to: string; props?: Record<string, unknown> } }
  | { kind: "emitEvent"; event: { type: string; at: string; actor?: string; target: string; payload: Record<string, unknown> } };
