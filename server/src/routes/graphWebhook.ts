import express from 'express';
import { ensureFresh, getIdentityTokens } from '../store/identity';
import { graphClient } from '../connectors/microsoft';
import { ingestGraphMail, ingestGraphEvent } from '../connectors/ingesters/graphIngest';

export const graphWebhook = express.Router();

// Graph validation handshake
graphWebhook.get('/webhooks/graph', (req,res)=>{
  const validationToken = req.query.validationToken as string;
  if (validationToken) return res.status(200).send(validationToken);
  res.sendStatus(400);
});

graphWebhook.post('/webhooks/graph', async (req,res)=>{
  // Accept immediately
  res.sendStatus(202);
  const notifications = req.body.value || [];
  for (const n of notifications) {
    const userId = await mapResourceToUser(n.resource);
    await ensureFresh('microsoft', userId);
    const { access_token } = await getIdentityTokens('microsoft', userId);
    const client = graphClient(access_token);
    if (n.resource?.includes('/messages/')) {
      const m = await client.api(n.resource).get();
      await ingestGraphMail(userId, m);
    } else if (n.resource?.includes('/events/')) {
      const e = await client.api(n.resource).get();
      await ingestGraphEvent(userId, e);
    }
  }
});
async function mapResourceToUser(_res:string){ return 'demo-user'; }