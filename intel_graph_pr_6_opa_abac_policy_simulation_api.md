# IntelGraph – PR‑6 OPA ABAC & Policy Simulation (API)

This package wires **OPA ABAC** into the API for request/field‑level checks and adds a **policy simulation** GraphQL query. Includes Rego examples, API middleware, tests, docker‑compose env, and Makefile helpers.

---

## PR‑6 – Branch & PR

**Branch:** `feature/api-opa-abac`  
**Open PR:**

```bash
git checkout -b feature/api-opa-abac
# apply patches below, commit, push
gh pr create -t "API OPA ABAC + Policy Simulation" -b "OPA‑backed ABAC for queries with field filtering, deny reasons, and a policy simulation query. Includes Rego rules, unit tests, and compose env." -B develop -H feature/api-opa-abac -l prio:P0,area:governance
```

---

## 1) Enhanced Rego policy (field‑level)

```diff
*** Begin Patch
*** Update File: policies/policy.rego
@@
 package intelgraph.authz

 default allow = false

 allow {
   input.user.role == "analyst"
   input.action == "read"
 }

 allow {
   input.user.role == "admin"
 }
+
+# Field‑level allowlist based on sensitivity label
+default allowed_fields = []
+
+allowed_fields := fields {
+  some res
+  res := input.resource
+  # basic example: if resource.sensitivity == "public", allow all
+  res.sensitivity == "public"
+  fields := ["id","kind","props"]
+}
+
+allowed_fields := fields {
+  some res
+  res := input.resource
+  # if sensitivity == "restricted", analysts can see id/kind, but only safe props
+  res.sensitivity == "restricted"
+  input.user.role == "analyst"
+  fields := ["id","kind","props:name","props:summary"]
+}
+
+deny_reason := r {
+  not allow
+  r := "role not permitted for action"
+}
*** End Patch
```

> Note: We keep this simple for the skeleton. Real rules will incorporate `purpose`, `legalBasis`, `license`, and case‑scoped permissions.

---

## 2) API: OPA client + ABAC guard + field filter

```diff
*** Begin Patch
*** Add File: services/api/src/opaClient.js
+export async function opaDecision(input){
+  const url = (process.env.OPA_URL||'http://localhost:8181') + '/v1/data/intelgraph/authz';
+  const res = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ input }) });
+  if(!res.ok){ throw new Error('OPA error '+res.status); }
+  const data = await res.json();
+  return { allow: Boolean(data?.result?.allow ?? data?.result === true),
+           fields: data?.result?.allowed_fields || [],
+           reason: data?.result?.deny_reason || null };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/src/middleware/abac.js
+import { opaDecision } from '../opaClient.js';
+
+export function withABAC(resolver, { action }){
+  return async (parent, args, ctx, info) => {
+    const user = ctx.user || { role: 'analyst' };
+    const resource = ctx.resource || { sensitivity: 'public' };
+    const decision = await opaDecision({ user, action, resource });
+    if(!decision.allow){
+      const e = new Error('Forbidden: '+(decision.reason||'policy'));
+      e.code = 'FORBIDDEN';
+      throw e;
+    }
+    const result = await resolver(parent, args, ctx, info);
+    return filterFields(result, decision.fields);
+  };
+}
+
+function filterFields(value, fields){
+  if(!value || !Array.isArray(fields) || fields.length===0) return value;
+  const allow = new Set(fields);
+  if(Array.isArray(value)) return value.map(v=>filterFields(v, fields));
+  // flatten props:field syntax
+  const pick = {};
+  for(const f of allow){
+    if(f.includes(':')){
+      const [k, sub] = f.split(':');
+      if(value[k] && typeof value[k]==='object'){
+        pick[k] = pick[k] || {};
+        pick[k][sub] = value[k][sub];
+      }
+    } else if (value[f] !== undefined){ pick[f] = value[f]; }
+  }
+  return Object.keys(pick).length ? pick : value;
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/api/src/schema.js
@@
-export const typeDefs = `#graphql
+export const typeDefs = `#graphql
   scalar DateTime
   type Entity { id: ID!, kind: String!, props: JSON }
   type Edge { id: ID!, src: ID!, dst: ID!, rel: String!, validFrom: DateTime, validUntil: DateTime }
   type Query {
     entity(id: ID!): Entity
     shortestPath(src: ID!, dst: ID!): [Entity!]!
+    policySim(action: String!, sensitivity: String!): PolicyDecision!
   }
+
+  type PolicyDecision { allow: Boolean!, fields: [String!]!, reason: String }
 `;
