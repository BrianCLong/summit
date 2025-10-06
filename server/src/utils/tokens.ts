const AVG_CHARS_PER_TOKEN = 4;
const AVG_WORDS_PER_TOKEN = 0.75;

export function tokenEstimate(text: string): number {
  if (!text) return 0;
  const wordCount = text.trim().split(/\s+/).length;
  const charCount = text.length;
  const byChars = Math.ceil(charCount / AVG_CHARS_PER_TOKEN);
  const byWords = Math.ceil(wordCount / AVG_WORDS_PER_TOKEN);
  return Math.max(byChars, byWords);
}

export function tokenEstimateForAttachments(attachments?: Array<{ bytesB64: string }>): number {
  if (!attachments?.length) return 0;
  return attachments.reduce((sum, att) => sum + Math.ceil((att.bytesB64?.length || 0) / 4), 0);
}
