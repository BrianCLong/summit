// src/agents/longhorizon/policies/redaction.ts
const SENSITIVE_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,           // AWS Access Key
  /([^A-Z0-9])[A-Z0-9]{40}(?![A-Z0-9])/g, // Potential AWS Secret (crude)
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g, // Slack tokens
  /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA )?PRIVATE KEY-----/g,
];

export function redactSecrets(text: string): string {
  let redacted = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

export function redactArtifact(artifact: any): any {
  if (typeof artifact === 'string') {
    return redactSecrets(artifact);
  }
  if (Array.isArray(artifact)) {
    return artifact.map(redactArtifact);
  }
  if (typeof artifact === 'object' && artifact !== null) {
    const result: any = {};
    for (const key of Object.keys(artifact)) {
      result[key] = redactArtifact(artifact[key]);
    }
    return result;
  }
  return artifact;
}
