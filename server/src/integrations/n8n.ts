import crypto from 'crypto';
import axios from 'axios';
import baseLogger from '../config/logger';
import { ProvenanceLedgerService } from '../services/provenance-ledger.js';

const logger = baseLogger.child({ name: 'integrations:n8n' });

const base = process.env.N8N_BASE_URL || '';
const secret = process.env.N8N_SIGNING_SECRET || '';

function sign(body: any) {
  const payload = JSON.stringify(body);
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { payload, mac };
}

export async function triggerN8nFlow(
  flowKey: string,
  body: any,
  ctx: { userId?: string; runId?: string },
) {
  if (!base || !secret) throw new Error('n8n missing env');
  const path = `/webhook/${encodeURIComponent(flowKey)}`;
  const payload = { ...body };
  const { payload: json, mac } = sign(payload);

  const provenance = ProvenanceLedgerService.getInstance();
  try {
    await provenance.recordProvenanceEntry({
      operation_type: 'N8N_TRIGGER',
      actor_id: ctx.userId || 'system',
      metadata: { flowKey, runId: ctx.runId, request: body },
    });
  } catch (e) {
    logger.warn({ err: e }, 'provenance record failed for N8N_TRIGGER');
  }

  const res = await axios.post(base + path, json, {
    headers: { 'content-type': 'application/json', 'x-maestro-signature': mac },
    timeout: 15_000,
  });

  try {
    await provenance.recordProvenanceEntry({
      operation_type: 'N8N_TRIGGER_RESULT',
      actor_id: ctx.userId || 'system',
      metadata: {
        flowKey,
        runId: ctx.runId,
        status: res.status,
        data: res.data,
      },
    });
  } catch (e) {
    logger.warn({ err: e }, 'provenance record failed for N8N_TRIGGER_RESULT');
  }

  return { status: res.status, data: res.data };
}

export function n8nIntegrationEnabled() {
  return Boolean(base && secret);
}
