import { createHash } from 'node:crypto';
import { stableStringify } from './stableJson';

export function createTranscriptHash(input: unknown): string {
  return createHash('sha256').update(stableStringify(input)).digest('hex');
}
