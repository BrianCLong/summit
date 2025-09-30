import { google } from 'googleapis';
import { PubSub } from '@google-cloud/pubsub';
import { ensureFresh, getIdentityTokens } from '../store/identity';
import { ingestGmailThread } from './ingesters/gmailIngest';

export async function registerGmailWatch(userId:string){
  // set up a Gmail watch to Pub/Sub topic
  await ensureFresh('google', userId);
  const { access_token } = await getIdentityTokens('google', userId);
  const auth = new google.auth.OAuth2(); auth.setCredentials({ access_token });
  const gmail = google.gmail({ version:'v1', auth });
  await gmail.users.watch({
    userId:'me',
    requestBody:{
      topicName:`projects/${process.env.GOOGLE_PROJECT_ID}/topics/${process.env.GOOGLE_PUBSUB_TOPIC}`,
      labelIds:['INBOX'],
      labelFilterAction:'include'
    }
  });
}

export async function startGmailSubscriptionServer(app:any){
  const subName = process.env.GOOGLE_PUBSUB_SUBSCRIPTION!;
  const pubsub = new PubSub({ projectId: process.env.GOOGLE_PROJECT_ID });
  const sub = pubsub.subscription(subName);
  sub.on('message', async (m)=>{
    try{
      const data = JSON.parse(Buffer.from(m.data, 'base64').toString('utf8'));
      // data.emailAddress, data.historyId
      // Lookup which user this emailAddress belongs to in your DB
      const userId = await mapEmailToUserId(data.emailAddress);
      await replayGmailHistory(userId, data.historyId);
      m.ack();
    }catch(e){ console.error('gmail push err', e); m.nack(); }
  });
  sub.on('error',(e)=> console.error('pubsub error',e));
}

async function replayGmailHistory(userId:string, historyId:string){
  await ensureFresh('google', userId);
  const { access_token } = await getIdentityTokens('google', userId);
  const auth = new google.auth.OAuth2(); auth.setCredentials({ access_token });
  const gmail = google.gmail({ version:'v1', auth });

  let pageToken: string|undefined = undefined;
  do {
    const r = await gmail.users.history.list({ userId:'me', startHistoryId: historyId, pageToken, historyTypes:['messageAdded']});
    const history = r.data.history || [];
    for (const h of history) {
      for (const ma of (h.messagesAdded||[])) {
        const msg = await gmail.users.messages.get({userId:'me', id: ma.message!.id! , format:'full'});
        await ingestGmailThread(userId, msg.data); // parse, normalize, call /v1/ingest/email
      }
    }
    pageToken = r.data.nextPageToken || undefined;
  } while(pageToken);
}

// Placeholder: resolve email -> user
async function mapEmailToUserId(email:string){ return 'demo-user'; }