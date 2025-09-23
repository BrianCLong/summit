import { createHash } from 'crypto';
import allowlist from '../../.maestro/persisted-queries.json';

export function enforcePersisted(req: any, res: any, next: any) {
  const { query, extensions } = req.body || {};
  const hash = extensions?.persistedQuery?.sha256Hash || (query && createHash('sha256').update(query).digest('hex'));
  if (!hash || !(allowlist as any)[hash]) return res.status(400).json({ error: 'Unknown query' });
  req.body.query = (allowlist as any)[hash];
  next();
}
