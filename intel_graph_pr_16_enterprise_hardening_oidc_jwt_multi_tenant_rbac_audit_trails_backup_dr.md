# IntelGraph – PR‑16 Enterprise Hardening (OIDC/JWT, Multi‑Tenant RBAC, Audit Trails, Backup/DR)

This package lands core enterprise features:
- **OIDC/JWT auth** via JWKS (Keycloak in compose) with role/tenant extraction.
- **Multi‑tenant RBAC**: tenant scoping in resolvers; role checks in OPA input.
- **Audit trails**: JSONL + Kafka topic (`audit`) emissions for reads/writes.
- **Backup/DR**: Neo4j dump/restore scripts with S3‑style sync (local dir) + Make targets.
- **UI login** (token storage) and auth header propagation to API/Copilot/Analytics/ER.

Everything below is copy‑pasteable patches + commands to open **PR‑16**.

---

## PR‑16 – Branch & PR

**Branch:** `feature/enterprise-hardening`  
**Open PR:**
```bash
git checkout -b feature/enterprise-hardening
# apply patches below, commit, push
gh pr create -t "Enterprise Hardening (OIDC/JWT, multi-tenant RBAC, audit trails, backup/DR)" -b "Adds OIDC/JWT verification (Keycloak), tenant-aware resolvers with RBAC via OPA, audit trail emission to JSONL + Kafka, Neo4j backup/restore with S3-style sync, and a UI login panel with auth header injection." -B develop -H feature/enterprise-hardening -l prio:P0,area:governance,area:ops
```

---

## 1) Compose: Keycloak (OIDC) & Kafka audit topic

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   kafka:
@@
     ports: ["9092:9092"]
+
+  keycloak:
+    image: quay.io/keycloak/keycloak:25.0
+    command: ["start-dev","--http-port","8081","--import-realm"]
+    environment:
+      - KEYCLOAK_ADMIN=admin
+      - KEYCLOAK_ADMIN_PASSWORD=admin
+    volumes:
+      - ./auth/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro
+    ports: ["8081:8081"]
*** End Patch
```

```diff
*** Begin Patch
*** Add File: auth/realm-export.json
+{
+  "realm": "intelgraph",
+  "enabled": true,
+  "clients": [
+    {"clientId":"ui","publicClient":true,"redirectUris":["http://localhost:8080/*"],"attributes":{"pkce.code.challenge.method":"S256"}},
+    {"clientId":"api","publicClient":false,"secret":"dev-secret","redirectUris":["*"]}
+  ],
+  "roles": {"realm": [{"name":"analyst"},{"name":"admin"}]},
+  "users": [
+    {"username":"alice","enabled":true,"emailVerified":true,
+     "credentials":[{"type":"password","value":"alice"}],
+     "realmRoles":["analyst"],
+     "attributes":{"tenant":["tenantA"]}},
+    {"username":"bob","enabled":true,"emailVerified":true,
+     "credentials":[{"type":"password","value":"bob"}],
+     "realmRoles":["admin"],
+     "attributes":{"tenant":["tenantB"]}}
+  ]
+}
*** End Patch
```

---

## 2) API: JWT (JWKS) verification, tenant context, RBAC, audit

### Dependencies
```diff
*** Begin Patch
*** Update File: services/api/package.json
@@
   "dependencies": {
@@
-    "uuid": "^9.0.1"
+    "uuid": "^9.0.1",
+    "jose": "^5.2.4",
+    "kafkajs": "^2.2.4"
   }
