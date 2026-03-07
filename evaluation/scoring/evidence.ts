// Evidence scoring module for Summit Bench GraphRAG workloads

export function scoreEvidencePrecision(required: string[], provided: string[]): number {
  if (required.length === 0) return 1.0;

  const hits = required.filter(id => provided.includes(id)).length;
  return hits / required.length;
}

export function scoreToolEfficiency(optimalSteps: number, actualSteps: number): number {
  if (actualSteps === 0) return 0;
  return Math.min(1.0, optimalSteps / actualSteps);
}
