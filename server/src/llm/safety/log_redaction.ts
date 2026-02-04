const TOKEN_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/g,
  /nvapi-[A-Za-z0-9]+/g
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const re of TOKEN_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out;
}
