export function assertToolsAllowed(requestedTools: string[], toolAllowlist: string[]): void {
  const allowlist = new Set(toolAllowlist);
  const deniedTools = requestedTools.filter((tool) => !allowlist.has(tool));

  if (deniedTools.length > 0) {
    throw new Error(`Denied tools: ${deniedTools.join(", ")}`);
  }
}
