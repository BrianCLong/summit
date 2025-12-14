export function chunkText(text: string, maxTokens: number = 500, overlap: number = 50): string[] {
  // Simple approximation: 1 token ~= 4 chars
  const charLimit = maxTokens * 4;
  const charOverlap = overlap * 4;

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + charLimit;
    if (end >= text.length) {
      end = text.length;
    } else {
      // Try to break at a newline or space
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) {
        end = lastSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());

    start = end - charOverlap;
    if (start < 0) start = 0; // Should not happen with logic above but safe guard

    // Prevent infinite loops if overlap >= limit (config error)
    if (end <= start) {
      // Force progress if stuck
      start = end + 1;
    }

    // Safety check for infinite loops or massive arrays
    if (chunks.length > 10000) break;
  }

  return chunks;
}
