const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_REGEX = /(api|secret|token|key)[=:]\s*([a-z0-9\-_.]+)/gi;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;

export const redactSensitive = (input: string): string => {
  return input
    .replace(EMAIL_REGEX, '[redacted-email]')
    .replace(TOKEN_REGEX, (_match, prefix) => `${prefix}=[redacted-secret]`)
    .replace(CREDIT_CARD_REGEX, '[redacted-pan]');
};

export interface RedactionResult {
  sanitized: string;
  wasRedacted: boolean;
}

export const safeLogPayload = (payload: unknown): RedactionResult => {
  const serialized = JSON.stringify(payload);
  const sanitized = redactSensitive(serialized);
  return {
    sanitized,
    wasRedacted: sanitized !== serialized,
  };
};
