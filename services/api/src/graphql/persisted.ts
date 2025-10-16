import crypto from 'crypto';
import fs from 'node:fs';

type PersistedMap = Record<string, string>; // opName -> sha256(query)

const mode = (process.env.PERSISTED_QUERY_MODE || 'off') as
  | 'off'
  | 'audit'
  | 'required';
const mapPath =
  process.env.PERSISTED_QUERY_MAP_PATH || 'services/api/persisted/queries.json';

let MAP: PersistedMap = {};
try {
  if (fs.existsSync(mapPath)) {
    MAP = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as PersistedMap;
  }
} catch {}

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function normalize(q: string) {
  return String(q || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function persistedGuard(req: any, res: any, next: any) {
  if (mode === 'off') return next();
  const body = req.body || {};
  const opName = body.operationName;
  const query = body.query;

  if (!opName) {
    if (mode === 'required')
      return res.status(400).json({ error: 'operationName_required' });
    return next();
  }
  const expected = MAP[opName];
  if (!expected) {
    if (mode === 'required')
      return res.status(403).json({ error: 'op_not_whitelisted', opName });
    if (mode === 'audit') console.warn('[persisted:audit] miss op=%s', opName);
    return next();
  }
  if (!query) {
    if (mode === 'required')
      return res.status(400).json({ error: 'query_required_for_validation' });
    return next();
  }
  const actual = sha256(normalize(query));
  const ok = actual === expected;
  if (!ok) {
    if (mode !== 'off')
      return res.status(403).json({ error: 'query_hash_mismatch', opName });
  }
  return next();
}
