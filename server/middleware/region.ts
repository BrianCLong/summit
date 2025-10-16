export function requireRegion(req, res, next) {
  const region = req.headers['x-region'] || process.env.DEFAULT_REGION;
  if (region !== req.tenant.region)
    return res.status(451).json({ error: 'wrong_region' });
  next();
}
