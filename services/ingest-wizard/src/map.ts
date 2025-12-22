export type Mapping = { from: string; to: string }[];

export function mapRow(row: Record<string, any>, m: Mapping) {
  const out: Record<string, any> = {};
  for (const r of m) {
    out[r.to] = row[r.from];
  }
  return out;
}
