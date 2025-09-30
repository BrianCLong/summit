import express from 'express';
import { upsertTimeline } from '../store/timeline';
import { summarizeAndSync } from '../workers/summarizer';
import { sentiment } from '../workers/sentiment';

export const ingest = express.Router();

ingest.post('/v1/ingest/email', async (req,res)=>{
  const { contactId, thread, messages } = req.body;
  const base = Date.now();
  await upsertTimeline({
    contactId,
    kind: 'email.thread',
    ts: new Date(base).toISOString(),
    payload: thread,
    source: { system:'gmail' }
  });
  for (const m of messages) {
    const s = sentiment(m.text || m.snippet || '');
    await upsertTimeline({
      contactId,
      kind: 'email.message',
      ts: m.date || new Date().toISOString(),
      sentiment: s,
      payload: m,
      source: { system:'gmail', id:m.messageId }
    });
  }
  // Fire-and-forget summary
  summarizeAndSync({ kind:'thread', contactId, refId: thread.threadId }).catch(()=>{});
  res.json({ ok:true });
});

ingest.post('/v1/ingest/calendar', async (req,res)=>{
  const { contactId, event } = req.body;
  await upsertTimeline({
    contactId, kind:'meeting', ts: event.start, payload: event, source:{ system:'google' }
  });
  res.json({ ok:true });
});

ingest.post('/v1/ingest/notes', async (req,res)=>{
  const { contactId, eventId, text, author } = req.body;
  await upsertTimeline({
    contactId, kind:'meeting.notes', ts: new Date().toISOString(),
    payload: { eventId, text, author }, source:{ system:'notes' }
  });
  summarizeAndSync({ kind:'meeting', contactId, refId:eventId }).catch(()=>{});
  res.json({ ok:true });
});

ingest.post('/v1/ingest/call/transcript/chunk', async (req,res)=>{
  const { contactId, callId, chunk } = req.body; // {t0,t1,text}
  const s = sentiment(chunk.text || '');
  await upsertTimeline({
    contactId, kind:'call.transcript.chunk', ts: new Date().toISOString(),
    sentiment: s, payload: { callId, chunk }, source:{ system:'stage' }
  });
  res.json({ ok:true });
});

ingest.post('/v1/ingest/call/transcript/final', async (req,res)=>{
  const { contactId, callId, language, text } = req.body;
  const s = sentiment(text || '');
  await upsertTimeline({
    contactId, kind:'call.transcript.final', ts: new Date().toISOString(),
    sentiment: s, payload: { callId, language, text }, source:{ system:'stage' }
  });
  summarizeAndSync({ kind:'call', contactId, refId: callId }).catch(()=>{});
  res.json({ ok:true });
});

ingest.post('/v1/ingest/present/slides', async (req,res)=>{
  const { contactId, deckId, title, slideCount } = req.body;
  await upsertTimeline({
    contactId, kind:'slides.presented', ts: new Date().toISOString(),
    payload: { deckId, title, slideCount }, source:{ system:'present' }
  });
  res.json({ ok:true });
});

ingest.post('/v1/ingest/present/pointer', async (req,res)=>{
  const { contactId, deckId, slide, x, y, t } = req.body;
  await upsertTimeline({
    contactId, kind:'slides.pointer', ts: new Date().toISOString(),
    payload: { deckId, slide, x, y, t }, source:{ system:'present' }
  });
  res.json({ ok:true });
});