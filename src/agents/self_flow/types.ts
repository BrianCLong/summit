export type Trajectory = {
  taskId: string
  modality: "text" | "image" | "table" | "mixed"
  steps: Array<{
    kind: "retrieve" | "reason" | "tool" | "cite" | "answer"
    input?: unknown
    output?: unknown
    kgAnchors?: { nodeIds: string[]; edgeIds?: string[] }
    docSpans?: Array<{ docId: string; start: number; end: number; sha256: string }>
  }>
  claims: Array<{ text: string; kgNodeIds: string[]; docSpans: Array<{ docId: string; start: number; end: number }> }>
  policy: { piiRisk: "low" | "med" | "high"; blocked: boolean; reasons: string[] }
}
