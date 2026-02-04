import { createSign, createVerify, createHash } from 'crypto';
import type { TraceRecord } from './trace_record.js';

export function signRecord(record: TraceRecord, privateKey: string): string {
  const data = JSON.stringify(record);
  const sign = createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'hex');
}

export function verifyRecord(record: TraceRecord, signature: string, publicKey: string): boolean {
  const data = JSON.stringify(record);
  const verify = createVerify('SHA256');
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, 'hex');
}

export function computeContentHash(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex');
}
