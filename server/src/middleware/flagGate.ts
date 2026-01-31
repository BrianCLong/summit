import { getFlag } from '../flags/store';
export function gate(key: string) {
  return (req: any, res: any, next: any) => {
    const allowed = getFlag(key, {
      residency: req.headers['x-residency'],
      tenant: req.headers['x-tenant'],
    });
    if (!allowed) return res.status(403).json({ error: 'flag disabled' });
    next();
  };
}
