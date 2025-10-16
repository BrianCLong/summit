import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fetchAndVerify } from '../../../clients/cos-policy-fetcher/src/index';
import { putPolicy, putData } from './opaApi';

const PACK_URL = process.env.MC_POLICY_PACK_URL!; // e.g., http://mc/v1/policy/packs/policy-pack-v0
const POLL_INTERVAL_MS = Number(process.env.POLICY_POLL_INTERVAL_MS ?? 15000);

let lastDigest = '';

async function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function hotReloadLoop(signal?: AbortSignal) {
   
  while (!signal?.aborted) {
    try {
      const dir = await fetchAndVerify({ url: PACK_URL });
      const rego = await fs.readFile(path.join(dir, 'opa', 'cos.abac.rego'));
      const retention = await fs.readFile(
        path.join(dir, 'data', 'retention.json'),
      );
      const purposes = await fs.readFile(
        path.join(dir, 'data', 'purpose-tags.json'),
      );
      const dig = await sha256(Buffer.concat([rego, retention, purposes]));
      if (dig !== lastDigest) {
        await putPolicy(rego.toString('utf8'), 'cos.abac');
        await putData('cos/retention', JSON.parse(retention.toString('utf8')));
        await putData(
          'cos/purpose_tags',
          JSON.parse(purposes.toString('utf8')),
        );
        lastDigest = dig;
        console.log('[policy] hot-reloaded pack digest', dig.slice(0, 12));
      }
    } catch (e) {
      console.warn('[policy] reload error:', (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}
