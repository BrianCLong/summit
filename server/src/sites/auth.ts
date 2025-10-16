import { Pool } from 'pg';
import crypto from 'crypto';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function verifySiteAuth(req: any, res: any, next: any) {
  try {
    const siteId = (
      req.body?.siteId ||
      req.headers['x-site-id'] ||
      ''
    ).toString();
    const sig = (req.headers['x-sig'] || '').toString();
    if (!siteId || !sig) return res.status(401).json({ error: 'missing auth' });
    const body = Buffer.from(JSON.stringify(req.body || {}));
    const {
      rows: [s],
    } = await pg.query(`SELECT trust_pubkey FROM sites WHERE id=$1`, [siteId]);
    if (!s) return res.status(403).json({ error: 'unknown site' });
    const v = crypto.createVerify('RSA-SHA256');
    v.update(body);
    v.end();
    if (!v.verify(s.trust_pubkey, Buffer.from(sig, 'base64')))
      return res.status(401).json({ error: 'bad sig' });
    (req as any).siteId = siteId;
    next();
  } catch (e) {
    return res.status(400).json({ error: 'auth failed' });
  }
}
