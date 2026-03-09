import type { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'node:fs';

const manifestPath =
  process.env.PERSISTED_MANIFEST || 'graphql/persisted/persisted-manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

export function persistedOnlyMiddleware(logger: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Enforce headers for provenance & persisted-only contract
    if (req.method === 'POST' && req.path === '/graphql') {
      if (
        req.headers['x-persisted-only'] !== 'true' ||
        req.headers['x-provenance-capture'] !== 'true'
      ) {
        return res.status(412).json({ error: 'persisted_only_required' });
      }
      const body: any = req.body || {};
      const opName = body.operationName as string;
      const ext = body.extensions?.persistedQuery;
      if (!opName || !ext?.sha256Hash)
        return res.status(412).json({ error: 'persisted_query_required' });
      const expected = manifest.operations[opName];
      if (!expected || expected !== ext.sha256Hash) {
        logger.warn(
          { opName, got: ext?.sha256Hash, expected },
          'persisted_mismatch',
        );
        return res.status(412).json({ error: 'persisted_query_mismatch' });
      }
    }
    next();
  };
}
