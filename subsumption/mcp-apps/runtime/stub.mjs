export function isMcpAppsEnabled(env = process.env){
  return String(env.MCP_APPS_ENABLED || "false").toLowerCase() === "true";
}
// TODO: wire to real renderer later; keep OFF-by-default for GA safety.
