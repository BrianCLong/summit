import fs from 'fs';
import path from 'path';

const LOG_DIR = 'prov-ledger';
const LOG = path.join(LOG_DIR, 'log.json');

export function anchorDigest(digest: string, meta: Record<string, unknown>) {
  const entry = { digest, meta, ts: new Date().toISOString() };
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const lines = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf-8')) : [];
  lines.push(entry);
  fs.writeFileSync(LOG, JSON.stringify(lines, null, 2));
  return entry;
}
