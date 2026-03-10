export interface TraceEvent {
  eventId: string;
  runId: string;
  ts: string;
  step: number;
  actor: {
    type: "agent" | "tool" | "evaluator" | "system";
    id: string;
    role?: string;
  };
  kind:
    | "run_started"
    | "observation"
    | "reasoning"
    | "tool_called"
    | "tool_result"
    | "artifact_written"
    | "delegation"
    | "policy_check"
    | "evaluation"
    | "submission"
    | "run_finished";
  payload: Record<string, unknown>;
}
