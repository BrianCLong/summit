export interface CounterAiRisk {
  risk_id: string;
  name: string;
  attack_surface: string;
  attack_mode: string;
  symptom_patterns: string;
  mitigation_hooks: string[];
}

export const COUNTER_AI_RISKS: CounterAiRisk[] = [
  {
    risk_id: "CAI-001",
    name: "GRAPH_RELATION_INJECTION",
    attack_surface: "Graph indexing pipeline",
    attack_mode: "Relation injection/enhancement",
    symptom_patterns: "Sudden spike in relationships between previously disjoint entities. Anomalously high confidence scores for new edges.",
    mitigation_hooks: ["graph_indexing:relation_creation", "graph_indexing:edge_enrichment"]
  },
  {
    risk_id: "CAI-002",
    name: "COMMUNITY_DENSIFICATION",
    attack_surface: "Community detection pipeline",
    attack_mode: "Community densification",
    symptom_patterns: "Rapid merging of distinct communities. Unnatural clustering coefficient increases in specific subgraphs.",
    mitigation_hooks: ["community_detection:summary_update"]
  },
  {
    risk_id: "CAI-003",
    name: "MULTI_HOP_POISONING",
    attack_surface: "Query-time retrieval",
    attack_mode: "Multi-hop exploitation",
    symptom_patterns: "Retrieval paths consistently routing through a specific set of highly-connected 'bridge' nodes introduced recently.",
    mitigation_hooks: ["retrieval:path_traversal"]
  },
  {
    risk_id: "CAI-004",
    name: "PROMPT_JAILBREAK",
    attack_surface: "Agent prompt interface",
    attack_mode: "Jailbreak/Evasion",
    symptom_patterns: "Presence of known jailbreak signatures in prompts. Output deviating significantly from established agent personas.",
    mitigation_hooks: ["agent:prompt_boundary", "agent:response_boundary"]
  },
  {
    risk_id: "CAI-005",
    name: "MODEL_STEALING_INVERSION",
    attack_surface: "Agent query interface",
    attack_mode: "Inversion/Model-stealing",
    symptom_patterns: "High volume of highly specific, systematically varied queries designed to map decision boundaries.",
    mitigation_hooks: ["agent:query_interface"]
  }
];

export function getRiskById(riskId: string): CounterAiRisk | undefined {
  return COUNTER_AI_RISKS.find(risk => risk.risk_id === riskId);
}
