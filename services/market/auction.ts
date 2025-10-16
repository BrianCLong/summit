import { createClient } from 'redis';
const r = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
export function vickrey(bids: { id: string; bid: number }[]) {
  const s = bids.slice().sort((a, b) => b.bid - a.bid);
  if (!s.length) return null;
  const win = s[0];
  const price = s[1]?.bid ?? win.bid;
  return { winner: win.id, price };
}
