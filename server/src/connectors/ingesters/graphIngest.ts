import { upsertTimeline } from '../../store/timeline';
import { sentiment } from '../../workers/sentiment';

export async function ingestGraphMail(userId:string, m:any){
  const contactId = await resolveContactFromAddress(m.from?.emailAddress?.address);
  const threadId = m.conversationId;
  await upsertTimeline({
    contactId, kind:'email.thread', ts:m.receivedDateTime,
    payload:{ threadId, subject:m.subject, participants:[m.from?.emailAddress?.address, ...(m.toRecipients||[]).map((r:any)=>r.emailAddress.address)] },
    source:{ system:'graph', id:threadId }
  });
  await upsertTimeline({
    contactId, kind:'email.message', ts:m.receivedDateTime,
    sentiment: sentiment(m.bodyPreview || ''),
    payload:{ threadId, messageId:m.id, from:m.from?.emailAddress?.address, to:(m.toRecipients||[]).map((r:any)=>r.emailAddress.address), subject:m.subject, text:m.bodyPreview },
    source:{ system:'graph', id:m.id }
  });
}

export async function ingestGraphEvent(userId:string, e:any){
  const contactId = await resolvePrimaryContactFromEvent(e);
  await upsertTimeline({
    contactId, kind:'meeting', ts:e.start?.dateTime,
    payload:{ provider:'microsoft', eventId:e.id, title:e.subject, start:e.start?.dateTime, end:e.end?.dateTime, attendees:(e.attendees||[]).map((a:any)=>a.emailAddress.address) },
    source:{ system:'graph', id:e.id }
  });
}
async function resolveContactFromAddress(_a?:string){ return 'contact:demo'; }
async function resolvePrimaryContactFromEvent(_e:any){ return 'contact:demo'; }