import { upsertTimeline } from '../../store/timeline';
import { sentiment } from '../../workers/sentiment';

export async function ingestGmailThread(userId:string, msg:any){
  const threadId = msg.threadId;
  const subject = (msg.payload.headers||[]).find((h:any)=>h.name==='Subject')?.value || '(no subject)';
  const from = (msg.payload.headers||[]).find((h:any)=>h.name==='From')?.value;
  const to = (msg.payload.headers||[]).find((h:any)=>h.name==='To')?.value;
  const text = extractPlainText(msg.payload);
  const contactId = await resolveContactFromAddress(from);

  await upsertTimeline({
    contactId, kind:'email.thread', ts: new Date(Number(msg.internalDate)).toISOString(),
    payload:{ threadId, subject, participants:[from,to].filter(Boolean) }, source:{ system:'gmail', id:threadId }
  });
  await upsertTimeline({
    contactId, kind:'email.message', ts: new Date(Number(msg.internalDate)).toISOString(),
    sentiment: sentiment(text||''),
    payload:{ threadId, messageId: msg.id, from, to, subject, text }, source:{ system:'gmail', id:msg.id }
  });
}

function extractPlainText(payload:any):string{
  if(payload.mimeType==='text/plain' && payload.body?.data){
    return Buffer.from(payload.body.data,'base64').toString('utf8');
  }
  const parts = payload.parts || [];
  for(const p of parts){
    if(p.mimeType==='text/plain' && p.body?.data){
      return Buffer.from(p.body.data,'base64').toString('utf8');
    }
  }
  return '';
}
async function resolveContactFromAddress(addr?:string){ /* map email to contactId */ return 'contact:demo'; }