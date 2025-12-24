export type LWW = { [key: string]: { value: any; ts: number } };

export function merge(a: LWW, b: LWW): LWW {
  const out: LWW = { ...a };
  for (const k of Object.keys(b)) {
    if (!out[k] || b[k].ts > out[k].ts) {
      out[k] = b[k];
    }
  }
  return out;
}

export function apply(lww: LWW, key: string, value: any) {
  lww[key] = { value, ts: Date.now() };
  return lww;
}

export function sign(log: any) {
  return { ...log, sig: 'dev' };
}
