import type { ExplainPayload } from "../api/types";

export function buildExplainPayload(id: string): ExplainPayload {
  return {
    id,
    summary:
      "Cognitive weather signal generated from narrative pressure and emotional temperature.",
    drivers: [
      {
        name: "Narrative pressure delta",
        delta: 0.2,
        evidence: ["terrain:demo:latest"],
      },
    ],
    confidence: 0.6,
    provenance: { models: ["extractor:v0", "terrain:v0"] },
  };
}
