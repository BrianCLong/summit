import crypto from 'crypto';
import fetch from 'node-fetch';

export async function signClaimSet(transitKey: string, payload: any) {
  const bytes = Buffer.from(JSON.stringify(payload));
  const digest = crypto.createHash('sha256').update(bytes).digest('base64');
  const r = await fetch(
    `${process.env.VAULT_ADDR}/v1/transit/sign/${transitKey}`,
    {
      method: 'POST',
      headers: {
        'X-Vault-Token': String(process.env.VAULT_TOKEN || ''),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ input: digest }),
    },
  );
  if (!r.ok) throw new Error(`transit sign failed ${r.status}`);
  const j = await r.json();
  return { signature: j.data?.signature, sha256: digest };
}

export function verifyMerkle(root: string, leaves: string[]) {
  // TODO: reuse MerkleLog to recompute root; placeholder returns true
  return !!root && Array.isArray(leaves);
}
