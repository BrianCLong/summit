export interface Tariff {
  minProofLevel: 'standard' | 'strict';
  rateLimit: number;
  throttleMs: number;
}

export function score(sig: {
  formatSig: string;
  timingSig: string;
  xformSig: string;
}): number {
  let s = 0;
  if (sig.xformSig === 'nokpw') s += 3;
  if (/NOEXIF/.test(sig.formatSig)) s += 1;
  if (/pdf.*:0:/.test(sig.formatSig)) s += 1;
  const hh = Number(sig.timingSig.split('h')[0]);
  if (hh >= 0 && (hh < 6 || hh > 22)) s += 1;
  return s;
}

export function tariff(sig: {
  formatSig: string;
  timingSig: string;
  xformSig: string;
}): Tariff {
  const sc = score(sig);
  return {
    minProofLevel: sc >= 3 ? 'strict' : 'standard',
    rateLimit: Math.max(1, 10 - sc * 2),
    throttleMs: sc * 2000,
  };
}
