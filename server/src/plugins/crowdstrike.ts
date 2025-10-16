import fetch from 'node-fetch';
import { createPlugin } from './sdk';
import { vaultReadKvV2 } from '../vault/helpers';

type Inputs = { query: string };
type Output = { data?: any; source: 'crowdstrike'; fromCache?: boolean };

async function getToken(): Promise<string> {
  const secret = await vaultReadKvV2('kv/data/plugins/crowdstrike');
  const clientId =
    secret?.data?.clientId || secret?.clientId || process.env.CS_CLIENT_ID;
  const clientSecret =
    secret?.data?.clientSecret ||
    secret?.clientSecret ||
    process.env.CS_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error('Missing CrowdStrike credentials');
  const res = await fetch('https://api.crowdstrike.com/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
  });
  if (!res.ok) throw new Error(`CrowdStrike token error ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

export const csQuery = createPlugin<Inputs, Output>(
  'crowdstrike.query',
  async (inputs, ctx) => {
    const { query } = inputs;
    const cacheKey = `cs:q:${Buffer.from(query).toString('base64url')}`;
    const cached = await ctx.cache.get(cacheKey);
    if (cached) return { data: cached, source: 'crowdstrike', fromCache: true };

    const token = await getToken();
    const url = `https://api.crowdstrike.com/intel/queries/indicators/v1?${new URLSearchParams({ filter: query })}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`CrowdStrike error ${res.status}`);
    const json = await res.json();
    await ctx.cache.set(cacheKey, json, 600);
    return { data: json, source: 'crowdstrike' };
  },
);
