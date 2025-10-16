import fetch from 'node-fetch';
import crypto from 'crypto';
import { handleExecStep } from './exec';

const HUB = process.env.HUB_URL!;

function signBody(body: string, pem: string) {
  const s = crypto.createSign('RSA-SHA256');
  s.update(Buffer.from(body));
  s.end();
  return s.sign(pem, 'base64');
}

export async function longPoll(siteId: string, privPem: string) {
  let backoff = 1000;
  while (true) {
    const body = JSON.stringify({ siteId, max: 50 });
    const sig = signBody(body, privPem);
    try {
      const r = await fetch(`${HUB}/api/relay/poll`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-sig': sig,
          'x-site-id': siteId,
        },
        body,
      });
      const j: any = await r.json();
      if (Array.isArray(j.msgs) && j.msgs.length) {
        for (const m of j.msgs) {
          if (m.kind === 'exec.step') await handleExecStep(m);
        }
        await ack(
          siteId,
          privPem,
          j.msgs.map((x: any) => x.dbId),
        );
        backoff = 1000;
      } else {
        backoff = Math.min(backoff * 2, 15 * 60 * 1000);
      }
    } catch {}
    await new Promise((res) =>
      setTimeout(res, backoff * (0.7 + Math.random() * 0.3)),
    );
  }
}

async function ack(siteId: string, privPem: string, dbIds: number[]) {
  if (!dbIds?.length) return;
  const body = JSON.stringify({ siteId, dbIds });
  const sig = signBody(body, privPem);
  await fetch(`${HUB}/api/relay/ack`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sig': sig,
      'x-site-id': siteId,
    },
    body,
  });
}
