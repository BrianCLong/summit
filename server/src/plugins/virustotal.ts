import fetch from 'node-fetch';
import { createPlugin } from './sdk';
import { vaultReadKvV2 } from '../vault/helpers';

type Inputs = { hash: string };
type Output = { data?: any; source: 'virustotal'; fromCache?: boolean };

export const vtHashLookup = createPlugin<Inputs, Output>(
  'virustotal.hash.lookup',
  async (inputs, ctx) => {
    const { hash } = inputs;
    const cacheKey = `vt:hash:${hash}`;
    const cached = await ctx.cache.get(cacheKey);
    if (cached) return { data: cached, source: 'virustotal', fromCache: true };

    const secret = await vaultReadKvV2('kv/data/plugins/virustotal');
    const apiKey =
      secret?.data?.apiKey || secret?.apiKey || process.env.VT_API_KEY;
    if (!apiKey) throw new Error('Missing VirusTotal apiKey');

    const url = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(hash)}`;
    const res = await fetch(url, { headers: { 'x-apikey': apiKey } });
    if (!res.ok) throw new Error(`VirusTotal error ${res.status}`);
    const json = await res.json();
    await ctx.cache.set(cacheKey, json, 3600);
    return { data: json, source: 'virustotal' };
  },
);
