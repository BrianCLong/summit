import { defineTask } from '@summit/maestro-sdk';

type Item = { id: string; payload: unknown };
interface In { endpoint?: string; items: Item[] }
export default defineTask<In, { jobId: string; receipts: Array<{ id: string; hash: string }>}> ({
  async execute(ctx, { payload }){
    const endpoint = payload.endpoint ?? await ctx.secrets('SIG_INGEST_URL');
    const res = await fetch(`${endpoint}/ingest/batch`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: payload.items })
    });
    if (!res.ok) throw new Error(`SIG ingest failed ${res.status}`);
    return res.json();
  }
});
