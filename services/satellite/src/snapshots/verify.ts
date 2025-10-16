import { createHash } from 'crypto';

export function verifySnapshot(
  bytes: Buffer,
  digest: string,
  _hubCert: string,
  _signature: string,
) {
  const d = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  if (d !== digest) throw new Error('snapshot digest mismatch');
  return true;
}