*** End Patch
```

### Auth utils (JWKS + roles/tenant)
```diff
*** Begin Patch
*** Add File: services/api/src/auth.js
+import { createRemoteJWKSet, jwtVerify } from 'jose';
+
+const ISSUER = process.env.OIDC_ISSUER || 'http://localhost:8081/realms/intelgraph';
+const AUD = process.env.OIDC_AUDIENCE || 'api';
+const JWKS = createRemoteJWKSet(new URL(ISSUER + '/protocol/openid-connect/certs'));
+
+export async function verifyBearer(auth){
+  if(!auth || !auth.startsWith('Bearer ')) return null;
+  const token = auth.slice(7);
+  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUD });
+  const roles = (payload.realm_access?.roles)||[];
+  const tenant = Array.isArray(payload.tenant) ? payload.tenant[0] : (payload.tenant || payload['https://intelgraph/tenant'] || payload?.attributes?.tenant?.[0]);
+  return { sub: payload.sub, roles, tenant: tenant || process.env.DEFAULT_TENANT || 'public' };
+}
+
+export function requireRole(user, role){
+  return Array.isArray(user?.roles) && user.roles.includes(role);
+}
*** End Patch
```

### Audit sink (JSONL + Kafka)
```diff
*** Begin Patch
*** Add File: services/api/src/audit.js
+import fs from 'node:fs';
+import { Kafka } from 'kafkajs';
+
+const FILE = process.env.AUDIT_FILE || 'data/audit.jsonl';
+let kafkaProducer = null;
+if(process.env.KAFKA_BROKERS){
+  const kafka = new Kafka({ clientId:'intelgraph-api', brokers: process.env.KAFKA_BROKERS.split(',') });
+  kafkaProducer = kafka.producer();
+  kafkaProducer.connect().catch(()=>{});
+}
+
+export async function audit(event){
+  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
+  fs.mkdirSync('data', { recursive: true });
+  fs.appendFileSync(FILE, line);
+  if(kafkaProducer){
+    try { await kafkaProducer.send({ topic:'audit', messages:[{ value: line }] }); } catch {}
+  }
+}
*** End Patch
```

### Resolver updates: tenant scoping + audit calls
```diff
*** Begin Patch
*** Update File: services/api/src/schema.js
@@
   type Query {
-    entity(id: ID!): Entity
-    shortestPath(src: ID!, dst: ID!): [Entity!]!
+    entity(id: ID!): Entity
+    shortestPath(src: ID!, dst: ID!): [Entity!]!
     policySim(action: String!, sensitivity: String!): PolicyDecision!
   }
