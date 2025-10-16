export async function loadTenant(req, res, next) {
  const id = String(req.headers['x-tenant-id'] || '');
  if (!id) return res.status(400).json({ error: 'tenant_header_required' });
  req.tenant = await req.db.one('select * from tenants where id=$1', [id]);
  next();
}
