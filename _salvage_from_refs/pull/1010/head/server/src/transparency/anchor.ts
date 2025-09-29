import fs from 'fs';

const LOG = 'prov-ledger/log.json';

export function anchorDigest(digest: string, meta: Record<string, unknown>) {
  const entry = { digest, meta, ts: new Date().toISOString() };
  const lines = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf-8')) : [];
  lines.push(entry);
  fs.writeFileSync(LOG, JSON.stringify(lines, null, 2));
  return entry;
}
