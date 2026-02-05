const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_RE = /(bearer\s+)[A-Za-z0-9\-_.=:+/]+/gi;
const LONG_HEX_RE = /\b[a-f0-9]{32,}\b/gi;
const API_KEY_RE = /\b(api[_-]?key|token|secret|session[_-]?id)\s*[:=]\s*[^\s]+/gi;

export function redactText(input: string): string {
  return input
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(TOKEN_RE, '$1[redacted-token]')
    .replace(API_KEY_RE, '$1=[redacted]')
    .replace(LONG_HEX_RE, '[redacted-hex]');
}

export function stripQueryParams(url: string): string {
  const parsed = new URL(url);
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}
