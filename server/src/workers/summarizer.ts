import { buildSummary } from './summarize';
import { adaptSummary } from './summaryProfiles';
import { redactByPolicy } from '../policy/redaction';
import { pushSummaryToCRM } from '../crm/adapter';
import { upsertTimeline, getThread, getMeeting, getCallFinal } from '../store/timeline';
import { evaluateDealNudges } from './dealNudges';

export async function summarizeAndSync({ kind, contactId, refId, profile='exec', policy={classification:'internal'} as any }:{
  kind:'thread'|'meeting'|'call', contactId:string, refId:string, profile?:'exec'|'support'|'account', policy?:any
}) {
  const source = await materializeSource(kind, contactId, refId);
  const base = await buildSummary(kind, source);
  const adapted = adaptSummary(profile, base);
  const redacted = redactByPolicy(adapted, policy);
  await upsertTimeline({
    contactId, kind:'summary', ts:new Date().toISOString(),
    payload:{ of: kind, refId, profile, policy, ...redacted }, source:{ system:'summarizer' }
  });
  await pushSummaryToCRM({ contactId, scope: kind, refId, summary: redacted });

  const nudges = await evaluateDealNudges({ contactId, summary: redacted });
  if (nudges.length) {
    await upsertTimeline({ contactId, kind:'task', ts:new Date().toISOString(), payload:{ nudges }, source:{ system:'summarizer' }});
  }
}

async function materializeSource(kind:string, contactId:string, refId:string){
  // stitch from store: thread|meeting|call final
  // (implement or reuse helpers)
  return {};
}