const EMAIL_REDACT = /([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
const PHONE_REDACT = /(\+?\d[\d\s\-]{7,})/g;
const IP_REDACT = /(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}/g; // Matches IPv4 /24
const TOKEN_API_KEY_REDACT = /([A-Za-z0-9\-_]{10,})([A-Za-z0-9\-_]{4})/g; // Matches tokens/API keys, keeps last 4

export function scrub(line: string): string {
  let scrubbedLine = line;

  // Email masking: a***@domain.tld
  scrubbedLine = scrubbedLine.replace(EMAIL_REDACT, (match, p1, p2) => {
    const firstChar = p1.charAt(0);
    const maskedPart = "*".repeat(p1.length - 1);
    return `${firstChar}${maskedPart}@${p2}`;
  });

  // Phone masking: [REDACTED] (using existing regex for simplicity)
  scrubbedLine = scrubbedLine.replace(PHONE_REDACT, "[REDACTED]");

  // IP masking: 203.0.113.x
  scrubbedLine = scrubbedLine.replace(IP_REDACT, "$1.x");

  // Token/API key masking: last 4 only
  scrubbedLine = scrubbedLine.replace(TOKEN_API_KEY_REDACT, (match, p1, p2) => {
    return `***${p2}`; // Replace everything but last 4 with asterisks
  });

  return scrubbedLine;
}
