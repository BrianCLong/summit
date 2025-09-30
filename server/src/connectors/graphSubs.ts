import { graphClient } from './microsoft';
import { ensureFresh, getIdentityTokens } from '../store/identity';
import { ingestGraphMail, ingestGraphEvent } from './ingesters/graphIngest';

// Create subscriptions (24h TTL; renew in a cron)
export async function ensureGraphSubscriptions(userId:string, notificationUrl:string){
  await ensureFresh('microsoft', userId);
  const { access_token } = await getIdentityTokens('microsoft', userId);
  const client = graphClient(access_token);
  // Inbox messages
  await client.api('/subscriptions').post({
    changeType: 'created,updated',
    notificationUrl,
    resource: "/me/mailFolders('inbox')/messages",
    expirationDateTime: new Date(Date.now()+23*3600*1000).toISOString(),
    clientState: 'secure-opaque'
  });
  // Calendar events
  await client.api('/subscriptions').post({
    changeType: 'created,updated',
    notificationUrl,
    resource: "/me/events",
    expirationDateTime: new Date(Date.now()+23*3600*1000).toISOString(),
    clientState: 'secure-opaque'
  });
}

// Webhook receiver
// server/src/routes/graphWebhook.ts