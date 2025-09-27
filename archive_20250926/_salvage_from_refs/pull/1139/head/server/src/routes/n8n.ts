import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import baseLogger from '../config/logger';
import { ProvenanceLedgerService } from '../services/provenance-ledger.js';

const logger = baseLogger.child({ name: 'route:n8n' });
const router = express.Router();

const secret = process.env.N8N_SIGNING_SECRET || '';
const allowedIps = (process.env.N8N_ALLOWED_IPS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function timingSafeEqual(a: string, b: string) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function verifySig(raw: string, sig: string) {
  const mac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return timingSafeEqual(mac, sig || '');
}

// Capture raw body to compute HMAC
function rawJson(req: Request, _res: Response, next: NextFunction) {
  let data = Buffer.alloc(0);
  req.on('data', (c) => (data = Buffer.concat([data, c])));
  req.on('end', () => {
    (req as any).rawBody = data;
    try {
      req.body = JSON.parse(data.toString() || '{}');
    } catch {
      req.body = {};
    }
    next();
  });
}

router.post('/webhooks/n8n', rawJson, async (req: Request, res: Response) => {
  if (!secret) return res.status(503).json({ ok: false, error: 'n8n disabled' });
  if (allowedIps.length && !allowedIps.includes(req.ip)) {
    return res.status(403).json({ ok: false, error: 'ip blocked' });
  }

  const sig = req.header('x-maestro-signature') || '';
  const raw = ((req as any).rawBody as Buffer | undefined)?.toString() || JSON.stringify(req.body || {});
  if (!verifySig(raw, sig)) return res.status(401).json({ ok: false, error: 'bad signature' });

  const provenance = ProvenanceLedgerService.getInstance();
  const { runId, artifact, content, meta } = (req.body || {}) as any;
  if (!runId) return res.status(400).json({ ok: false, error: 'runId required' });

  try {
    await provenance.recordProvenanceEntry({
      operation_type: 'N8N_CALLBACK',
      actor_id: 'n8n',
      metadata: { runId, artifact, meta, len: content ? JSON.stringify(content).length : 0 },
    });
  } catch (e) {
    logger.warn({ err: e }, 'provenance record failed for N8N_CALLBACK');
  }

  return res.json({ ok: true });
});

export default router;

