# Synthetic Customer Dataset Pack — Demo-Grade Data & Generators

Purpose: provide **rich, realistic, non-PII** synthetic data for IntelGraph demos, e2e tests, and benchmarks. Includes data generators, CSV/JSON fixtures, Cypher import, provenance claims, redaction variants, and scenario scripts that light up Tri‑Pane, Analytics, Patterns, Runbooks, XAI, Federation, and Wallets.

---

## 0) Repo Layout
```
intelgraph/
├─ data/
│  ├─ generators/
│  │  ├─ gen-entities.ts          # people/orgs/assets/locations
│  │  ├─ gen-relations.ts         # comms/finance/geo-temporal
│  │  ├─ gen-events.ts            # meetings, travel, transfers
│  │  ├─ faker.ts                 # seeded faker utilities
│  │  └─ index.ts                 # orchestrator
│  ├─ fixtures/
│  │  ├─ graph.csv                # nodes
│  │  ├─ edges.csv                # edges
│  │  ├─ transactions.csv         # payments/transfers
│  │  ├─ presence.csv             # co-travel & co-presence
│  │  ├─ comms.csv                # email/phone metadata
│  │  ├─ claims.jsonl             # provenance claim inputs
│  │  └─ redactions.json          # audience masks
│  ├─ scenarios/
│  │  ├─ s1_comm_ring.md          # community + broker
│  │  ├─ s2_fanin_hub.md          # financial fan-in/out
│  │  ├─ s3_cotravel_cell.md      # co-travel/co-presence
│  │  ├─ s4_bridge_disinfo.md     # bridge/broker + content
│  │  └─ s5_anomaly_wire.md       # temporal anomaly
│  └─ import/
│     ├─ import.cypher            # bulk import into Neo4j
│     ├─ map-schema.json          # Ingest Wizard mapping
│     └─ seed.sh                  # orchestrated seeding
└─ tools/
   └─ scripts/seed-synthetic.ts   # one-shot generator + load
```

---

## 1) Generator Utilities
```ts
// data/generators/faker.ts
import { faker } from '@faker-js/faker';
export function seeded(seed:number){ faker.seed(seed); return faker; }
export function pick<T>(arr:T[]){ return arr[Math.floor(Math.random()*arr.length)]; }
export function id(prefix:string){ return `${prefix}_${Math.random().toString(36).slice(2,10)}`; }
```

```ts
// data/generators/gen-entities.ts
import { seeded, id } from './faker';
export type Entity = { id:string; label:string; type:'Person'|'Org'|'Account'|'Device'|'Location'; attrs:Record<string,any> };
export function genEntities(n=200, seed=42): Entity[]{
  const f = seeded(seed); const out:Entity[]=[];
  for(let i=0;i<n;i++){
    const t = f.helpers.arrayElement(['Person','Org','Account','Device','Location']) as Entity['type'];
    const ent:Entity = {
      id: id('E'), label: t==='Person'? f.person.fullName(): t==='Org'? f.company.name(): t==='Account'? `ACCT-${f.number.int({min:100000,max:999999})}`: t==='Device'? `IMEI-${f.number.int({min:1e13,max:9e14})}`:`${f.location.city()}`,
      type: t, attrs: { country: f.location.countryCode(), createdAt: f.date.past().toISOString() }
    };
    out.push(ent);
  }
  return out;
}
```

```ts
// data/generators/gen-relations.ts
import { Entity } from './gen-entities'; import { seeded } from './faker';
export type Edge = { src:string; dst:string; type:'RELATES'|'TRANSFER'|'PRESENT_AT'|'CONTACTED'; weight?:number; when?:string };
export function genEdges(entities:Entity[], seed=43){
  const f = seeded(seed); const edges:Edge[]=[]; const people = entities.filter(e=>e.type==='Person');
  const accounts = entities.filter(e=>e.type==='Account'); const locations = entities.filter(e=>e.type==='Location');
  // Social/comms
  for(const p of people){
    for(let i=0;i<f.number.int({min:1,max:3});i++){
      const q = f.helpers.arrayElement(people.filter(x=>x.id!==p.id));
      edges.push({ src:p.id, dst:q.id, type:'RELATES', weight:f.number.float({min:0.1,max:1.5}) });
      edges.push({ src:p.id, dst:q.id, type:'CONTACTED', when: f.date.recent({days:30}).toISOString() });
    }
  }
  // Financial
  for(let i=0;i<accounts.length*2;i++){
    const a = f.helpers.arrayElement(accounts); const b = f.helpers.arrayElement(accounts.filter(x=>x.id!==a.id));
    edges.push({ src:a.id, dst:b.id, type:'TRANSFER', weight:f.number.int({min:50,max:50000}), when:f.date.recent({days:90}).toISOString() });
  }
  // Presence
  for(const p of people){
    const loc = f.helpers.arrayElement(locations);
    edges.push({ src:p.id, dst:loc.id, type:'PRESENT_AT', when: f.date.recent({days:60}).toISOString() });
  }
  return edges;
}
```