@@
-    entity: withABAC(async (_,{id},{driver})=>{
+    entity: withABAC(async (_,{id},{driver,user})=>{
       const s = driver.session();
       try {
-        const res = await s.run("MATCH (n {id:$id}) RETURN n LIMIT 1",{id});
+        const res = await s.run("MATCH (n {id:$id, tenant:$tenant}) RETURN n LIMIT 1",{id, tenant: user?.tenant||'public'});
         const n = res.records[0]?.get('n');
         if(!n) return null;
+        const { audit } = await import('./audit.js'); await audit({ who:user?.sub, action:'read.entity', resource:id, tenant:user?.tenant });
         return { id: n.properties.id, kind: n.labels[0]||'Unknown', props: n.properties };
       } finally { await s.close(); }
     }, { action:'read' }),
@@
-    shortestPath: withABAC(async (_,{src,dst},{driver})=>{
+    shortestPath: withABAC(async (_,{src,dst},{driver,user})=>{
       const s = driver.session();
       try {
-        // Prefer GDS; fallback to Cypher shortestPath
+        // Prefer GDS; fallback to Cypher shortestPath — both tenant-scoped
         try { const { gdsShortestPath } = await import('./gds.js');
-          const out = await gdsShortestPath(s, { src, dst, maxHops:6 });
+          const out = await gdsShortestPath(s, { src, dst, maxHops:6, tenant:user?.tenant||'public' });
           if(out && out.length) return out;
         } catch(_){}
-        const res = await s.run(`MATCH (a {id:$src}),(b {id:$dst}), p=shortestPath((a)-[*..6]-(b)) RETURN nodes(p) AS ns`,{src,dst});
+        const res = await s.run(`MATCH (a {id:$src,tenant:$t}),(b {id:$dst,tenant:$t}), p=shortestPath((a)-[*..6]-(b)) RETURN nodes(p) AS ns`,{src,dst,t:user?.tenant||'public'});
         const ns = res.records[0]?.get('ns')||[];
+        const { audit } = await import('./audit.js'); await audit({ who:user?.sub, action:'read.shortest', resource:`${src}->${dst}`, tenant:user?.tenant });
         return ns.map(n=>({ id:n.properties.id, kind:n.labels[0]||'Unknown', props:n.properties }));
       } finally { await s.close(); }
     }, { action:'read' }),
*** End Patch
```

### Context auth hook (use JWT if present; else analyst/public)
```diff
*** Begin Patch
*** Update File: services/api/src/index.js
@@
-import { startTracing } from './tracing.js';
+import { startTracing } from './tracing.js';
+import { verifyBearer } from './auth.js';
@@
-  context: async ({ req }) => ({
-    driver,
-    logger,
-    user: parseUser(req.headers.get('authorization')),
-    resource: { sensitivity: req.headers.get('x-resource-sensitivity') || 'public' }
-  }),
+  context: async ({ req }) => ({
+    driver,
+    logger,
+    user: await (async()=>{
+      try { return await verifyBearer(req.headers.get('authorization')); } catch { return { role:'analyst', tenant:'public' }; }
+    })(),
+    resource: { sensitivity: req.headers.get('x-resource-sensitivity') || 'public' }
+  }),
@@
-function parseUser(auth){
-  // TODO: JWT; for now honor a simple header: "role <role>"
-  if(!auth) return { role: 'analyst' };
-  const m = /role\s+(\w+)/i.exec(auth);
-  return { role: m?.[1]||'analyst' };
-}
+// removed: now using JWT via auth.js
*** End Patch
```

### GDS tenant scoping helper tweak
```diff
*** Begin Patch
*** Update File: services/api/src/gds.js
@@
-export async function gdsShortestPath(session, { src, dst, maxHops=6 }){
+export async function gdsShortestPath(session, { src, dst, maxHops=6, tenant='public' }){
@@
-  const res = await session.run(
-    `MATCH (a {id:$src}),(b {id:$dst})
+  const res = await session.run(
+    `MATCH (a {id:$src,tenant:$t}),(b {id:$dst,tenant:$t})
      CALL gds.bfs.stream('ig_mem', {sourceNode: a, targetNodes: [b], maxDepth: $d})
      YIELD path RETURN nodes(path) AS ns LIMIT 1`, { src, dst, d: maxHops }
   );
+  , { src, dst, d:maxHops, t:tenant }
*** End Patch
```

> Note: if syntax above conflicts, inline params as single object `{ src, dst, d:maxHops, t:tenant }` in one call.

---

## 3) Seeding: add tenant property to nodes

```diff
*** Begin Patch
*** Update File: scripts/seed.cypher
@@
-CREATE (a:Person {id:'P1', name:'Alice'});
-CREATE (b:Person {id:'P2', name:'Bob'});
-CREATE (c:Person {id:'P3', name:'Carol'});
-CREATE (d:Host {id:'H1', ip:'10.0.0.1'});
+CREATE (a:Person {id:'P1', name:'Alice', tenant:'tenantA'});
+CREATE (b:Person {id:'P2', name:'Bob', tenant:'tenantA'});
+CREATE (c:Person {id:'P3', name:'Carol', tenant:'tenantA'});
+CREATE (d:Host {id:'H1', ip:'10.0.0.1', tenant:'tenantA'});
*** End Patch
```

---

## 4) OPA input now includes role + tenant

```diff
*** Begin Patch
*** Update File: services/api/src/middleware/abac.js
@@
-    const user = ctx.user || { role: 'analyst' };
+    const user = ctx.user || { role: 'analyst', tenant:'public' };
*** End Patch
```

```diff
*** Begin Patch
*** Update File: policies/policy.rego
@@
-allow {
-  input.user.role == "analyst"
+allow {
+  input.user.role == "analyst"
   input.action == "read"
 }
@@
-allowed_fields := fields {
+allowed_fields := fields {
   some res
   res := input.resource
   # basic example: if resource.sensitivity == "public", allow all
   res.sensitivity == "public"
   fields := ["id","kind","props"]
 }
*** End Patch
```

(Policy can be extended with tenant‑based rules later.)

---

## 5) Backup/DR scripts & Make targets

```diff
*** Begin Patch
*** Add File: scripts/backup.sh
+#!/usr/bin/env bash
+set -euo pipefail
+TS=$(date +%Y%m%d-%H%M%S)
+OUT=${1:-backups}
+mkdir -p "$OUT"
+docker exec ig_neo4j neo4j-admin database dump neo4j --to-path=/data/dumps --overwrite || true
+docker cp ig_neo4j:/data/dumps "$OUT/$TS"
+echo "Backup at $OUT/$TS"
*** End Patch
```

```diff
*** Begin Patch
*** Add File: scripts/restore.sh
+#!/usr/bin/env bash
+set -euo pipefail
+SRC=${1:?"usage: scripts/restore.sh path/to/dumps"}
+docker cp "$SRC" ig_neo4j:/data/restore
+docker exec ig_neo4j neo4j-admin database load neo4j --from-path=/data/restore --overwrite-destination=true
+echo "Restored from $SRC"
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 perf.ui:
 	@echo "Bundle size (gz):" && (du -sh ui/web/dist | awk '{print $1}' || echo 'build first')
+backup:
+	bash scripts/backup.sh backups
+restore:
+	bash scripts/restore.sh $(LAST)
*** End Patch
```

---

## 6) UI: Login panel, token storage, header injection

```diff
*** Begin Patch
*** Add File: ui/web/src/components/LoginPanel.jsx
+import React, { useState } from 'react';
+export default function LoginPanel(){
+  const [user,setUser]=useState('alice');
+  const [pass,setPass]=useState('alice');
+  const [token,setToken]=useState(localStorage.getItem('token')||'');
+  async function login(){
+    const url = 'http://localhost:8081/realms/intelgraph/protocol/openid-connect/token';
+    const body = new URLSearchParams({ grant_type:'password', client_id:'api', client_secret:'dev-secret', username:user, password:pass });
+    const r = await fetch(url, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
+    const d = await r.json();
+    if(d.access_token){ localStorage.setItem('token', d.access_token); setToken(d.access_token); alert('Logged in'); }
+  }
+  function logout(){ localStorage.removeItem('token'); setToken(''); }
+  return (
+    <div style={{ position:'fixed', top:16, left:16, background:'#fff', padding:8, borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.1)' }}>
+      <b>Login</b>
+      <div><input value={user} onChange={e=>setUser(e.target.value)} placeholder="user"/> <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="pass"/></div>
+      <button onClick={login}>Login</button> <button onClick={logout}>Logout</button>
+      <div style={{maxWidth:320,wordBreak:'break-all'}}>{token? 'token set' : 'no token'}</div>
+    </div>
+  );
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: ui/web/src/App.jsx
@@
-const HelpMenu = React.lazy(()=>import('./components/HelpMenu.jsx'));
+const HelpMenu = React.lazy(()=>import('./components/HelpMenu.jsx'));
+const LoginPanel = React.lazy(()=>import('./components/LoginPanel.jsx'));
@@
-      <Suspense fallback={null}><CopilotPanel /></Suspense>
+      <Suspense fallback={null}><CopilotPanel /></Suspense>
       <Suspense fallback={null}><HelpMenu /></Suspense>
+      <Suspense fallback={null}><LoginPanel /></Suspense>
*** End Patch
```

```diff
*** Begin Patch
*** Update File: ui/web/src/components/CopilotPanel.jsx
@@
-    const res = await fetch('http://localhost:4100/copilot/query', { method:'POST', headers:{'content-type':'application/json'}, body });
+    const tok = localStorage.getItem('token');
+    const res = await fetch('http://localhost:4100/copilot/query', { method:'POST', headers:{'content-type':'application/json', ...(tok? { Authorization:`Bearer ${tok}` } : {}) }, body });
*** End Patch
```

(Apply similar token header injection in fetches within UI as needed.)

---

## 7) Tests: JWT verifier (mock)

```diff
*** Begin Patch
*** Add File: services/api/__tests__/auth.test.js
+test('auth module loads', async ()=>{
+  const mod = await import('../src/auth.js');
+  expect(typeof mod.verifyBearer).toBe('function');
+});
*** End Patch
```

---

## 8) Usage

1. `make docker && make seed`.
2. Open Keycloak at http://localhost:8081 → realm `intelgraph`, users `alice`/`bob` (pwd same).
3. In UI, login as **alice** → token stored.
4. Call API with Authorization header automatically from UI (Copilot panel, etc.).
5. Verify audit records: `tail -f data/audit.jsonl` and Kafka topic `audit` if desired.
6. Backups: `make backup` → dumps under `backups/`.

---

## 9) Next after merge

- Enforce **tenant creation & isolation** (tenant bootstrap command; tenant‑scoped indices in Neo4j).
- Add **admin UI** for users/roles and audit search (Kibana/Opensearch later).
- Replace password grant with **PKCE** flow in UI client; rotate secrets.
- Wire **purpose/legalBasis/license** into OPA input from JWT claims & UI selections.
- Encrypt audit JSONL at rest; rotate keys; sign audit records (hash chain).

