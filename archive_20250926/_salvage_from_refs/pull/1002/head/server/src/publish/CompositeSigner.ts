import { createHash } from 'crypto';

export class CompositeSigner {
  async sign(payload: Buffer) {
    const digest = createHash('sha256').update(payload).digest('hex');
    return { ec: digest, pqc: digest };
  }
}
