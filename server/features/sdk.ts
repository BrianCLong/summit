import { createClient } from 'redis';
const r = createClient({ url: process.env.REDIS_URL });
export async function getFeatures(userId: string) {
  const clicks = Number((await r.get(`fs:user_recent_clicks:${userId}`)) || 0);
  return { user_recent_clicks: clicks };
}
