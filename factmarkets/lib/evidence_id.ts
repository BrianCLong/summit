import { createHash } from 'node:crypto';
import { stableStringify } from './stable_json.js';

export function generateEvidenceId(content: unknown): string {
  let input: string | Buffer;

  if (Buffer.isBuffer(content)) {
    input = content;
  } else if (typeof content === 'string') {
    input = content;
  } else {
    input = stableStringify(content);
  }

  const hash = createHash('sha256').update(input).digest('hex');
  const shortHash = hash.substring(0, 12);
  return `EVID_${shortHash}`;
}
