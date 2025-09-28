const express = require('express');
const app = express();
app.use(express.json());

// Admin stubs
const flags = { 'demo-mode': false };
app.get('/admin/tenants', (_req,res)=> res.json({ items:[{id:'default',name:'Default'}] }));
app.get('/admin/users', (_req,res)=> res.json({ items:[{id:'u1',email:'analyst@example.com',role:'analyst'}] }));
app.get('/admin/flags', (_req,res)=> res.json({ flags }));
app.put('/admin/flags/:key', (req,res)=>{ const k=req.params.key; flags[k]=!!req.body?.value; res.json({ ok:true, key:k, value: flags[k] }); });
app.get('/admin/audit', (_req,res)=> res.json({ items:[] }));

// Copilot stubs
app.post('/copilot/classify', (req,res)=>{
  const p = String(req.body?.prompt||'');
  const deny = /enumerate\s+all\s+(emails|phones|ssn|pii)/i.test(p);
  res.json({ ok:true, classification: deny?'unsafe':'safe', reasons: deny?['risky_intent']:[] });
});
app.post('/copilot/cookbook', (_req,res)=>{
  res.json({ ok:true, items:[{ id:'centrality', title:'Centrality for IDs' },{ id:'communities', title:'Communities overview' }] });
});

app.get('/health', (_req,res)=> res.json({ ok:true }));

const port = process.env.PORT||4000;
app.listen(port, ()=> console.log('api-stub on', port));
