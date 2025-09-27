import { defineTask } from '@summit/maestro-sdk';

type In = { webhook?: string; channel?: string; text: string };
export default defineTask<In, { ok: boolean }> ({
  async execute(ctx, { payload }){
    const url = payload.webhook ?? await ctx.secrets('SLACK_WEBHOOK_URL');
    const res = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ text: payload.text }) });
    return { payload: { ok: res.ok } };
  }
});
