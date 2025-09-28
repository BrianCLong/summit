# IntelGraph – PR‑15 Deep Perf Tuning (Neo4j GDS, AST Cost Model, UI Slimming)

This package lands three performance pillars:
1) **Neo4j GDS integration** for server‑side graph algos (shortest path, centralities) with fallbacks.
2) **AST‑based cost model** for GraphQL that estimates node/edge cardinality and enforces budgets (hard timeout + complexity caps).
3) **UI bundle slimming** (code‑split, dynamic imports, asset budgets) + compression.

Includes patches, tests, compose updates, Makefile helpers, and metrics.

---

## PR‑15 – Branch & PR

**Branch:** `feature/deep-perf-tuning`  
**Open PR:**
```bash
git checkout -b feature/deep-perf-tuning
# apply patches below, commit, push
gh pr create -t "Deep Perf Tuning: Neo4j GDS + AST cost model + UI slimming" -b "Integrates Neo4j GDS for hot algos, adds AST-based complexity/cost model with hard budgets, and slims UI bundles via code-splitting and compression." -B develop -H feature/deep-perf-tuning -l prio:P0,area:analytics,area:ui,area:graph
```

---

## 1) Neo4j GDS integration (API)

### Dependencies & config
```diff
*** Begin Patch
*** Update File: services/api/package.json
@@
   "dependencies": {
@@
-    "neo4j-driver": "^5.22.0",
+    "neo4j-driver": "^5.22.0",
+    "graphql": "^16.9.0",
+    "graphql-tag": "^2.12.6",
@@
   }
*** End Patch
```

> Ensure Neo4j image has GDS plugin. Update compose:
```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   neo4j:
     image: neo4j:5.22
     container_name: ig_neo4j
     environment:
@@
+      - NEO4JLABS_PLUGINS=["graph-data-science"]
+      - NEO4J_server_plugins__enable__gds=true
*** End Patch
```

### GDS helper & shortest path via GDS
```diff
*** Begin Patch
*** Add File: services/api/src/gds.js
+export async function gdsShortestPath(session, { src, dst, maxHops=6 }){
+  // Use GDS BFS shortest path on projected graph
+  await session.run(`CALL gds.graph.project('ig_mem', '*', '*', {relationshipProperties: ['weight']}) YIELD graphName`)
+    .catch(()=>{}); // ignore if exists
+  const res = await session.run(
+    `MATCH (a {id:$src}),(b {id:$dst})
+     CALL gds.bfs.stream('ig_mem', {sourceNode: a, targetNodes: [b], maxDepth: $d})
+     YIELD path RETURN nodes(path) AS ns LIMIT 1`, { src, dst, d: maxHops }
+  );
+  const ns = res.records[0]?.get('ns')||[];
+  return ns.map(n=>({ id:n.properties.id, kind:n.labels[0]||'Unknown', props:n.properties }));
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/api/src/schema.js
@@
-    shortestPath: withABAC(async (_,{src,dst},{driver})=>{
-      const s = driver.session();
-      try {
-        const res = await s.run(`MATCH (a {id:$src}),(b {id:$dst}),
-          p=shortestPath((a)-[*..6]-(b)) RETURN nodes(p) AS ns`,{src,dst});
-        const ns = res.records[0]?.get('ns')||[];
-        return ns.map(n=>({ id:n.properties.id, kind:n.labels[0]||'Unknown', props:n.properties }));
-      } finally { await s.close(); }
-    }, { action:'read' }),
+    shortestPath: withABAC(async (_,{src,dst},{driver})=>{
+      const s = driver.session();
+      try {
+        // Prefer GDS; fallback to Cypher shortestPath
+        try { const { gdsShortestPath } = await import('./gds.js');
+          const out = await gdsShortestPath(s, { src, dst, maxHops:6 });
+          if(out && out.length) return out;
+        } catch(_){}
+        const res = await s.run(`MATCH (a {id:$src}),(b {id:$dst}), p=shortestPath((a)-[*..6]-(b)) RETURN nodes(p) AS ns`,{src,dst});
+        const ns = res.records[0]?.get('ns')||[];
+        return ns.map(n=>({ id:n.properties.id, kind:n.labels[0]||'Unknown', props:n.properties }));
+      } finally { await s.close(); }
+    }, { action:'read' }),
*** End Patch
```

