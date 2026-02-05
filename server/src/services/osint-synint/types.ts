// server/src/services/osint-synint/types.ts

export type SynintMode = "http" | "cli";

export interface SynintAgentResult {
  agentName: string;       // "WhoisAgent", "SocialMediaAgent", ...
  success: boolean;
  findings: unknown;       // raw per-agent structure
  errors?: string[];
  warnings?: string[];
  startedAt?: string;      // ISO
  completedAt?: string;    // ISO
}

export interface SynintSweepResult {
  target: string;
  startedAt: string;       // ISO
  completedAt: string;     // ISO
  agents: SynintAgentResult[];
  meta?: Record<string, unknown>;
}

/**
 * Your internal normalized representation to drive graph ingest.
 * Keep this tiny and adapt to your existing GraphService/EventIngestService.
 */
export type GraphMutation =
  | { kind: "upsertNode"; node: { id: string; labels: string[]; props: Record<string, unknown> } }
  | { kind: "upsertEdge"; edge: { id: string; type: string; from: string; to: string; props?: Record<string, unknown> } }
  | { kind: "emitEvent"; event: { type: string; at: string; actor?: string; target: string; payload: Record<string, unknown> } };
