import { defineConnector, type RunContext } from ' @summit/maestro-sdk';

type Item = { id: string; payload: unknown };

export default defineConnector<Item[], { jobId: string; receipts: Array<{ id: string; hash: string }>}> ({
  async send(ctx: RunContext, items: Item[]) {
    const endpoint = await ctx.secrets('SIG_INGEST_URL');
    const res = await fetch(`${endpoint}/ingest/batch`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error(`SIG ingest failed ${res.status}`);
    return res.json();
  }
});
