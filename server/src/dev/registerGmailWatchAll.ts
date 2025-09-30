// Registers Gmail push watches (Pub/Sub) for every connected Google user.
// Usage: npm run tsnode -- server/src/dev/registerGmailWatchAll.ts
import { registerGmailWatch } from '../connectors/gmailPush';
import { listConnectedUsers } from '../store/users';

async function main() {
  const users = await listConnectedUsers({ provider: 'google' });
  if (!users.length) {
    console.log('No Google-connected users found.');
    return;
  }
  for (const u of users) {
    try {
      await registerGmailWatch(u.id);
      console.log(`[gmail] watch registered for ${u.id}`);
    } catch (e:any) {
      console.error(`[gmail] watch failed for ${u.id}:`, e?.message || e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});