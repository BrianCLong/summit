# Integration Mega‑Sprint Patch Pack — Code, Helm, Scripts

This pack implements the remaining glue to make the **Unification Release** fully runnable and shippable: unified config renderer, gateway auth middleware + subject propagation, policy inspector UI, ledger search/export endpoints, budget slow‑killer, DSAR web hook, Helm hardening (HPA, PDB, NPs, secrets via CSI), and CI drift checks. Also adds the `make mega` workflow.

---

## 1) Unified Config Renderer

```ts
// tools/config/render.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

type Dict = Record<string, any>;
function resolveVault(s: string) {
  const m = s.match(/^\$\{vault:([^}]+)\}$/);
  if (!m) return s;
  // For dev, read from local .secrets.json; in prod, use Vault CSI/ENV
  const secrets = JSON.parse(
    fs.readFileSync(path.resolve('.secrets.json'), 'utf8'),
  );
  return m ? secrets[m[1]] || '' : s;
}

function flatten(obj: any, out: Dict = {}) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'object' && v && !Array.isArray(v)) flatten(v, out);
    else out[k] = v;
  }
  return out;
}

function renderEnv(env: Dict) {
  const lines = Object.entries(env).map(
    ([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`,
  );
  return lines.join('\n') + '\n';
}

function main() {
  const configPath = path.resolve('config', 'unified.yaml');
  const conf: any = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const common = conf.env.common as Dict;
  const flags = conf.env.flags as Dict;
  // Resolve vault refs
  for (const [k, v] of Object.entries(common))
    if (typeof v === 'string') (common as any)[k] = resolveVault(v);
  // Per‑service maps (env subset)
  const services: Dict = {
    'services/gateway-graphql/.env': [
      'LAC_URL',
      'LEDGER_URL',
      'ANALYTICS_URL',
      'MINER_URL',
      'NL_URL',
      'BUDGET_URL',
      'XAI_URL',
      'FED_URL',
      'WALLET_URL',
      'KEYCLOAK_ISSUER',
      'KEYCLOAK_AUDIENCE',
      'OPA_URL',
    ],
    'services/lac-policy-compiler/.env': [
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'OPA_URL',
      'PORT',
    ],
    'services/prov-ledger/.env': [
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'POSTGRES_URL',
      'PORT',
    ],
    'services/analytics-service/.env': [
      'NEO4J_URL',
      'NEO4J_USER',
      'NEO4J_PASS',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'PORT',
    ],
    'services/pattern-miner/.env': [
      'NEO4J_URL',
      'NEO4J_USER',
      'NEO4J_PASS',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'PORT',
    ],
    'services/ai-nl2cypher/.env': ['OTEL_EXPORTER_OTLP_ENDPOINT', 'PORT'],
    'services/case-service/.env': [
      'LAC_URL',
      'POSTGRES_URL',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'PORT',
    ],
    'services/report-service/.env': ['OTEL_EXPORTER_OTLP_ENDPOINT', 'PORT'],
    'services/runbook-engine/.env': [
      'GATEWAY_URL',
      'ANALYTICS_URL',
      'NL_URL',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'PORT',
    ],
    'services/budget-guard/.env': ['OTEL_EXPORTER_OTLP_ENDPOINT', 'PORT'],
    'services/archive-tier/.env': [
      'S3_ENDPOINT',
      'S3_KEY',
      'S3_SECRET',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'PORT',
    ],
    'services/offline-sync/.env': ['OTEL_EXPORTER_OTLP_ENDPOINT', 'PORT'],
    'services/xai-service/.env': [
      'NEO4J_URL',
      'NEO4J_USER',
      'NEO4J_PASS',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'PORT',
    ],
    'services/federation-service/.env': [
      'NEO4J_URL',
      'NEO4J_USER',
      'NEO4J_PASS',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'PORT',
    ],
    'services/wallet-service/.env': ['OTEL_EXPORTER_OTLP_ENDPOINT', 'PORT'],
    'services/dsar-service/.env': ['OTEL_EXPORTER_OTLP_ENDPOINT', 'PORT'],
  };
  for (const [file, keys] of Object.entries(services)) {
    const env: Dict = {};
    keys.forEach((k: string) => {
      if (common[k] !== undefined) env[k] = common[k];
    });
    Object.assign(env, flags); // include feature flags for all
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, renderEnv(env));
  }
  // Helm values overlay
  const values = {
    imageRepo: 'ghcr.io/ORG/intelgraph',
    commonEnv: common,
    flags,
  };
  fs.mkdirSync('deploy/helm/intelgraph/overlays', { recursive: true });
  fs.writeFileSync(
    'deploy/helm/intelgraph/overlays/values-generated.yaml',
    yaml.dump(values),
  );
  console.log('Rendered per‑service .env and Helm values.');
}
main();
```

Drift check in CI:

```yaml
# .github/workflows/config-drift.yaml
name: config-drift
on: [push, pull_request]
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/config/render.ts
      - run: git diff --exit-code || (echo "Run render.ts and commit generated files" && exit 1)
