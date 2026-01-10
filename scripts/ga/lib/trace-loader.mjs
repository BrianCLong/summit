import fs from 'node:fs';

export function loadTrace(p) {
  const raw = fs.readFileSync(p, 'utf8').trim();
  // Accept JSON or NDJSON
  if (raw.startsWith('[')) return JSON.parse(raw);
  return raw.split('\n').filter(Boolean).map(line => {
    try {
        return JSON.parse(line)
    } catch (e) {
        return null
    }
  }).filter(Boolean);
}
