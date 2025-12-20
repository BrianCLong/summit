import { createHash } from 'crypto';
import fs from 'fs';

export function verifyWeights(path: string, expectedSha256: string) {
  const buf = fs.readFileSync(path);
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== expectedSha256) {
    throw new Error('weights_checksum_mismatch');
  }
  return JSON.parse(buf.toString());
}