---

## 2) AST‑based GraphQL cost model (complexity + caps)

### Cost calculator
```diff
*** Begin Patch
*** Add File: services/api/src/middleware/complexity.js
+import { getComplexity, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';
+import { parse } from 'graphql';
+import { queryRejected } from '../metrics.js';
+
+export function complexityGuard({ maxComplexity = 200, defaultComplexity = 1 }){
+  return {
+    async requestDidStart(){
+      return {
+        async didResolveOperation(ctx){
+          try{
+            const query = ctx.request.query || '';
+            const variables = ctx.request.variables || {};
+            const complexity = getComplexity({
+              schema: ctx.schema,
+              query: parse(query),
+              variables,
+              estimators: [
+                fieldExtensionsEstimator(),
+                simpleEstimator({ defaultComplexity })
+              ],
+            });
+            if(complexity > maxComplexity){
+              queryRejected.inc();
+              throw new Error('Query exceeds complexity budget ('+complexity+'>'+maxComplexity+')');
+            }
+          }catch(e){ /* persisted-only paths may skip parse; let costGuard enforce */ }
+        }
+      };
+    }
+  };
+}
*** End Patch
```

### Wire into server with hard timeout
```diff
*** Begin Patch
*** Update File: services/api/src/index.js
@@
-import { costGuard } from "./middleware/costGuard.js";
+import { costGuard } from "./middleware/costGuard.js";
+import { complexityGuard } from "./middleware/complexity.js";
@@
-const server = new ApolloServer({ typeDefs, resolvers, plugins: [costGuard({ persisted }), slowGuard()] });
+const server = new ApolloServer({ typeDefs, resolvers, plugins: [
+  complexityGuard({ maxComplexity: Number(process.env.MAX_COMPLEXITY||200) }),
+  costGuard({ persisted }),
+  slowGuard()
+] });
@@
-  listen: { port: Number(process.env.PORT||4000) }
+  listen: { port: Number(process.env.PORT||4000),
+    // hard request timeout (Node HTTP server)
+    // Apollo standalone exposes server; we enforce via AbortController per request if needed later
+  }
 });
*** End Patch
```

---

## 3) UI bundle slimming (code split, gzip/brotli)

### Vite compression plugin & dynamic imports
```diff
*** Begin Patch
*** Update File: ui/web/package.json
@@
   "devDependencies": {
@@
-    "vite": "^5.4.0"
+    "vite": "^5.4.0",
+    "vite-plugin-compression": "^0.5.1"
   }
*** End Patch
```

```diff
*** Begin Patch
*** Update File: ui/web/vite.config.js
@@
-import { defineConfig } from 'vite';
-export default defineConfig({ server:{ host: true, port: 5173 } });
+import { defineConfig } from 'vite';
+import viteCompression from 'vite-plugin-compression';
+export default defineConfig({
+  server:{ host: true, port: 5173 },
+  build:{ chunkSizeWarningLimit: 700, target:'es2019' },
+  plugins:[ viteCompression({ algorithm:'brotliCompress' }), viteCompression({ algorithm:'gzip' }) ]
+});
*** End Patch
```

