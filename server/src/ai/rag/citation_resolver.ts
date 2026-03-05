export function resolveCitations(claim: string, retrievedChunkIds: string[]): boolean {
  // Mock logic: assumes citation tokens e.g., [c1]
  const match = claim.match(/\[(.*?)\]/g);
  if (!match) return false;
  const citationIds = match.map(m => m.replace(/\[|\]/g, ''));
  return citationIds.every(id => retrievedChunkIds.includes(id));
}
