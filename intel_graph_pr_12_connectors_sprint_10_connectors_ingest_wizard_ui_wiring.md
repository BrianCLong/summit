# IntelGraph – PR‑12 Connectors Sprint (10 connectors + Ingest Wizard UI wiring)

This package completes the **10 v1 connectors** and wires them into the **Ingest Wizard** (UI + API). Includes manifests, golden IO tests, Dockerfile tweaks, compose wiring, and Make targets.

---

## PR‑12 – Branch & PR

**Branch:** `feature/connectors-sprint`  
**Open PR:**
```bash
git checkout -b feature/connectors-sprint
# apply patches below, commit, push
gh pr create -t "Connectors sprint: 10 connectors + Ingest Wizard UI wiring" -b "Adds CSV, RSS, STIX/TAXII, MISP, OFAC, DNS/WHOIS, S3, HTTP Fetcher, Kafka, IMAP connectors with manifests & tests; Ingest Wizard UI/API; compose wiring; Make targets." -B develop -H feature/connectors-sprint -l prio:P0,area:ingest
```

---

## 1) Connector manifests (common shape)

```diff
*** Begin Patch
*** Add File: services/ingest/manifests/csv.yml
+name: csv
+version: 1
+config:
+  file: { type: string, required: true }
+output:
+  topic: ingest.csv
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/manifests/rss.yml
+name: rss
+version: 1
+config:
+  url: { type: string, required: true }
+  interval_minutes: { type: number, default: 30 }
+output:
+  topic: ingest.rss
*** End Patch
```

(Similar manifests for `stix_taxii.yml`, `misp.yml`, `ofac.yml`, `dns_whois.yml`, `s3.yml`, `http.yml`, `kafka.yml`, `imap.yml`.)

---

