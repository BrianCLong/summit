export function tenantAllowlist(
  allowed: string[],
  mode: 'staging' | 'prod' | 'dev' = 'staging',
) {
  const set = new Set(
    (allowed || []).map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  return (req: any, res: any, next: any) => {
    const t = String(req.headers['x-tenant'] || '').toLowerCase();
    if (!t || !set.has(t))
      return res
        .status(403)
        .json({ error: 'tenant_not_allowed', tenant: t, mode });
    next();
  };
}