```

---

## 2) Gateway Auth Middleware + Subject Propagation

```ts
// services/gateway-graphql/src/auth.ts
import jwksRsa from 'jwks-rsa';
import jwt from 'jsonwebtoken';
export async function getContext({ req }: any) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return { subject: { sub: 'anon', roles: ['guest'], attrs: {} } };
  const kid: any = (jwt.decode(token, { complete: true }) as any)?.header?.kid;
  const client = jwksRsa({
    jwksUri: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
  });
  const key = await client.getSigningKey(kid);
  const pub = key.getPublicKey();
  const decoded: any = jwt.verify(token, pub, {
    audience: process.env.KEYCLOAK_AUDIENCE,
    issuer: process.env.KEYCLOAK_ISSUER,
  });
  return {
    subject: {
      sub: decoded.sub,
      roles: decoded.realm_access?.roles || [],
      attrs: { tenant: decoded.tnt, acr: decoded.acr },
    },
  };
}
```

Apply to Apollo:

```ts
// services/gateway-graphql/src/index.ts (add)
import { getContext } from './auth';
// ...
const server = new ApolloServer({ typeDefs, resolvers });
startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT || 7000) },
  context: getContext,
});
```

Propagate subject header to downstream calls:

```ts
// helper
function subHeaders(ctx: any) {
  return {
    'content-type': 'application/json',
    'x-subject': Buffer.from(JSON.stringify(ctx.subject || {})).toString(
      'base64',
    ),
  };
}
```

Use `subHeaders(ctx)` in all `fetch` calls.

Service helper to read subject:

```ts
// services/*/src/subject.ts
export function subjectFrom(req: any) {
  try {
    const raw = req.headers['x-subject'];
    if (!raw) return { sub: 'anon', roles: ['guest'] };
    return JSON.parse(Buffer.from(String(raw), 'base64').toString('utf8'));
  } catch {
    return { sub: 'anon', roles: ['guest'] };
  }
}
```

---

## 3) Budget Slow‑Killer

```ts
// services/gateway-graphql/src/costGuard.ts
export function withCostGuard<T extends (...a: any) => Promise<any>>(
  fn: T,
  budgetMs: number,
) {
  return async (...args: any[]) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), budgetMs * 2); // hard kill at 2x budget
    try {
      const res = await fn(...args, controller);
      return res;
    } finally {
      clearTimeout(t);
    }
  };
}
```

Update analytics/pattern resolvers to accept `AbortController` and pass `signal` to `fetch`.

---

## 4) Ledger Search & Proof Export

```ts
// services/prov-ledger/src/index.ts (add)
app.get('/claims', async (req, res) => {
  const { subjectId, kind, cursor, limit } = req.query as any;
  const take = Math.min(Number(limit || 50), 200);
  const where: any = {};
  if (subjectId) where.subjectId = String(subjectId);
  if (kind) where.kind = String(kind);
  const claims = await prisma.claim.findMany({
    where,
    take,
    skip: Number(cursor || 0),
    orderBy: { createdAt: 'desc' },
  });
  res.json(claims);
});

