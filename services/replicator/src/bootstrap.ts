import { pullFrom } from './pull';
import { setLag } from './metrics';

const peers = (() => { try { return JSON.parse(process.env.REGION_PEERS_JSON || '{}'); } catch { return {}; } })() as Record<string, string>;
const interval = Number(process.env.REPLICATION_PULL_INTERVAL || '5000');

export function startReplicator() {
  for (const [peer, base] of Object.entries(peers)) {
    setInterval(async () => {
      const t0 = Date.now();
      try {
        await pullFrom(peer, `${base}/api/replicate`);
      } catch (e) {
        // log error if desired
      } finally {
        setLag(peer, (Date.now() - t0) / 1000);
      }
    }, interval);
  }
}

