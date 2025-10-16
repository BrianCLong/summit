import fetch from 'node-fetch';

const VAULT_ADDR = process.env.VAULT_ADDR || '';
const VAULT_TOKEN = process.env.VAULT_TOKEN || '';

async function vfetch(path: string, init?: any) {
  const url = `${VAULT_ADDR}${path.startsWith('/v1') ? path : '/v1' + path}`;
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      'X-Vault-Token': VAULT_TOKEN,
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Vault error ${res.status}`);
  return res.json();
}

export async function vaultReadKvV2(path: string): Promise<any> {
  const j = await vfetch(`/v1/${path.startsWith('kv/') ? path : 'kv/' + path}`);
  return j.data?.data ?? j.data;
}

export async function vaultTransitSign(
  key: string,
  base64Input: string,
): Promise<string> {
  const j = await vfetch(`/v1/transit/sign/${key}`, {
    method: 'POST',
    body: JSON.stringify({ input: base64Input }),
  });
  return j.data?.signature;
}

export async function vaultDbCreds(
  role: string,
): Promise<{ username: string; password: string; ttl?: number }> {
  const j = await vfetch(`/v1/database/creds/${role}`);
  return {
    username: j.data?.username,
    password: j.data?.password,
    ttl: j.lease_duration,
  };
}
