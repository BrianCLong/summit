import express from 'express';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { upsertTimeline } from '../store/timeline';
import { sentiment } from '../workers/sentiment';
import { diarizeSegments } from '../workers/diarization';

export const asr = express.Router();

// POST /v1/asr/chunk  { contactId, callId, audioBase64, sampleRate }
asr.post('/v1/asr/chunk', async (req,res)=>{
  const { contactId, callId, audioBase64, sampleRate } = req.body;
  // send to Whisper server
  const r = await fetch(process.env.WHISPER_SERVER!, { method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ audioBase64, sampleRate, return_segments:true })});
  const data = await r.json(); // { text, segments:[{t0,t1,text}] }

  const diarized = await diarizeSegments(data.segments); // [{t0,t1,text,speaker:'A'|'B'}]
  for (const seg of diarized) {
    const s = sentiment(seg.text || '');
    await upsertTimeline({
      contactId, kind:'call.transcript.chunk', ts: new Date().toISOString(),
      sentiment: s, payload:{ callId, chunk: seg, speaker: seg.speaker },
      source:{ system:'stage' }
    });
  }
  res.json({ ok:true, segments: diarized });
});

// POST /v1/asr/final   { contactId, callId, fullText }
asr.post('/v1/asr/final', async (req,res)=>{
  const { contactId, callId, fullText } = req.body;
  const s = sentiment(fullText || '');
  await upsertTimeline({
    contactId, kind:'call.transcript.final', ts:new Date().toISOString(),
    sentiment: s, payload:{ callId, language:'en', text: fullText }, source:{ system:'stage' }
  });
  res.json({ ok:true });
});