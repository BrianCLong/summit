// Basic secret redaction simulating what might be loaded from a larger env var list or secret manager
const knownSecrets = [
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
  process.env.GITHUB_TOKEN,
  process.env.OPENAI_API_KEY,
  process.env.ANTHROPIC_API_KEY
].filter(Boolean) as string[];

const secretPatterns = [
  /sk-[a-zA-Z0-9]{32,}/g,           // generic secret keys
  /ghp_[a-zA-Z0-9]{36}/g,           // GitHub PATs
  /AKIA[0-9A-Z]{16}/g               // AWS Access Keys
];

export function redactSecrets(text: string): string {
  if (!text) return text;

  let redacted = text;

  // Redact exact known secrets
  for (const secret of knownSecrets) {
    if (secret && secret.length > 5) {
      // Create a global replacement, escaping special regex chars in the secret string just in case
      const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      redacted = redacted.replace(new RegExp(escaped, 'g'), '[REDACTED]');
    }
  }

  // Redact by pattern
  for (const pattern of secretPatterns) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }

  return redacted;
}

export function registerSecret(secret: string) {
  if (secret && secret.length > 5 && !knownSecrets.includes(secret)) {
    knownSecrets.push(secret);
  }
}
