import fetch from 'node-fetch';
import crypto from 'crypto';
import { putCAS } from '../cas/store';
import { wasSeen, markSeen } from './seen';

type ExecPayload = {
  runId: string;
  stepId: string;
  snapshotRef: string;
  args: any;
};

export async function handleExecStep(msg: {
  id: string;
  payload: ExecPayload;
}) {
  const ticketId = msg.id;
  if (wasSeen(ticketId)) return { idempotent: true } as const;
  if (!msg.payload?.snapshotRef?.startsWith('sha256:'))
    throw new Error('bad snapshotRef');

  const artifact = Buffer.from(
    JSON.stringify({
      ok: true,
      runId: msg.payload.runId,
      stepId: msg.payload.stepId,
      ts: new Date().toISOString(),
    }),
  );

  const { digest } = await putCAS(artifact);

  const body = {
    siteId: process.env.SITE_ID,
    ticketId,
    artifacts: [digest],
    metrics: { bytes: artifact.length },
  };
  const sig = sign(
    JSON.stringify(body),
    String(process.env.SITE_PRIVATE_KEY || ''),
  );
  await fetch(`${process.env.HUB_URL}/api/relay/push`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-site-id': String(process.env.SITE_ID || ''),
      'x-sig': sig,
    },
    body: JSON.stringify(body),
  });

  markSeen(ticketId);
  return { ok: true, artifacts: [digest] } as const;
}

function sign(body: string, pem: string) {
  const s = crypto.createSign('RSA-SHA256');
  s.update(Buffer.from(body));
  s.end();
  try {
    return s.sign(pem, 'base64');
  } catch {
    return '';
  }
}
