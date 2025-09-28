# IntelGraph – PR‑7 UI Tri‑Pane + jQuery Command Palette & Copilot Panel

This package adds the first **tri‑pane analyst UI** (Graph / Timeline / Map), a **jQuery‑powered command palette** (Ctrl/Cmd‑K), and a **Copilot panel** that hits the Copilot service for NL→Cypher & RAG. It’s shippable as a Vite + React app with Material‑UI and Cytoscape.js.

---

## PR‑7 – Branch & PR

**Branch:** `feature/ui-tri-pane`  
**Open PR:**
```bash
git checkout -b feature/ui-tri-pane
# apply patches below, commit, push
gh pr create -t "UI tri‑pane + jQuery command palette & Copilot panel" -b "Adds React tri‑pane (graph/timeline/map), jQuery command palette (Ctrl/Cmd‑K), Copilot panel wired to /copilot/query, and compose wiring." -B develop -H feature/ui-tri-pane -l prio:P0,area:ui
```

---

## 1) UI app scaffold (Vite + React + MUI + Cytoscape + Leaflet)

```diff
*** Begin Patch
*** Add File: ui/web/package.json
+{
+  "name": "intelgraph-ui",
+  "version": "0.1.0",
+  "private": true,
+  "type": "module",
+  "scripts": {
+    "dev": "vite",
+    "build": "vite build",
+    "preview": "vite preview --port 5173"
+  },
+  "dependencies": {
+    "@emotion/react": "^11.13.3",
+    "@emotion/styled": "^11.13.0",
+    "@mui/material": "^6.1.2",
+    "cytoscape": "^3.28.1",
+    "jquery": "^3.7.1",
+    "leaflet": "^1.9.4",
+    "react": "^18.3.1",
+    "react-dom": "^18.3.1"
+  },
+  "devDependencies": {
+    "@types/jquery": "^3.5.30",
+    "vite": "^5.4.0"
+  }
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ui/web/index.html
+<!doctype html>
+<html>
+  <head>
+    <meta charset="utf-8" />
+    <meta name="viewport" content="width=device-width, initial-scale=1" />
+    <title>IntelGraph</title>
+    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
+    <style>
+      html, body, #root { height: 100%; margin: 0; }
+      .pane { border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
+      #graph { height: 100%; }
+      #timeline { height: 100%; overflow: auto; }
+      #map { height: 100%; }
+      .palette { position: fixed; inset: 0; display: none; background: rgba(0,0,0,0.35); }
+      .palette .sheet { max-width: 720px; margin: 8% auto; background: #fff; border-radius: 16px; padding: 16px; }
+      .palette input { width: 100%; padding: 12px; font-size: 16px; }
+      .palette .results { max-height: 320px; overflow: auto; }
+      .copilot { position: fixed; right: 16px; bottom: 16px; width: 420px; height: 520px; background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); display: none; }
+    </style>
+  </head>
+  <body>
+    <div id="root"></div>
+    <script type="module" src="/src/main.jsx"></script>
+  </body>
+  </html>
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ui/web/src/main.jsx
+import React from 'react';
+import { createRoot } from 'react-dom/client';
+import App from './App.jsx';
+createRoot(document.getElementById('root')).render(<App />);
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ui/web/src/App.jsx
+import React, { useEffect, useRef } from 'react';
+import Box from '@mui/material/Box';
+import Button from '@mui/material/Button';
+import $ from 'jquery';
+import GraphView from './components/GraphView.jsx';
+import TimelineView from './components/TimelineView.jsx';
+import MapView from './components/MapView.jsx';
+import CopilotPanel from './components/CopilotPanel.jsx';
+
+export default function App(){
+  const paletteRef = useRef(null);
+  useEffect(()=>{
+    // jQuery command palette toggle
+    $(document).on('keydown', (e)=>{
+      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
+        e.preventDefault();
+        $('.palette').fadeIn(120);
+        $('#cmd').trigger('focus');
+      }
+      if (e.key === 'Escape') $('.palette').fadeOut(120);
+    });
+    $('#cmd').on('input', async function(){
+      const q = $(this).val();
+      const entries = [
+        { id: 'nl2cypher', label: `Ask Copilot (NL→Cypher): ${q}` },
+        { id: 'rag', label: `Ask Copilot (RAG): ${q}` }
+      ];
+      const list = entries.map(e=>`<div class="row" data-id="${e.id}">${e.label}</div>`).join('');
+      $('.palette .results').html(list);
+    });
+    $('.palette').on('click', '.row', function(){
+      const id = $(this).data('id');
+      const q = /** @type {string} */($('#cmd').val());
+      window.dispatchEvent(new CustomEvent('copilot:invoke', { detail: { mode: id, prompt: q } }));
+      $('.palette').fadeOut(120);
+    });
+  },[]);
+
+  return (
+    <Box sx={{ height:'100%', display:'grid', gridTemplateColumns:'2fr 1fr', gridTemplateRows:'1fr 1fr', gap:2, p:2 }}>
+      <Box className="pane" sx={{ gridColumn:'1', gridRow:'1 / span 2' }}>
+        <GraphView />
+      </Box>
+      <Box className="pane" sx={{ gridColumn:'2', gridRow:'1', p:1 }}>
+        <TimelineView />
+      </Box>
+      <Box className="pane" sx={{ gridColumn:'2', gridRow:'2', p:1 }}>
+        <MapView />
+      </Box>
+
+      <div className="palette" ref={paletteRef}>
+        <div className="sheet">
+          <input id="cmd" placeholder="Ask IntelGraph (Ctrl/Cmd‑K to open, Esc to close)" />
+          <div className="results" />
+        </div>
+      </div>
+
+      <CopilotPanel />
+
+      <Box sx={{ position:'fixed', left:16, bottom:16 }}>
+        <Button variant="contained" onClick={()=>$('.palette').fadeIn(100)}>Command (Ctrl/Cmd‑K)</Button>
+        <Button sx={{ ml:1 }} variant="outlined" onClick={()=>$(".copilot").toggle(120)}>Copilot</Button>
+      </Box>
+    </Box>
+  );
+}
*** End Patch
```

