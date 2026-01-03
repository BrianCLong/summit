const TOKEN_DIVISOR = 4;

export function estimateTokensFromString(content: string): number {
  if (!content) {
    return 0;
  }
  return Math.max(1, Math.ceil(content.split(/\s+/).join(' ').trim().length / TOKEN_DIVISOR));
}

export function estimateMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((total, message) => total + estimateTokensFromString(message.content) + 2, 0);
}
