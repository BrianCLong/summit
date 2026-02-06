export type RetrievalMode = "semantic" | "regex" | "hybrid";

export function chooseRetrievalMode(query: string): RetrievalMode {
  // Simple heuristic; improve later.
  if (query.match(/[A-Za-z_][A-Za-z0-9_]*\(/)) {
    return "regex";
  }
  return "hybrid";
}