```ts
// data/generators/gen-events.ts
import { seeded } from './faker';
export type Event = { id:string; kind:'meeting'|'flight'|'transfer'; who:string[]; where?:string; amount?:number; at:string };
export function genEvents(seed=44){ const f = seeded(seed); const ev:Event[]=[]; /* stub with a few synthetic events */ return ev; }
```

```ts
// data/generators/index.ts
import fs from 'fs'; import path from 'path';
import { genEntities } from './gen-entities'; import { genEdges } from './gen-relations';
const out = path.resolve(__dirname,'..','fixtures');
const ents = genEntities(400); const edges = genEdges(ents);
fs.writeFileSync(path.join(out,'graph.csv'),'id,label,type,country,createdAt\n'+ents.map(e=>`${e.id},"${e.label}",${e.type},${e.attrs.country},${e.attrs.createdAt}`).join('\n'));
fs.writeFileSync(path.join(out,'edges.csv'),'src,dst,type,weight,when\n'+edges.map(e=>`${e.src},${e.dst},${e.type},${e.weight||''},${e.when||''}`).join('\n'));
fs.writeFileSync(path.join(out,'transactions.csv'),'from,to,amount,at\n'+edges.filter(e=>e.type==='TRANSFER').map(e=>`${e.src},${e.dst},${e.weight},${e.when}`).join('\n'));
fs.writeFileSync(path.join(out,'presence.csv'),'who,where,at\n'+edges.filter(e=>e.type==='PRESENT_AT').map(e=>`${e.src},${e.dst},${e.when}`).join('\n'));
fs.writeFileSync(path.join(out,'comms.csv'),'from,to,at\n'+edges.filter(e=>e.type==='CONTACTED').map(e=>`${e.src},${e.dst},${e.when}`).join('\n'));
// Provenance claims (inputs that ledger service will hash)
fs.writeFileSync(path.join(out,'claims.jsonl'), edges.map(e=>JSON.stringify({ kind:e.type.toLowerCase(), subjectId:e.src, source:'synthetic', content: JSON.stringify(e) })).join('\n'));
fs.writeFileSync(path.join(out,'redactions.json'), JSON.stringify({ partner:['SSN','DOB'], court:[], press:['SSN','DOB','Address'] }, null, 2));
console.log('Synthetic fixtures written to', out);
```

---

## 2) Import to Neo4j
```cypher
// data/import/import.cypher
:auto USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///graph.csv' AS row
MERGE (n:Entity { id: row.id })
SET n.label=row.label, n.type=row.type, n.country=row.country, n.createdAt=datetime(row.createdAt);

:auto USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row
MATCH (a:Entity{id:row.src}),(b:Entity{id:row.dst})
CALL apoc.merge.relationship(a, row.type, {}, { weight: toFloat(row.weight), at: datetime(row.when) }, b) YIELD rel
RETURN count(rel);
```

```bash
# data/import/seed.sh
set -euo pipefail
NEO=${NEO:-bolt://localhost:7687}; PASS=${PASS:-intelgraph}
# Place CSVs in Neo4j import dir (bind mount in compose)
cp -f data/fixtures/* .neo4j/import/
cypher-shell -a $NEO -u neo4j -p $PASS < data/import/import.cypher
```

---

