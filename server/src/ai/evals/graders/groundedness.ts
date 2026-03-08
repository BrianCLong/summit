export function groundednessCheck(text: string, supportChunks: string[]): number {
  if (supportChunks.length === 0) return 0.0;

  // Simple heuristic: count how many chunks are actually mentioned (referenced) in the text
  const referencedChunks = supportChunks.filter(chunkId => text.includes(chunkId));

  return referencedChunks.length / supportChunks.length;
}
