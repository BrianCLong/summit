export function validateAgent(agent: string) {
  const allow = ["cursor", "copilot"]
  return allow.includes(agent)
}