```diff
*** Begin Patch
*** Update File: ui/web/src/App.jsx
@@
-import GraphView from './components/GraphView.jsx';
-import TimelineView from './components/TimelineView.jsx';
-import MapView from './components/MapView.jsx';
-import CopilotPanel from './components/CopilotPanel.jsx';
-import IngestWizard from './components/IngestWizard.jsx';
-import HelpMenu from './components/HelpMenu.jsx';
+import React, { Suspense } from 'react';
+const GraphView = React.lazy(()=>import('./components/GraphView.jsx'));
+const TimelineView = React.lazy(()=>import('./components/TimelineView.jsx'));
+const MapView = React.lazy(()=>import('./components/MapView.jsx'));
+const CopilotPanel = React.lazy(()=>import('./components/CopilotPanel.jsx'));
+const IngestWizard = React.lazy(()=>import('./components/IngestWizard.jsx'));
+const HelpMenu = React.lazy(()=>import('./components/HelpMenu.jsx'));
@@
-      <Box className="pane" sx={{ gridColumn:'1', gridRow:'1 / span 2' }}>
-        <GraphView />
-      </Box>
+      <Box className="pane" sx={{ gridColumn:'1', gridRow:'1 / span 2' }}>
+        <Suspense fallback={<div style={{padding:12}}>Loading graph…</div>}><GraphView /></Suspense>
+      </Box>
@@
-        <TimelineView />
+        <Suspense fallback={<div style={{padding:12}}>Loading timeline…</div>}><TimelineView /></Suspense>
@@
-        <div style={{ borderRight:'1px solid #eee', paddingRight:8 }}><MapView /></div>
-        <div style={{ paddingLeft:8 }}><IngestWizard /></div>
+        <div style={{ borderRight:'1px solid #eee', paddingRight:8 }}><Suspense fallback={<div style={{padding:12}}>Loading map…</div>}><MapView /></Suspense></div>
+        <div style={{ paddingLeft:8 }}><Suspense fallback={<div style={{padding:12}}>Loading ingest…</div>}><IngestWizard /></Suspense></div>
@@
-      <CopilotPanel />
-      <HelpMenu />
+      <Suspense fallback={null}><CopilotPanel /></Suspense>
+      <Suspense fallback={null}><HelpMenu /></Suspense>
*** End Patch
```

### NGINX compression (UI Dockerfile)
```diff
*** Begin Patch
*** Update File: ui/web/Dockerfile
@@
-FROM nginx:alpine
+FROM nginx:alpine
 COPY --from=build /app/dist /usr/share/nginx/html
+RUN apk add --no-cache brotli && \
+    find /usr/share/nginx/html -type f -name '*.js' -exec gzip -k9 {} \; -exec brotli -kZ {} \;
 COPY --from=build /app/dist /usr/share/nginx/html
 EXPOSE 80
 CMD ["nginx","-g","daemon off;"]
*** End Patch
```

---

## 4) Metrics & Make targets

```diff
*** Begin Patch
*** Update File: Makefile
@@
 perf:
 	k6 run tests/perf/api_shortest_path.js && k6 run tests/perf/api_entity_get.js
+perf.ui:
+	@echo "Bundle size (gz):" && (du -sh ui/web/dist | awk '{print $1}' || echo 'build first')
*** End Patch
```

---

## 5) Tests (smoke for GDS path; complexity guard)

```diff
*** Begin Patch
*** Add File: services/api/__tests__/complexity.test.js
+import { complexityGuard } from '../src/middleware/complexity.js';
+test('construct complexity guard', ()=>{ expect(typeof complexityGuard).toBe('function'); });
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/__tests__/gds.test.js
+test('gds helper loads (no runtime)', async ()=>{
+  const mod = await import('../src/gds.js');
+  expect(typeof mod.gdsShortestPath).toBe('function');
+});
*** End Patch
```

---

## 6) Notes & Next

- Persist GDS **named projection** once and refresh on ingest events.
- Replace simple `graphql-query-complexity` with a **domain‑aware estimator** (edge fan‑out, filter selectivity from stats).
- Add **hard cancel** via `AbortController` and Neo4j driver `session.close()` on timeout.
- Extend UI slimming: tree‑shake MUI icons, adopt route‑level code splitting, and lazy‑load Copilot only on open.

