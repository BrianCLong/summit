import { createClient } from 'redis';
import { pubsub } from '../graphql/resolvers/alerts';

export async function startRedisBridge() {
  const r = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  await r.connect();
  const sub = r.duplicate(); await sub.connect();
  await sub.subscribe('alerts:*', (msg, ch) => {
    try {
      const a = JSON.parse(msg);
      const caseId = a.caseId || 'auto';
      pubsub.publish(`ALERT:${caseId}`, { alertStream: a });
    } catch (e) {
      console.error("Error in Redis bridge:", e);
    }
  });
}
