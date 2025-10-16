import { recordProvenance, hashObject } from '../provenance/ledger';

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /[A-Za-z0-9+\/=]{32,}/,
  /-----BEGIN (?:RSA|EC) PRIVATE KEY-----/,
];
const PII_PATTERNS = [/\b\d{3}-\d{2}-\d{4}\b/, /\b(?:\d[ -]*?){13,16}\b/];

export interface GuardedResult {
  ok: boolean;
  redacted?: string;
  reason?: string;
}

export function guardedOutput(specId: string, content: string): GuardedResult {
  const hasSecret = SECRET_PATTERNS.some((pattern) => pattern.test(content));
  const hasPii = PII_PATTERNS.some((pattern) => pattern.test(content));
  if (!hasSecret && !hasPii) {
    record(content, specId, 'clean');
    return { ok: true };
  }
  const redacted = content
    .replace(SECRET_PATTERNS[0], '[REDACTED-KEY]')
    .replace(SECRET_PATTERNS[1], '[REDACTED-TOKEN]')
    .replace(SECRET_PATTERNS[2], '[REDACTED-PRIVATE-KEY]')
    .replace(PII_PATTERNS[0], 'XXX-XX-XXXX')
    .replace(PII_PATTERNS[1], 'XXXX-XXXX-XXXX-XXXX');
  record(redacted, specId, hasSecret ? 'secret' : 'pii');
  return { ok: false, redacted, reason: hasSecret ? 'secret' : 'pii' };
}

function record(content: string, specId: string, tag: string): void {
  recordProvenance({
    reqId: specId,
    step: 'generator',
    inputHash: hashObject(tag),
    outputHash: hashObject(content),
    policy: { retention: 'short-30d', purpose: 'engineering' },
    time: { start: new Date().toISOString(), end: new Date().toISOString() },
    tags: ['guard', tag],
  });
}
