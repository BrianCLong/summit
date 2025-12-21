export type MappingEntry = { from: string; to: string };

export function mapRow(row: Record<string, unknown>, mapping: MappingEntry[]) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v;
  }
  for (const m of mapping) {
    if (Object.prototype.hasOwnProperty.call(row, m.from)) {
      out[m.to] = row[m.from];
    }
  }
  return out;
}