app.get('/manifests/:id/export', async (req, res) => {
  const m = await prisma.manifest.findUnique({
    where: { id: req.params.id },
    include: { claims: true },
  });
  if (!m) return res.status(404).end();
  const envelope = {
    id: m.id,
    createdAt: m.createdAt,
    rootHash: m.rootHash,
    claims: m.claims.map((c) => ({ id: c.id, hash: c.hash })),
    proof: `W3C-DEMO-${m.rootHash.slice(0, 16)}`,
  };
  res.json(envelope);
});
```

---

## 5) Policy Inspector UI (webapp)

```tsx
// webapp/src/features/policy/PolicyInspector.tsx
import React, { useState } from 'react';
import $ from 'jquery';
export default function PolicyInspector() {
  const [json, setJson] = useState(
    '{"subject":{"sub":"u1","roles":["analyst"]},"resource":{"kind":"doc","sensitivity":"restricted"},"action":"READ","context":{"purpose":"investigation"}}',
  );
  async function run() {
    $.ajax({
      url: '/lac/enforce',
      method: 'POST',
      contentType: 'application/json',
      data: json,
      success: (d) => {
        $('#policy-result').text(JSON.stringify(d, null, 2));
      },
    });
  }
  return (
    <div className="policy-inspector">
      <textarea value={json} onChange={(e) => setJson(e.target.value)} />
      <button onClick={run}>Simulate</button>
      <pre id="policy-result"></pre>
    </div>
  );
}
```

_(Dev server proxies `/lac/_` → LAC service.)\*

---

## 6) DSAR Web Hook in Webapp

```tsx
// webapp/src/features/case/DsarButton.tsx
import React from 'react';
import $ from 'jquery';
export default function DsarButton() {
  function req() {
    $.ajax({
      url: '/dsar/request',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ subjectId: 'E_demo', audience: 'press' }),
      success: (r) => alert('DSAR bundle generated: ' + r.id),
    });
  }
  return <button onClick={req}>Generate DSAR (press)</button>;
}
```

---

## 7) Helm Hardening

### 7.1 HPA (gateway)

```yaml
# deploy/helm/intelgraph/templates/hpa-gateway.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: intelgraph-gateway }
spec:
  scaleTargetRef:
    { apiVersion: apps/v1, kind: Deployment, name: intelgraph-gateway }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        { name: cpu, target: { type: Utilization, averageUtilization: 60 } }
```

### 7.2 PDB

```yaml
# deploy/helm/intelgraph/templates/pdb-core.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: pdb-core }
spec:
  maxUnavailable: 1
  selector: { matchLabels: { app: gateway } }
```

### 7.3 NetworkPolicies (egress lock for gateway)

```yaml
# deploy/helm/intelgraph/templates/netpol-gateway.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: np-gateway }
spec:
  podSelector: { matchLabels: { app: gateway } }
  policyTypes: [Egress]
  egress:
    - to: [{ podSelector: { matchLabels: { app: lac } } }]
    - to: [{ podSelector: { matchLabels: { app: ledger } } }]
  # ...add the rest as needed
```

### 7.4 Secrets via CSI (example)

```yaml
# deploy/helm/intelgraph/templates/secret-neo4j.yaml
apiVersion: v1
kind: Secret
metadata: { name: neo4j-pass }
type: Opaque
stringData: { password: 'REDACTED' } # In prod, sourced from Vault CSI
```

---

## 8) Makefile Mega Target

```make
mega:
	node tools/config/render.ts
	docker compose -f docker-compose.dev.yaml up -d --build
	make seed-synth
	node tools/demo/e2e-demo.ts
	node perf/scripts/run-suite.ts
	curl -s -XPOST localhost:7015/dsar/request -H 'content-type: application/json' -d '{"subjectId":"E_demo","audience":"press"}' | jq '.'
```

---

## 9) CI Additions

```yaml
# .github/workflows/unification-gates.yaml
name: unification-gates
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r test -- --project=contracts
  e2e-mega:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker-compose.dev.yaml up -d --build
      - run: make mega
```

---

## 10) Docs Index (links to all consolidated docs)

```md
# docs/INDEX.md

- Analyst Guide (Tri‑Pane, NL→Cypher, Patterns, XAI)
- Operator Runbook (Deploy, Scale, Observe, Backup/Restore)
- API Reference (GraphQL SDL, REST JSON Schemas)
- Security Pack (OPA policies, STRIDE, DPIA, IR)
- Performance Pack (CPI, tuning)
- Demo Cue Sheets & Datasets
```

---

## 11) Notes

- The renderer assumes a dev `.secrets.json`; replace with Vault CSI in K8s.
- Webapp dev server needs proxies for `/lac/*` and `/dsar/*` to their services.
- NetworkPolicies are illustrative—expand to all service pairs.
- Ensure Jaeger/Prom/Grafana are in the compose and cluster manifests.
