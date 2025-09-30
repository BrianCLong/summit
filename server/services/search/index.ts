import express from 'express';
import cors from 'cors';
import { policyCheck } from '../../lib/policy/opa';

const app = express(); app.use(cors()); app.use(express.json());

type Result = {
  id: string; type: 'email'|'calendar'|'crm'|'deck'|'timeline'|'intel'|'funding';
  title: string; snippet?: string; ts?: number; score?: number; url?: string; entityId?: string;
  ticker?: string; company?: string;
};

/** Adapters (replace impls) */
async function searchGmail(q:string):Promise<Result[]> { return []; }
async function searchGraph(q:string):Promise<Result[]> { return []; }
async function searchCRM(q:string):Promise<Result[]> { return []; }
async function searchDecks(q:string):Promise<Result[]> { return []; }
async function searchTimeline(q:string):Promise<Result[]> { return []; }
async function searchIntel(q:string):Promise<Result[]> {
  const r = await fetch(`http://intel-aggregator.companyos-core:9100/v1/intel?q=${encodeURIComponent(q)}`);
  const j = await r.json(); return (j.items||[]).map((i:any)=>{
    const type = (i.source === 'news' && /raises|funding|series [a-z0-9]+/i.test(i.title||'')) ? 'funding' : i.type;
    return { id:i.id, type, title:i.title, snippet:i.summary, ts:i.ts, score:i.score, url:i.url, ticker:i.ticker, company:i.company };
  });
}

function rank(items:Result[]):Result[] {
  const now = Date.now();
  return items.map(x=>{
    const rec = x.ts ? Math.exp(- (now - x.ts)/(1000*60*60*24*7)) : 0.5; // 1-week decay
    const base = (x.score ?? 0.3);
    return { ...x, score: base*0.6 + rec*0.4 };
  }).sort((a,b)=>(b.score??0)-(a.score??0));
}

function parseFilters(qRaw:string){
  const parts = qRaw.split(/\s+/);
  const filters:any = {};
  const rest:string[] = [];
  for (const p of parts){
    if (p.startsWith("type:")) filters.type = p.slice(5);
    else if (p.startsWith("ticker:")) filters.ticker = p.slice(7);
    else if (p.startsWith("company:")) filters.company = p.slice(8).replace(/_/g,' ');
    else rest.push(p);
  }
  return { q: rest.join(' ').trim(), filters };
}

app.get('/v1/search', async (req, res) => {
  const parsed = parseFilters((req.query.q as string)||'');
  const { q, filters } = parsed;
  const subject = { roles: req.header('x-roles')?.split(',')||[], webauthn_verified: true };
  const pinned = (req.header('x-pinned')||'').split(',').filter(Boolean);

  const [gmail, graph, crm, decks, timeline, intel] = await Promise.all([
    searchGmail(q), searchGraph(q), searchCRM(q), searchDecks(q), searchTimeline(q), searchIntel(q)
  ]);
  let merged = rank([...gmail,...graph,...crm,...decks,...timeline,...intel]).slice(0, 400);

  // filter by type/ticker/company if provided
  if (filters.type) merged = merged.filter(r => r.type === filters.type);
  if (filters.ticker) merged = merged.filter(r => (r.ticker||'').toLowerCase() === filters.ticker.toLowerCase());
  if (filters.company) merged = merged.filter(r => (r.company||'').toLowerCase().includes(filters.company.toLowerCase()));

  // policy filter per item
  const filtered: Result[] = [];
  for (const r of merged){
    const ok = await policyCheck({
      subject,
      action: 'read',
      resource: { type: r.type==='deck'?'deck': r.type==='email'?'email':'timelineEvent', classification:'internal' },
      context: {}
    });
    if (ok) filtered.push(r);
  }

  // then include pinned results boost:
  merged = filtered.map(r=>{
    const id = `${r.type}:${r.id}`;
    const boost = pinned.includes(id) ? 10 : 0;
    return { ...r, score: (r.score??0) + boost };
  }).sort((a,b)=>(b.score??0)-(a.score??0)).slice(0,200);

  res.json({ results: merged });
});

app.listen(9300, ()=> console.log('search service on :9300'));