export function audit(req, res, next){
  const start = Date.now();
  res.on('finish', () => {
    const rec = {
      ts: new Date().toISOString(),
      user: req.user?.id,
      path: req.path,
      method: req.method,
      status: res.statusCode,
      reason: (req as any).reason || null,
      ip: req.ip
    };
    console.log(JSON.stringify({ audit: rec }));
  });
  next();
}