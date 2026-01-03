const secretPatterns: RegExp[] = [
  /(sk|pk|api)[_-]?[a-z0-9]{12,}/i,
  /AKIA[0-9A-Z]{16}/,
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/, // JWT-like tokens
  /(password|secret|token|credential)[^\n]{0,20}[=:][^\n]{0,50}/i,
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function redactSecrets(text: string): string {
  let redacted = text;
  for (const pattern of secretPatterns) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

export function sanitizeModelOutput(text: string): string {
  const escaped = escapeHtml(text || '');
  return redactSecrets(escaped);
}