---

## 2) Graph / Timeline / Map components

```diff
*** Begin Patch
*** Add File: ui/web/src/components/GraphView.jsx
+import React, { useEffect, useRef } from 'react';
+import cytoscape from 'cytoscape';
+import $ from 'jquery';
+
+export default function GraphView(){
+  const ref = useRef(null);
+  useEffect(()=>{
+    const cy = cytoscape({ container: ref.current, elements: sample(), style:[
+      { selector: 'node', style:{ 'label':'data(label)', 'background-color':'#1976d2', 'color':'#fff','text-valign':'center' }},
+      { selector: 'edge', style:{ 'label':'data(rel)', 'curve-style':'bezier','target-arrow-shape':'triangle' }}
+    ], layout:{ name:'grid' }});
+    // simple jQuery drag‑to‑select broadcast
+    cy.on('tap', 'node', (evt)=>{
+      $(window).trigger('graph:select', [evt.target.data()]);
+    });
+    return ()=> cy.destroy();
+  },[]);
+  return <div id="graph" ref={ref} />;
+}
+
+function sample(){
+  return [
+    { data:{ id:'P1', label:'Alice'} },
+    { data:{ id:'P2', label:'Bob'} },
+    { data:{ id:'H1', label:'Host 10.0.0.1'} },
+    { data:{ id:'e1', source:'P1', target:'P2', rel:'KNOWS'} },
+    { data:{ id:'e2', source:'P2', target:'H1', rel:'LOGGED_IN'} }
+  ];
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ui/web/src/components/TimelineView.jsx
+import React, { useEffect, useState } from 'react';
+import $ from 'jquery';
+
+export default function TimelineView(){
+  const [events, setEvents] = useState([{ t:'2025‑08‑01', msg:'Login from Bob' }, { t:'2025‑08‑02', msg:'Alice met Bob' }]);
+  useEffect(()=>{
+    $(window).on('graph:select', (_, node)=>{
+      setEvents((ev)=>[{ t:new Date().toISOString(), msg:`Selected ${node.label}` }, ...ev]);
+    });
+    return ()=> $(window).off('graph:select');
+  },[]);
+  return (
+    <div id="timeline">
+      <h3 style={{margin:'8px 12px'}}>Timeline</h3>
+      <ul>
+        {events.map((e,i)=>(<li key={i}><b>{e.t}</b> — {e.msg}</li>))}
+      </ul>
+    </div>
+  );
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ui/web/src/components/MapView.jsx
+import React, { useEffect, useRef } from 'react';
+import L from 'leaflet';
+import $ from 'jquery';
+
+export default function MapView(){
+  const ref = useRef(null);
+  useEffect(()=>{
+    const map = L.map(ref.current).setView([39.742, -104.991], 3);
+    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
+    const marker = L.marker([39.742, -104.991]).addTo(map).bindPopup('Denver');
+    $(window).on('graph:select', (_, node)=>{
+      marker.setLatLng([39.742, -104.991]).setPopupContent(`Selected: ${node.label}`).openPopup();
+    });
+    return ()=> { map.remove(); $(window).off('graph:select'); };
+  },[]);
+  return <div id="map" ref={ref} />;
+}
*** End Patch
```

