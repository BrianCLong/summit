#!/usr/bin/env node
const fetch = (...args)=>import('node-fetch').then(({default:fetch})=>fetch(...args));

const API = process.env.API_URL || 'http://localhost:4000';

async function main(){
  try{
    const c = await (await fetch(`${API}/cases`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ title: 'Supply Route Anomaly' })})).json();
    const cid = c.case.id;
    await fetch(`${API}/cases/${cid}/approve`, { method:'POST' });
    await fetch(`${API}/evidence/EV1/annotations`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ range:'p1-5', note:'Invoice mismatch' })});
    const s = await (await fetch(`${API}/triage/suggestions`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ type:'link', data:{ a:'A1', b:'A2' } })})).json();
    const sid = s.suggestion.id;
    await fetch(`${API}/triage/suggestions/${sid}/approve`, { method:'POST' });
    await fetch(`${API}/triage/suggestions/${sid}/materialize`, { method:'POST' });
    console.log('Seeded demo case/evidence/triage');
  }catch(e){ console.error(e); process.exit(1); }
}
main();
