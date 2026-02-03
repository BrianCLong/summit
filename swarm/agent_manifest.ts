export type AgentCard = { agentId: string; role: string; tasks: string[]; outputs: string[]; };
export type AgentManifest = { runId: string; cards: AgentCard[] };
export function emptyManifest(runId: string): AgentManifest { return { runId, cards: [] }; }
export function generateExampleManifest(runId: string): AgentManifest {
  return { runId, cards: [
    { agentId: "a1", role: "Design Agent", tasks: ["Layout sketch"], outputs: ["layout.png"] },
    { agentId: "a2", role: "Review Agent", tasks: ["Validation"], outputs: ["report.md"] }
  ] };
}