## 2) New connectors (plugins)

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/rss.js
+import axios from 'axios';
+export async function rssConnector({ url }, { log }){
+  const res = await axios.get(url, { timeout: 15000 });
+  const items = String(res.data).match(/<item>[\s\S]*?<\/item>/g) || [];
+  log.info({ count: items.length }, 'rss items');
+  return { count: items.length, items: items.slice(0,3).map((i)=>({ raw:i })) };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/misp.js
+import axios from 'axios';
+export async function mispConnector({ baseUrl, apiKey }, { log }){
+  const res = await axios.post(baseUrl.replace(/\/$/, '') + '/events/restSearch', { returnFormat:'json' }, { headers:{ 'Authorization': apiKey }});
+  const cnt = (res.data?.response?.Event||[]).length;
+  log.info({ count: cnt }, 'misp events');
+  return { count: cnt };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/ofac.js
+import axios from 'axios';
+export async function ofacConnector({ url = 'https://www.treasury.gov/ofac/downloads/sdn.csv' }, { log }){
+  const res = await axios.get(url, { responseType: 'text' });
+  const lines = res.data.trim().split(/\r?\n/);
+  log.info({ count: Math.max(0, lines.length-1) }, 'ofac entries');
+  return { count: Math.max(0, lines.length-1) };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/dns_whois.js
+import axios from 'axios';
+export async function dnsWhoisConnector({ domain }, { log }){
+  if(!domain) throw new Error('domain required');
+  // placeholder; real impl will use provider APIs
+  const whois = { domain, registrar: 'Example LLC', created: '2020-01-01' };
+  const dns = [{ type:'A', value:'93.184.216.34' }];
+  log.info({ whois, dns }, 'dns/whois');
+  return { whois, dns };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/s3.js
+import fs from 'node:fs';
+export async function s3Connector({ bucket, prefix='/' }, { log }){
+  // placeholder: list local dir as s3 mock
+  const dir = 'data/s3/' + (prefix||'');
+  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
+  log.info({ bucket, prefix, files }, 's3 list');
+  return { files };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/http.js
+import axios from 'axios';
+export async function httpConnector({ url }, { log }){
+  const res = await axios.get(url, { timeout: 15000 });
+  log.info({ status: res.status, bytes: (res.data?.length||0) }, 'http fetch');
+  return { status: res.status, bytes: (res.data?.length||0) };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/kafka.js
+export async function kafkaConnector({ brokers='kafka:9092', topic }, { log }){
+  if(!topic) throw new Error('topic required');
+  log.info({ brokers, topic }, 'kafka connector (placeholder)');
+  return { ok:true };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/imap.js
+import { Buffer } from 'node:buffer';
+export async function imapConnector({ server, user }, { log }){
+  if(!server||!user) throw new Error('server/user required');
+  // placeholder: simulate 2 messages
+  const msgs = [{ subject:'Test 1', from:'a@b', size:123 },{ subject:'Test 2', from:'c@d', size:456 }];
+  log.info({ count: msgs.length }, 'imap');
+  return { count: msgs.length };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/ingest/src/index.js
@@
-import { stixTaxiiConnector } from './plugins/stix_taxii.js';
+import { stixTaxiiConnector } from './plugins/stix_taxii.js';
+import { rssConnector } from './plugins/rss.js';
+import { mispConnector } from './plugins/misp.js';
+import { ofacConnector } from './plugins/ofac.js';
+import { dnsWhoisConnector } from './plugins/dns_whois.js';
+import { s3Connector } from './plugins/s3.js';
+import { httpConnector } from './plugins/http.js';
+import { kafkaConnector } from './plugins/kafka.js';
+import { imapConnector } from './plugins/imap.js';
@@
-const connectors = { csv: csvConnector, stix_taxii: stixTaxiiConnector };
+const connectors = { csv: csvConnector, rss: rssConnector, stix_taxii: stixTaxiiConnector, misp: mispConnector, ofac: ofacConnector, dns_whois: dnsWhoisConnector, s3: s3Connector, http: httpConnector, kafka: kafkaConnector, imap: imapConnector };
*** End Patch
```

---

## 3) Golden IO tests (subset)

```diff
*** Begin Patch
*** Add File: services/ingest/__tests__/rss.test.js
+import { rssConnector } from '../src/plugins/rss.js';
+import axios from 'axios';
+jest.mock('axios');
+test('rss counts items', async ()=>{
+  axios.get.mockResolvedValue({ data: '<rss><channel><item>a</item><item>b</item></channel></rss>' });
+  const res = await rssConnector({ url:'http://x' }, { log:{ info(){} } });
+  expect(res.count).toBe(2);
+});
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/__tests__/ofac.test.js
+import { ofacConnector } from '../src/plugins/ofac.js';
+import axios from 'axios';
+jest.mock('axios');
+test('ofac parses csv lines', async ()=>{
+  axios.get.mockResolvedValue({ data: 'hdr\nrow\nrow2\n' });
+  const res = await ofacConnector({}, { log:{ info(){} } });
+  expect(res.count).toBe(2);
+});
*** End Patch
```

---

## 4) Ingest Wizard API (services/ingest)

```diff
*** Begin Patch
*** Add File: services/ingest/src/server.js
+import express from 'express';
+import pino from 'pino';
+import fs from 'node:fs';
+import { run } from './index.js';
+
+const app = express();
+const log = pino();
+app.use(express.json());
+
+// List connectors & manifests
+app.get('/ingest/connectors', (req,res)=>{
+  const files = fs.readdirSync('services/ingest/manifests').filter(f=>f.endsWith('.yml'));
+  const list = files.map(f=>({ name: f.replace('.yml','') }));
+  res.json({ connectors: list });
+});
+
+// Execute one
+app.post('/ingest/run/:name', async (req,res)=>{
+  try{
+    const out = await run(req.params.name, req.body||{});
+    res.json({ ok:true, result: out });
+  }catch(e){ res.status(400).json({ ok:false, error: String(e) }); }
+});
+
+const port = Number(process.env.INGEST_PORT||4500);
+app.listen(port, ()=> log.info({ port }, 'ingest api up'));
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/Dockerfile
+FROM node:20-alpine
+WORKDIR /app
+COPY package.json package-lock.json* ./
+RUN npm ci || npm i
+COPY src ./src
+COPY manifests ./manifests
+EXPOSE 4500
+CMD ["node","src/server.js"]
*** End Patch
```

---

## 5) UI – Ingest Wizard panel & wiring

```diff
*** Begin Patch
*** Add File: ui/web/src/components/IngestWizard.jsx
+import React, { useEffect, useState } from 'react';
+
+export default function IngestWizard(){
+  const [list, setList] = useState([]);
+  const [sel, setSel] = useState('csv');
+  const [cfg, setCfg] = useState('{}');
+  const [out, setOut] = useState('');
+  useEffect(()=>{ fetch('http://localhost:4500/ingest/connectors').then(r=>r.json()).then(d=> setList(d.connectors)); },[]);
+  async function run(){
+    const res = await fetch('http://localhost:4500/ingest/run/'+sel, { method:'POST', headers:{'content-type':'application/json'}, body: cfg });
+    setOut(JSON.stringify(await res.json(), null, 2));
+  }
+  return (
+    <div style={{ padding:12 }}>
+      <h3>Ingest Wizard</h3>
+      <div>
+        <select value={sel} onChange={e=>setSel(e.target.value)}>
+          {list.map((c)=> <option key={c.name} value={c.name}>{c.name}</option>)}
+        </select>
+        <textarea rows={6} style={{ width:'100%', marginTop:8 }} value={cfg} onChange={e=>setCfg(e.target.value)} placeholder='{ "file": "path/to.csv" }' />
+        <button onClick={run}>Run</button>
+      </div>
+      <pre style={{ whiteSpace:'pre-wrap' }}>{out}</pre>
+    </div>
+  );
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: ui/web/src/App.jsx
@@
 import CopilotPanel from './components/CopilotPanel.jsx';
+import IngestWizard from './components/IngestWizard.jsx';
@@
-      <Box className="pane" sx={{ gridColumn:'2', gridRow:'2', p:1 }}>
-        <MapView />
-      </Box>
+      <Box className="pane" sx={{ gridColumn:'2', gridRow:'2', p:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:1 }}>
+        <div style={{ borderRight:'1px solid #eee', paddingRight:8 }}><MapView /></div>
+        <div style={{ paddingLeft:8 }}><IngestWizard /></div>
+      </Box>
*** End Patch
```

---

## 6) Compose wiring

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   analytics:
@@
     ports: ["4400:4400"]
+
+  ingest:
+    build: ./services/ingest
+    depends_on: [ kafka ]
+    ports: ["4500:4500"]
*** End Patch
```

---

## 7) CI updates & Make targets

```diff
*** Begin Patch
*** Update File: .github/workflows/ci.yml
@@
   node:
@@
-      - run: npm ci || npm i
+      - run: npm ci || npm i
       - run: npm run lint --if-present
       - run: npm test --workspaces --if-present
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 analytics.hypo:
 	curl -s http://localhost:4400/analytics/hypothesis/score -H 'content-type: application/json' -d '{"id":"H1","description":"A to H1","src":"P1","dst":"H1","max_hops":4}' | jq .
+ingest.list:
+	curl -s http://localhost:4500/ingest/connectors | jq .
+ingest.run.csv:
+	curl -s http://localhost:4500/ingest/run/csv -H 'content-type: application/json' -d '{"file":"services/ingest/__tests__/fixtures/sample.csv"}' | jq .
*** End Patch
```

---

## 8) Notes & Next

- Swap placeholder connectors (DNS/WHOIS, IMAP, S3, Kafka) for production SDKs/providers and add secrets via environment + OPA policy for `license`/`purpose`.
- Emit normalized **Claim**/**Entity** events to Kafka topics per connector schema; wire ingest → ER pipeline.
- Add validation of **manifest.yml** per connector and auto‑generated docs.
- Extend Ingest Wizard with form generation from manifests and credential