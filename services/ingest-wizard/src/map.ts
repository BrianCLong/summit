export interface MappingEntry { from: string; to: string }

export function mapRow(row: Record<string, any>, mapping: MappingEntry[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const m of mapping) {
    if (Object.prototype.hasOwnProperty.call(row, m.from)) {
      out[m.to] = row[m.from];
    }
  }
  return out;
}
