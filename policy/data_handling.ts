export function redactSensitiveData(data: Record<string, any>, neverLogKeys: string[]): Record<string, any> {
  const redacted = { ...data };
  for (const key of Object.keys(redacted)) {
    if (neverLogKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) { redacted[key] = "[REDACTED]"; }
    else if (typeof redacted[key] === 'object' && redacted[key] !== null) { redacted[key] = redactSensitiveData(redacted[key], neverLogKeys); }
  }
  return redacted;
}