@@
 export const resolvers = {
   Query: {
-    entity: async (_,{id},{driver})=>{
+    entity: withABAC(async (_,{id},{driver})=>{
       const s = driver.session();
       try {
         const res = await s.run("MATCH (n {id:$id}) RETURN n LIMIT 1",{id});
         const n = res.records[0]?.get('n');
         if(!n) return null;
         return { id: n.properties.id, kind: n.labels[0]||'Unknown', props: n.properties };
-      } finally { await s.close(); }
-    },
+      } finally { await s.close(); }
+    }, { action:'read' }),
@@
-    shortestPath: async (_,{src,dst},{driver})=>{
+    shortestPath: withABAC(async (_,{src,dst},{driver})=>{
       const s = driver.session();
       try {
         const res = await s.run(`MATCH (a {id:$src}),(b {id:$dst}),
           p=shortestPath((a)-[*..6]-(b)) RETURN nodes(p) AS ns`,{src,dst});
         const ns = res.records[0]?.get('ns')||[];
         return ns.map(n=>({ id:n.properties.id, kind:n.labels[0]||'Unknown', props:n.properties }));
-      } finally { await s.close(); }
-    }
+      } finally { await s.close(); }
+    }, { action:'read' }),
+
+    policySim: async (_,{action,sensitivity}, { user })=>{
+      const { opaDecision } = await import('./opaClient.js');
+      return opaDecision({ user: user||{role:'analyst'}, action, resource:{ sensitivity } });
+    }
   }
 };
+
+import { withABAC } from './middleware/abac.js';
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/api/src/index.js
@@
-const { url } = await startStandaloneServer(server, {
-  context: async () => ({ driver, logger }),
+const { url } = await startStandaloneServer(server, {
+  context: async ({ req }) => ({
+    driver,
+    logger,
+    user: parseUser(req.headers.get('authorization')),
+    resource: { sensitivity: req.headers.get('x-resource-sensitivity') || 'public' }
+  }),
   listen: { port: Number(process.env.PORT||4000) }
 });
 logger.info({ url }, "api up");
+
+function parseUser(auth){
+  // TODO: JWT; for now honor a simple header: "role <role>"
+  if(!auth) return { role: 'analyst' };
+  const m = /role\s+(\w+)/i.exec(auth);
+  return { role: m?.[1]||'analyst' };
+}
*** End Patch
```

---

## 3) Tests (unit)

```diff
*** Begin Patch
*** Add File: services/api/__tests__/abac.test.js
+import { withABAC } from '../src/middleware/abac.js';
+
+test('denies when OPA says no', async ()=>{
+  const denied = async ()=>({ allow:false, fields:[], reason:'nope' });
+  jest.unstable_mockModule('../src/opaClient.js', ()=>({ opaDecision: denied }));
+  const { withABAC: AB } = await import('../src/middleware/abac.js');
+  await expect(AB(async()=>({secret:1}), {action:'read'})({}, {}, { user:{role:'guest'} })).rejects.toThrow('Forbidden');
+});
*** End Patch
```

(If tests complain about ESM mocking nuances, keep as smoke tests or convert to integration later.)

---

## 4) Compose & env wiring

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   api:
     build: ./services/api
     environment:
       - PORT=4000
       - NEO4J_URI=bolt://neo4j:7687
       - NEO4J_USER=${NEO4J_USER:-neo4j}
       - NEO4J_PASSWORD=${NEO4J_PASSWORD:-neo4j}
       - MAX_COST=1000
+      - OPA_URL=http://opa:8181
     depends_on: [ neo4j, opa ]
     ports: ["4000:4000"]
*** End Patch
```

---

## 5) Makefile helpers

```diff
*** Begin Patch
*** Update File: Makefile
@@
 perf:
 	k6 run tests/perf/api_shortest_path.js && k6 run tests/perf/api_entity_get.js
+policy.sim:
+	curl -s http://localhost:4000/ -H 'content-type: application/json' -d '{"query":"query($a:String!,$s:String!){ policySim(action:$a,sensitivity:$s){ allow fields reason }}","variables":{"a":"read","s":"restricted"}}' | jq .
*** End Patch
```

---

## 6) Usage

- Start stack: `make docker`
- Simulate policy: `make policy.sim`  
  Expect `{ allow: true/false, fields: [..], reason }`.
- Query with ABAC enforced:

```bash
curl -s http://localhost:4000/ \
  -H 'content-type: application/json' \
  -H 'authorization: role analyst' \
  -H 'x-resource-sensitivity: restricted' \
  -H 'apq-id: getEntity' \
  -d '{"variables":{"id":"P1"}}' | jq .
```

---

## 7) Next after merge

- Replace header‑based user parsing with JWT/OIDC (JWKS) and propagate `purpose`, `legalBasis`, `license` in OPA input.
- Add **policy simulation view** in UI (admin‑only) and snapshot policies per release (Prov‑Ledger link).
- Expand Rego for time‑bound access, case scoping, and data‑license compatibility checks.
