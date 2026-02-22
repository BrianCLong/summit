export type ToolPolicy = { allowedTools: string[] };
export function checkToolAllowed(p: ToolPolicy, toolName: string): void {
  if (!p.allowedTools.includes(toolName)) { throw new Error(`tool_denied:${toolName}`); }
}
