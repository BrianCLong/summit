export function routeAgent(task: string) {
  if (task.includes("refactor")) return "cursor"
  if (task.includes("security")) return "observer"
  return "default"
}
