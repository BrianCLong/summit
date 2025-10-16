import * as crypto from 'crypto';
export function charge(ten: string, use: number, L: Ledger) {
  const a = L[ten] || (L[ten] = { eps: 1.5, spent: 0 });
  if (a.spent + use > a.eps) throw new Error('DP budget exceeded');
  a.spent += use;
}
