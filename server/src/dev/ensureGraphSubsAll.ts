// Ensures (and renews) Microsoft Graph subscriptions for all connected MS users.
// Usage: npm run tsnode -- server/src/dev/ensureGraphSubsAll.ts
import { ensureGraphSubscriptions } from '../connectors/graphSubs';
import { listConnectedUsers } from '../store/users';

const NOTIFY_URL = process.env.MS_GRAPH_NOTIFY_URL
  || 'https://your.api/webhooks/graph';

async function main() {
  const users = await listConnectedUsers({ provider: 'microsoft' });
  if (!users.length) {
    console.log('No Microsoft-connected users found.');
    return;
  }
  for (const u of users) {
    try {
      await ensureGraphSubscriptions(u.id, NOTIFY_URL);
      console.log(`[graph] subs ensured for ${u.id}`);
    } catch (e:any) {
      console.error(`[graph] subs failed for ${u.id}:`, e?.message || e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});