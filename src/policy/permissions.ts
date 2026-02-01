/**
 * Default Deny Policy for Protocols
 *
 * Every tool call must be explicitly allowed.
 */

export interface PermissionRequest {
  agentId: string;
  tool: string;
  action: string;
}

// In-memory allowlist for demonstration/scaffolding
export const ALLOWED_PERMISSIONS: Record<string, string[]> = {
  "agent-a": ["calculator.add"],
  "agent-b": ["data-analyzer.analyze"]
};

export function checkPermission(request: PermissionRequest): boolean {
  const allowed = ALLOWED_PERMISSIONS[request.agentId];
  if (!allowed) {
    return false;
  }

  const permissionString = `${request.tool}.${request.action}`;
  return allowed.includes(permissionString);
}
