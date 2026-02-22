// src/agents/longhorizon/policies/tool_allowlist.ts
export const ALLOWED_TOOLS = [
  'git:read',
  'git:commit',
  'fs:read',
  'fs:write',
  'eval:run',
];

export function isToolAllowed(toolName: string): boolean {
  return ALLOWED_TOOLS.includes(toolName);
}

export function validateToolPlan(plan: string[]): { allowed: boolean; deniedTools: string[] } {
  const deniedTools = plan.filter(tool => !isToolAllowed(tool));
  return {
    allowed: deniedTools.length === 0,
    deniedTools,
  };
}
