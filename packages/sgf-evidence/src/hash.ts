import { createHash } from "crypto";

export function sha256Bytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function canonicalJson(obj: any): Buffer {
  // Deterministic stringify: stable key ordering + no whitespace.
  const seen = new WeakSet();
  const normalize = (v: any): any => {
    if (v && typeof v === "object") {
      if (seen.has(v)) throw new Error("cycle");
      seen.add(v);
      if (Array.isArray(v)) return v.map(normalize);
      return Object.keys(v).sort().reduce((acc: any, k) => {
        acc[k] = normalize(v[k]);
        return acc;
      }, {});
    }
    return v;
  };
  return Buffer.from(JSON.stringify(normalize(obj)));
}
