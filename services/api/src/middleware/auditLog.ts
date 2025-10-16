import type { Request } from 'express';

type AuditRec = {
  ts: string;
  user?: any;
  action: string;
  details?: any;
  ip?: string;
};
const events: AuditRec[] = [];

export function auditLog(req: Request, action: string, details?: any) {
  events.push({
    ts: new Date().toISOString(),
    user: (req as any).user,
    action,
    details,
    ip: req.ip,
  });
  if (events.length > 1000) events.shift();
}

export function getAuditEvents(limit = 200) {
  return events.slice(-limit).reverse();
}
