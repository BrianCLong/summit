// Browser mic → PCM WAV chunks → POST /v1/asr/chunk
export function startStageCapture({ contactId, callId, onError }) {
  let mediaStream, audioCtx, processor, source;
  let stopped = false;

  const wavHeader = (sampleRate, numFrames) => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    const writeString = (v,o) => v.split('').forEach((c,i)=>view.setUint8(o+i,c.charCodeAt(0)));
    const set16 = (o,v)=>view.setUint16(o,v,true);
    const set32 = (o,v)=>view.setUint32(o,v,true);
    writeString('RIFF',0); set32(4,36+numFrames*2); writeString('WAVE',8);
    writeString('fmt ',12); set32(16,16); set16(20,1); set16(22,1);
    set32(24,sampleRate); set32(28,sampleRate*2); set16(32,2); set16(34,16);
    writeString('data',36); set32(40,numFrames*2);
    return buffer;
  };

  const floatToPCM16 = (buf) => {
    const out = new Int16Array(buf.length);
    for (let i=0;i<buf.length;i++){
      let s = Math.max(-1, Math.min(1, buf[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  };

  const sendChunk = async (pcm16, sampleRate) => {
    const header = wavHeader(sampleRate, pcm16.length);
    const wav = new Uint8Array(44 + pcm16.length*2);
    wav.set(new Uint8Array(header), 0);
    wav.set(new Uint8Array(pcm16.buffer), 44);
    const b64 = btoa(String.fromCharCode(...wav));
    await fetch('/v1/asr/chunk', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ contactId, callId, audioBase64: b64, sampleRate })
    });
  };

  const init = async () => {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    source = audioCtx.createMediaStreamSource(mediaStream);
    processor = audioCtx.createScriptProcessor(4096, 1, 1);

    const chunk = [];
    processor.onaudioprocess = async (e) => {
      if (stopped) return;
      const input = e.inputBuffer.getChannelData(0);
      chunk.push(new Float32Array(input));
      // ~0.5s chunks @16kHz ≈ 8000 frames
      const frames = chunk.reduce((a,c)=>a+c.length,0);
      if (frames >= 8000) {
        const buf = new Float32Array(frames);
        let o=0; for (const c of chunk){ buf.set(c,o); o+=c.length; }n        chunk.length = 0;
        const pcm16 = floatToPCM16(buf);
        try { await sendChunk(pcm16, audioCtx.sampleRate); }
        catch (err){ onError?.(err); }
      }
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  };

  init().catch(err => onError?.(err));

  return () => {
    stopped = true;
    try {
      processor?.disconnect();
      source?.disconnect();
      mediaStream?.getTracks().forEach(t=>t.stop());
      audioCtx?.close();
    } catch {}
  };
}