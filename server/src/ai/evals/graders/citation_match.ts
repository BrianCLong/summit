export function citationMatch(actualCitations: string[], expectedChunkIds: string[]): number {
  if (actualCitations.length === 0 && expectedChunkIds.length === 0) return 1.0;
  if (actualCitations.length === 0) return 0.0;
  const matchCount = actualCitations.filter(c => expectedChunkIds.includes(c)).length;
  return matchCount / actualCitations.length; // Ratio of valid citations to total citations
}