---

## 3) Copilot panel (jQuery‑toggle + API calls)

```diff
*** Begin Patch
*** Add File: ui/web/src/components/CopilotPanel.jsx
+import React, { useEffect, useState } from 'react';
+import $ from 'jquery';
+
+export default function CopilotPanel(){
+  const [log, setLog] = useState([]);
+  async function invoke({ mode, prompt }){
+    const body = JSON.stringify({ prompt, mode: mode==='nl2cypher'? 'nl2cypher' : 'ask' });
+    const res = await fetch('http://localhost:4100/copilot/query', { method:'POST', headers:{'content-type':'application/json'}, body });
+    const data = await res.json();
+    setLog((L)=>[{ t: new Date().toLocaleTimeString(), req:{ mode, prompt }, res: data }, ...L]);
+  }
+  useEffect(()=>{
+    function onInvoke(e){ invoke(e.detail); }
+    window.addEventListener('copilot:invoke', onInvoke);
+    return ()=> window.removeEventListener('copilot:invoke', onInvoke);
+  },[]);
+  return (
+    <div className="copilot">
+      <div style={{ padding:12, borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between' }}>
+        <strong>Copilot</strong>
+        <button onClick={()=>$('.copilot').hide()}>✕</button>
+      </div>
+      <div style={{ padding:12, height:'calc(100% - 44px)', overflow:'auto' }}>
+        {log.map((r,i)=>(
+          <div key={i} style={{ marginBottom:12 }}>
+            <div><b>{r.t}</b> • <i>{r.req.mode}</i> — {r.req.prompt}</div>
+            <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify(r.res, null, 2)}</pre>
+          </div>
+        ))}
+      </div>
+    </div>
+  );
+}
*** End Patch
```

---

## 4) Vite config & Dockerfile

```diff
*** Begin Patch
*** Add File: ui/web/vite.config.js
+import { defineConfig } from 'vite';
+export default defineConfig({ server:{ host: true, port: 5173 } });
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ui/web/Dockerfile
+FROM node:20-alpine AS build
+WORKDIR /app
+COPY package.json package-lock.json* ./
+RUN npm ci || npm i
+COPY . .
+RUN npm run build
+
+FROM nginx:alpine
+COPY --from=build /app/dist /usr/share/nginx/html
+EXPOSE 80
+CMD ["nginx","-g","daemon off;"]
*** End Patch
```

---

## 5) Compose wiring & Makefile helpers

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   copilot:
@@
     ports: ["4100:4100"]
+
+  ui:
+    build: ./ui/web
+    depends_on: [ api, copilot ]
+    ports: ["8080:80"]
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 docker:
 	docker compose build && docker compose up -d
 open.ui:
-	@echo "Open http://localhost:8080"
+	@echo "Open http://localhost:8080" && sleep 1 && (python3 -c "import webbrowser; webbrowser.open('http://localhost:8080')" || true)
*** End Patch
```

---

## 6) Smoke test

1. `make docker` (starts api, copilot, ui).
2. `make seed`.
3. Open UI (`make open.ui`).
4. Press **Ctrl/Cmd‑K**, type “shortest path from person P1 to H1”, choose “Ask Copilot (NL→Cypher)”. Copilot panel should open with preview + cost.
5. Click a node in the graph → Timeline logs the selection; Map updates popup.

---

## 7) Next after merge

- Replace sample graph with live data from API (`/graphql` persisted queries) and bind selection → detail drawer.
- Add **jQuery drag‑box select** and **Cytoscape edge styling** for risk scores.
- Add **policy simulation view** (admin) and **XAI overlays** (“Explain this view”).

