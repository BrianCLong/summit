import * as crypto from 'crypto';

export function generateId(prefix: string, content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  return `${prefix}-${hash}`;
}
