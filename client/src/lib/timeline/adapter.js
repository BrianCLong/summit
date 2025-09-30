import { signedFetch } from '../auth/signer';
const API = import.meta.env.VITE_COMPANYOS_API;

export async function fetchTimeline(contactId, { after, limit=100 }={}) {
  const u = new URL(`${API}/v1/timeline`);
  u.searchParams.set('contactId', contactId);
  if (after) u.searchParams.set('after', after);
  u.searchParams.set('limit', String(limit));
  const r = await signedFetch(u.toString());
  if (!r.ok) throw new Error('timeline fetch failed');
  return r.json(); // { items: TimelineEvent[] }
}