const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/, // AWS access key
  /(?<![A-Z0-9])[A-Za-z0-9]{32}(?![A-Z0-9])/, // generic token
  /-----BEGIN (RSA|EC) PRIVATE KEY-----/, // private key block
];

export function scanForPlaintext(content: string): string[] {
  const hits: string[] = [];
  SECRET_PATTERNS.forEach((pattern) => {
    if (pattern.test(content)) {
      hits.push(pattern.source);
    }
  });
  return hits;
}

export function enforceNoPlaintext(blobs: Record<string, string>): void {
  const violations: string[] = [];
  for (const [name, value] of Object.entries(blobs)) {
    const matches = scanForPlaintext(value);
    if (matches.length > 0) {
      violations.push(`${name}: ${matches.join(',')}`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`Secret scanning failed: ${violations.join('; ')}`);
  }
}
