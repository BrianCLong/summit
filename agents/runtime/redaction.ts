export function redactSecrets(content: string): string {
  // Simple heuristic for generic keys, tokens
  const apiKeyRegex = /(sk-[A-Za-z0-9_-]{48})|([A-Za-z0-9_-]{40})/g;
  return content.replace(apiKeyRegex, '[REDACTED_SECRET]');
}
