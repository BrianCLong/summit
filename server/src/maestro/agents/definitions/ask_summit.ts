
// Ask Summit Agent Definition
// Used for RAG over IntelGraph + Docs

import { IntelGraphTool } from "../../tools/intelgraph";

export const AskSummitAgent = {
  id: "ask-summit-v1",
  name: "Ask Summit",
  role: "Research Assistant",
  description: "Answers questions using IntelGraph and internal documentation.",
  capabilities: ["read_graph", "read_docs"],
  tools: [IntelGraphTool],
  governance: {
    riskLevel: "low",
    requireApproval: false,
    logProvenance: true
  },
  systemPrompt: `You are Summit, an intelligent research assistant.
  Use the available tools to answer the user's question grounded in data.
  Always cite your sources.`
};
