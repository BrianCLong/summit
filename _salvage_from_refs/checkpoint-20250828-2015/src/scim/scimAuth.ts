import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pg';

/** Bearer <token> mapped to org.scim_token */
export function scimAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const h = req.headers.authorization || '';
      const m = h.match(/^Bearer\s+(.+)$/i);
      if (!m) return res.status(401).json({ scimType: 'unauthorized', detail: 'Missing bearer' });
      const tok = m[1];
      const { rows } = await pool.query(`SELECT id FROM org WHERE scim_token=$1 AND tenant_id=current_setting('app.tenant_id')::uuid`, [tok]);
      if (!rows[0]) return res.status(401).json({ scimType: 'unauthorized', detail: 'Invalid token' });
      (req as any).orgId = rows[0].id;
      next();
    } catch (e) { return res.status(500).json({ detail: 'SCIM auth error' }); }
  };
}