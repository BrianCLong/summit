import { redact } from '../privacy/redact';
export function privacyLogger(req: any, res: any, next: any) {
  const old = res.json;
  res.json = function (body: any) {
    try {
      body = redact(JSON.parse(JSON.stringify(body)));
    } catch {}
    return old.call(this, body);
  };
  next();
}
export function egressGuard(req: any, res: any, next: any) {
  if (/export|download/.test(req.path) && req.query.includePII === 'true')
    return res.status(403).json({ error: 'PII export blocked' });
  next();
}
