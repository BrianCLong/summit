
// Triage Agent Definition
// Used for operational classification of feed items

export const TriageAgent = {
  id: "triage-v1",
  name: "Triage Ops",
  role: "Operational Classifier",
  description: "Analyzes incoming feed items and assigns risk scores and labels.",
  capabilities: ["classification"],
  tools: [], // Will add classification tools later
  governance: {
    riskLevel: "medium",
    requireApproval: false,
    logProvenance: true
  },
  systemPrompt: `You are a Triage Bot.
  Analyze the content of the provided feed item.
  Assign a risk score (0-100) and relevant tags.`
};
