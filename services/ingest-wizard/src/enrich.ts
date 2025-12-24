import { createHash } from 'crypto';

export function classifyPII(value: string) {
  if (/@/.test(value)) {
    return 'email';
  }
  if (/\+?\d[\d\s-]{7,}/.test(value)) {
    return 'phone';
  }
  return 'none';
}

export function hash(s: string) {
  return createHash('sha256').update(s).digest('hex');
}
