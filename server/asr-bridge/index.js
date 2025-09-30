// Minimal bridge: accepts {audioBase64, sampleRate} and forwards WAV bytes to upstream whisper-asr.
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json({ limit: '25mb' }));

const UPSTREAM = process.env.UPSTREAM_URL || 'http://localhost:9001';

let reqCount = 0;
const start = process.hrtime.bigint();

app.get('/healthz', (_req,res)=>res.json({ ok:true }));
app.get('/metrics', (_req,res)=>{
  const up = Number(process.hrtime.bigint() - start) / 1e9;
  res.type('text/plain').send(
    `asr_bridge_requests_total ${reqCount}\n` +
    `asr_bridge_uptime_seconds ${up}\n`
  );
});

app.post('/transcribe', async (req, res) => {
  reqCount++;
  try {
    const { audioBase64, sampleRate = 16000 } = req.body || {};
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 required' });
    const wavBytes = Buffer.from(audioBase64, 'base64');

    // upstream expects multipart/form-data or raw; we use multipart
    const form = new FormData();
    form.append('audio_file', new Blob([wavBytes], { type: 'audio/wav' }), 'audio.wav');
    form.append('task', 'transcribe');
    form.append('language', 'en');
    const r = await fetch(`${UPSTREAM}/asr`, { method: 'POST', body: form });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'upstream error', detail: t });
    }
    const data = await r.json(); // { text, segments: [{start, end, text}] }
    const segments = (data?.segments || []).map(s => ({
      t0: s.start, t1: s.end, text: s.text
    }));
    res.json({ text: data?.text || '', segments });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'bridge failure' });
  }
});

app.listen(9000, () => {
  console.log('ASR bridge listening on :9000 ->', UPSTREAM);
});
