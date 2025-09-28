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
  const [schema, setSchema] = useState<{required?:string[],properties?:Record<string,any>}>({});
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(()=>{
    fetch(api + '/ingest/connectors')
      .then(r=>r.json())
      .then(d=>setConnectors(d.items||[]))
      .catch(()=> setStatus('Connectors API not reachable'));
  },[]);

  async function start(){
    setStatus('');
    setErrors([]);
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

  async function onSelectConnector(id:string){
    setSelected(id);
    setStatus(''); setErrors([]); setJobId(''); setProgress(null);
    try{
      const sch = await (await fetch(api + '/ingest/schema/' + id)).json();
      setSchema(sch||{});
      const props = sch?.properties||{};
      const blank:any = {};
      Object.keys(props).forEach(k=> blank[k] = '');
      setConfig(JSON.stringify(blank, null, 2));
    }catch{ setSchema({}); }
  }

  async function dryRun(){
    setErrors([]); setStatus('');
    try{
      const cfg = JSON.parse(config||'{}');
      const res = await fetch(api + '/ingest/dry-run/' + selected, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(cfg) });
      if(res.ok){ setStatus('Dry run passed ✓'); }
      else{
        const d = await res.json();
        setErrors(d.fields||['invalid configuration']);
        setStatus('Dry run failed');
      }
    }catch(e){ setStatus(String(e)); }
  }

  return (
    <div style={{ border:'1px solid #ddd', borderRadius:6, padding:12 }}>
      <strong>Ingest Wizard</strong>
      <div style={{ marginTop:8 }}>
        <label>Connector</label>
        <select value={selected} onChange={e=>onSelectConnector(e.target.value)} style={{ width:'100%', marginTop:4 }}>
          <option value="">Select…</option>
          {connectors.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div style={{ marginTop:8 }}>
        <label>Config (JSON)</label>
        <textarea rows={5} value={config} onChange={e=>setConfig(e.target.value)} style={{ width:'100%', fontFamily:'monospace' }} />
        {schema?.properties && (
          <div style={{ marginTop:8 }}>
            <div style={{ fontWeight:600, marginBottom:6 }}>Form</div>
            {Object.entries(schema.properties).map(([k, meta]: any)=>{
              const cfg = (()=>{ try{ return JSON.parse(config||'{}'); } catch { return {}; } })();
              const val = cfg[k] ?? '';
              const type = meta?.type || 'string';
              const label = meta?.title || k;
              function onChange(v: any){ const next = { ...cfg, [k]: v }; setConfig(JSON.stringify(next, null, 2)); }
              if(type==='boolean') return (
                <div key={k} style={{ marginBottom:6 }}>
                  <label><input type="checkbox" checked={!!val} onChange={e=>onChange(e.target.checked)} /> {label}</label>
                </div>
              );
              return (
                <div key={k} style={{ marginBottom:6 }}>
                  <label>{label}</label>
                  <input style={{ width:'100%' }} type={type==='number'?'number':'text'} value={val} onChange={e=>onChange(type==='number'?Number(e.target.value):e.target.value)} />
                </div>
              );
            })}
          </div>
        )}
        {!!schema?.required?.length && (
          <div style={{ marginTop:6, fontSize:12, color:'#666' }}>Required: {schema.required.join(', ')}</div>
        )}
        {!!errors.length && (
          <div style={{ marginTop:6, fontSize:12, color:'#a00' }}>Missing: {errors.join(', ')}</div>
        )}
      </div>
      <div style={{ marginTop:8 }}>
        <button onClick={dryRun} disabled={!selected}>Dry Run</button>
        <button onClick={start} disabled={!selected} style={{ marginLeft:8 }}>Start Ingest</button>
        {jobId && <button style={{ marginLeft:8 }} onClick={cancel}>Cancel</button>}
        {status && <div style={{ marginTop:6, fontSize:12, color:'#555' }}>{status}</div>}
        {progress && <div style={{ marginTop:6, fontSize:12, color:'#555' }}>Progress: {progress.progress}% ({progress.status})</div>}
      </div>
    </div>
  );
}
