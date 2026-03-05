export interface SelfFlowMetrics {
  fid: number
  fvd: number
  rag_accuracy: number
}

export function evaluateSelfFlow(metrics: SelfFlowMetrics) {
  if (metrics.rag_accuracy < 0.7) {
    throw new Error("SelfFlow gate failed")
  }
}
