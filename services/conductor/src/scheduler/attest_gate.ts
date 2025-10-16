import fetch from 'node-fetch';
export async function requireAttested(pool: any, classification: string) {
  if (!classification || classification === 'public') return true;
  if (!pool.tags?.includes('TEE')) return false;
  const r = await fetch(process.env.ATTEST_URL! + '/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      nodeId: pool.id,
      provider: pool.tags.includes('SNP') ? 'SNP' : 'TDX',
      reportB64: pool.attestReport,
    }),
  });
  const j = await r.json();
  return !!j.ok;
}
