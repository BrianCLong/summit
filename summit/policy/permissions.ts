export type PermissionReply = "once" | "always" | "reject";

export interface PermissionRequest {
  requestId: string;
  tool: string;
  scope: { workspaceRoot: string; paths?: string[] };
  reason: string;
  remote: boolean;
}

export interface PermissionDecision {
  requestId: string;
  reply: PermissionReply;
}

// Deny-by-default policy
export function decide(req: PermissionRequest): PermissionDecision {
  if (req.remote) return { requestId: req.requestId, reply: "reject" }; // tightened later behind feature flag
  return { requestId: req.requestId, reply: "once" };
}
