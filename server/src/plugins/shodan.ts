import fetch from 'node-fetch';
import { createPlugin } from './sdk';
import { vaultReadKvV2 } from '../vault/helpers';

type Inputs = { ip: string };
type Output = { data?: any; source: 'shodan'; fromCache?: boolean };

export const shodanIpLookup = createPlugin<Inputs, Output>(
  'shodan.ip.lookup',
  async (inputs, ctx) => {
    const { ip } = inputs;
    const cacheKey = `shodan:ip:${ip}`;
    const cached = await ctx.cache.get(cacheKey);
    if (cached) return { data: cached, source: 'shodan', fromCache: true };

    const secret = await vaultReadKvV2('kv/data/plugins/shodan');
    const apiKey =
      secret?.data?.apiKey || secret?.apiKey || process.env.SHODAN_API_KEY;
    if (!apiKey) throw new Error('Missing Shodan apiKey');

    const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Shodan error ${res.status}`);
    const json = await res.json();
    await ctx.cache.set(cacheKey, json, 3600);
    return { data: json, source: 'shodan' };
  },
);
