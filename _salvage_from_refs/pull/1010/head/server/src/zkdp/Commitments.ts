import crypto from 'crypto';

export type PedersenCommit = { C: string; r: string };

export function commit(value: number): PedersenCommit {
  const r = crypto.randomBytes(32).toString('hex');
  const C = crypto.createHash('sha256').update(`${value}|${r}`).digest('hex');
  return { C, r };
}

export function verifyCommit(C: string, value: number, r: string) {
  return C === crypto.createHash('sha256').update(`${value}|${r}`).digest('hex');
}
