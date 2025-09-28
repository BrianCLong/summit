import React, { useEffect, useState } from 'react';

type Connector = { id: string; name: string };

export default function IngestWizard(){
  const api = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [config, setConfig] = useState<string>('{}');
  const [status, setStatus] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [progress, setProgress] = useState<{status:string,progress:number}|null>(null);

  useEffect(()=>{
    fetch(api + '/ingest/connectors')
      .then(r=>r.json())
      .then(d=>setConnectors(d.items||[]))
      .catch(()=> setStatus('Connectors API not reachable'));
  },[]);

  async function start(){
    setStatus('');
    try{
      const body = { connector: selected, config: JSON.parse(config||'{}') };
      const res = await fetch(api + '/ingest/start', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if(data.job_id){ setStatus('Started job ' + data.job_id); setJobId(data.job_id); poll(data.job_id); }
      else setStatus('Failed to start');
    }catch(e){ setStatus(String(e)); }
  }

  async function poll(id:string){
    let active = true;
    const tick = async ()=>{
      if(!active) return;
      try{
        const d = await (await fetch(api + '/ingest/progress/' + id)).json();
        setProgress({ status: d.status, progress: d.progress });
        if(d.status === 'completed' || d.status === 'failed') return;
      }catch{}
      setTimeout(tick, 1000);
    };
    tick();
    return ()=>{ active = false; };
  }

  async function cancel(){
    if(!jobId) return;
    try{ await fetch(api + '/ingest/cancel/' + jobId, { method:'POST' }); setStatus('Canceled job ' + jobId); setJobId(''); setProgress(null); }
    catch(e){ setStatus(String(e)); }
  }

  return (
    <div style={{ border:'1px solid #ddd', borderRadius:6, padding:12 }}>
      <strong>Ingest Wizard</strong>
      <div style={{ marginTop:8 }}>
        <label>Connector</label>
        <select value={selected} onChange={e=>setSelected(e.target.value)} style={{ width:'100%', marginTop:4 }}>
          <option value="">Select…</option>
          {connectors.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div style={{ marginTop:8 }}>
        <label>Config (JSON)</label>
        <textarea rows={5} value={config} onChange={e=>setConfig(e.target.value)} style={{ width:'100%', fontFamily:'monospace' }} />
      </div>
      <div style={{ marginTop:8 }}>
        <button onClick={start} disabled={!selected}>Start Ingest</button>
        {jobId && <button style={{ marginLeft:8 }} onClick={cancel}>Cancel</button>}
        {status && <div style={{ marginTop:6, fontSize:12, color:'#555' }}>{status}</div>}
        {progress && <div style={{ marginTop:6, fontSize:12, color:'#555' }}>Progress: {progress.progress}% ({progress.status})</div>}
      </div>
    </div>
  );
}
