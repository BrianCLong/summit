import fetch from 'node-fetch';
import { parse, getOperationAST } from 'graphql';
import { authzDeniesTotal, opaEvalMs } from '../../monitoring/metrics.js';
import { auditLogService } from '../../services/AuditLogService.js';

const OPA_URL = process.env.OPA_URL || 'http://localhost:8181/v1/data/graphql/allow';

export default async function opaAuthz(req: any, res: any, next: any) {
  if (req.method !== 'POST') return next();
  const start = Date.now();

  let operationName: string | undefined;
  let operationType: string | undefined;
  try {
    const body = req.body || {};
    if (body.query) {
      const doc = parse(body.query);
      const op = getOperationAST(doc, body.operationName || undefined);
      operationType = op?.operation;
      operationName = body.operationName || op?.name?.value;
    }
  } catch {
    // ignore parse errors, will be handled by GraphQL later
  }

  const jwt = (req as any).user || {};
  const tenantId = jwt.tenantId || req.headers['x-tenant-id'] || null;

  if (jwt.tenantId && tenantId && jwt.tenantId !== tenantId) {
    authzDeniesTotal.inc();
    await auditLogService.logEvent({
      userId: jwt.id || jwt.sub || null,
      tenantId: tenantId,
      action: operationType || req.method,
      resource: operationName || req.path,
      details: { reason: 'tenant_mismatch' },
    });
    opaEvalMs.observe(Date.now() - start);
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (jwt.role === 'analyst' && operationType && operationType !== 'query') {
    authzDeniesTotal.inc();
    await auditLogService.logEvent({
      userId: jwt.id || jwt.sub || null,
      tenantId,
      action: operationType,
      resource: operationName || req.path,
      details: { reason: 'analyst_read_only' },
    });
    opaEvalMs.observe(Date.now() - start);
    return res.status(403).json({ error: 'Forbidden' });
  }

  const input = {
    method: req.method,
    path: req.path,
    query: { operationName, type: operationType },
    jwt: { claims: jwt },
    context: { tenantId },
  };

  try {
    const resp = await fetch(OPA_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = await resp.json();
    opaEvalMs.observe(Date.now() - start);
    if (!data.result?.allow) {
      authzDeniesTotal.inc();
      await auditLogService.logEvent({
        userId: jwt.id || jwt.sub || null,
        tenantId,
        action: operationType || req.method,
        resource: operationName || req.path,
        details: data.result,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  } catch (err) {
    opaEvalMs.observe(Date.now() - start);
    if (operationType === 'query' && jwt.tenantId === tenantId) {
      return next();
    }
    authzDeniesTotal.inc();
    await auditLogService.logEvent({
      userId: jwt.id || jwt.sub || null,
      tenantId,
      action: operationType || req.method,
      resource: operationName || req.path,
      details: { error: 'opa_unreachable' },
    });
    return res.status(403).json({ error: 'Forbidden' });
  }
}