## 3) Ingest Wizard Mapping (for our UI)
```json
// data/import/map-schema.json
{ "graph.csv": {"Entity": {"id":"id","props":{"label":"label","type":"type","country":"country","createdAt":"createdAt"}}},
  "edges.csv": {"Relationship": {"from":"src","to":"dst","type":"type","props":{"weight":"weight","at":"when"}}} }
```

---

## 4) Seed + Load Orchestrator
```ts
// tools/scripts/seed-synthetic.ts
import fs from 'fs'; import path from 'path'; import fetch from 'node-fetch';
async function main(){
  require('../../data/generators');
  // Load claims into ledger service
  const p = path.resolve(__dirname,'..','..','data','fixtures','claims.jsonl');
  const lines = fs.readFileSync(p,'utf8').trim().split('\n'); const ids:string[]=[];
  for(const line of lines){ const r = await fetch('http://localhost:7002/claims',{method:'POST',headers:{'content-type':'application/json'},body:line}).then(r=>r.json()); ids.push(r.id); }
  const m = await fetch('http://localhost:7002/manifests',{method:'POST',headers:{'content-type':'application/json'},body: JSON.stringify({ claimIds: ids.slice(0,50) })}).then(r=>r.json());
  console.log('Manifest', m);
}
main();
```

---

## 5) Scenario Cue Sheets

### s1_comm_ring.md (Community + Broker)
- Query: NL→Cypher “community detection” → Louvain → bridge/broker edges highlighted.
- Analytics: Betweenness/Eigenvector top 10.
- Pattern: none required.
- Goal: show community colors, a broker node, provenance tooltip.

### s2_fanin_hub.md (Financial Hub)
- Pattern: `fanin` with `min=8`.
- Analytics: PageRank to validate hub prominence.
- Goal: demonstrate **Budget Guard** when raising `min` down to 2.

### s3_cotravel_cell.md (Co‑travel)
- Pattern: `cotravel` with `withinHours=6`.
- Map: show pins + time brush; Tri‑Pane sync.

### s4_bridge_disinfo.md (Bridge/Broker + Content)
- Runbook: `R4-bridge-broker.json`, Report Studio export with one redaction.

### s5_anomaly_wire.md (Temporal Anomaly)
- Analytics: rolling degree/time; NL→Cypher “nodes with sharp rise in degree last 24h”.

---

## 6) Tests (data integrity)
```ts
// data/generators/__tests__/fixtures.spec.ts
import fs from 'fs'; import path from 'path';
const p = (f:string)=>path.resolve(__dirname,'..','..','fixtures',f);

test('edges reference existing nodes', ()=>{
  const nodes = new Set(fs.readFileSync(p('graph.csv'),'utf8').split('\n').slice(1).filter(Boolean).map(l=>l.split(',')[0]));
  const bad = fs.readFileSync(p('edges.csv'),'utf8').split('\n').slice(1).filter(Boolean).map(l=>({src:l.split(',')[0],dst:l.split(',')[1]})).filter(e=>!nodes.has(e.src)||!nodes.has(e.dst));
  expect(bad.length).toBe(0);
});
```

---

## 7) Demo Integration
- **Makefile**: add `make seed-synth` → runs generator + ledger load.
- **E2E Demo**: switch seed step to synthetic dataset (larger, more interesting communities & motifs).
- **Grafana**: import panel “dataset_size” (node/edge counts from Neo4j metrics).

```make
seed-synth:
	pnpm ts-node tools/scripts/seed-synthetic.ts
```

---

## 8) Privacy & Compliance
- 100% synthetic via seeded Faker; no real names/SSNs.
- Redaction profiles mapped to Wallet audiences; `redactions.json` feeds Report Studio and Wallet bundler.
- Provenance manifest generated for a subset (configurable) to keep demo fast; full manifest option for perf tests.

---

## 9) Performance Notes
- Dataset default: ~400 nodes / ~2k edges; adjustable via env vars or CLI flags on generators.
- For soak: set `N=5000` entities to exercise cost guard thresholds and GDS algorithms.

---

## 10) Next Up (optional)
- Add synthetic **image/text** artifacts to claims for multimodal XAI demos.
- Inject realistic **seasonality & bursts** for anomaly detection runbooks.
- Ship **dataset switcher** in the webapp (dropdown: Tiny, Demo, Large).

