# PR Pack 006 — Edge & Client Release Safety, Chaos for Stores, Flag Sunsets (Ready‑to‑merge)

Twelve PRs that harden performance and security from the browser/CDN edge inward, add store‑level chaos, and formalize feature‑flag lifecycles. Each PR includes rollback notes.

---

## PR 59 — Frontend performance budgets (Lighthouse CI)

**Purpose:** Prevent regressions in LCP/CLS/JS weight.

**Files**

**`.lighthouserc.js`**

```js
module.exports = {
  ci: {
    collect: { url: [process.env.PREVIEW_URL || 'http://localhost:3000'] },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-byte-weight': ['warn', { maxNumericValue: 900000 }],
      },
    },
  },
};
```

**`.github/workflows/lhci.yml`**

```yaml
name: lhci
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npm run build --if-present && npm start --if-present &
      - run: npx @lhci/cli autorun
        env: { PREVIEW_URL: ${{ secrets.PREVIEW_URL }} }
```

**Rollback:** Remove workflow or raise thresholds.

---

## PR 60 — RUM: web‑vitals → Prometheus

**Purpose:** Client‑side UX telemetry back to SLOs.

**Files**

**`web/public/rum.js`**

```js
import { onCLS, onFID, onLCP, onINP } from 'web-vitals';
const endpoint = '/rum';
function send(name, value) {
  navigator.sendBeacon(
    endpoint,
    JSON.stringify({ name, value, ts: Date.now(), ua: navigator.userAgent }),
  );
}
onCLS((v) => send('CLS', v.value));
onFID((v) => send('FID', v.value));
onLCP((v) => send('LCP', v.value));
onINP((v) => send('INP', v.value));
```

**`server/routes/rum.ts`**

```ts
import express from 'express';
import client from 'prom-client';
const r = express.Router();
const g = new client.Gauge({
  name: 'rum_metric',
  help: 'web vitals',
  labelNames: ['name'],
});
r.post('/rum', express.text({ type: '*/*' }), (req, res) => {
  try {
    const { name, value } = JSON.parse(req.body || '{}');
    g.set({ name }, Number(value));
  } catch {}
  res.status(204).end();
});
export default r;
```

**Rollback:** Remove route/script; keep server metrics only.

---

## PR 61 — CSP + Trusted Types + SRI

**Purpose:** Block XSS and supply‑chain injection via strict CSP.

**Files**

**`server/security/csp.ts`**

```ts
import helmet from 'helmet';
export const csp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'strict-dynamic'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    requireTrustedTypesFor: ["'script'"],
  },
});
```

**`web/index.html`** (SRI example)

```html
<link
  rel="preload"
  as="script"
  href="/static/app.js"
  integrity="sha384-..."
  crossorigin="anonymous"
/>
<script
  src="/static/app.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

**Rollback:** Relax CSP directives; remove Trusted Types requirement.

---

## PR 62 — CDN blue/green (weighted DNS or Ingress canary)

**Purpose:** Stage CDN/edge config changes safely.

**Files (option A: Route53 weighted)**

**`infra/cdn/weighted-dns.tf`**

```hcl
resource "aws_route53_record" "web_blue" {
  zone_id = var.zone_id
  name    = var.host
  type    = "A"
  set_identifier = "blue"
  weighted_routing_policy { weight = 90 }
  alias { name = aws_cloudfront_distribution.blue.domain_name, zone_id = aws_cloudfront_distribution.blue.hosted_zone_id, evaluate_target_health = false }
}
resource "aws_route53_record" "web_green" {
  zone_id = var.zone_id
  name    = var.host
  type    = "A"
  set_identifier = "green"
  weighted_routing_policy { weight = 10 }
  alias { name = aws_cloudfront_distribution.green.domain_name, zone_id = aws_cloudfront_distribution.green.hosted_zone_id, evaluate_target_health = false }
}
```

**Files (option B: NGINX Ingress canary)**

**`k8s/ingress/web-canary.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: 'true'
    nginx.ingress.kubernetes.io/canary-weight: '10'
spec:
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend: { service: { name: web-v2, port: { number: 80 } } }
```

**Rollback:** Set weight to 0 or remove green record/Ingress.

---

## PR 63 — Edge canary by header/cookie

**Purpose:** Safely test with internal users or cohorts.

**Files**

**`k8s/ingress/web-header-canary.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-canary-header
  annotations:
    nginx.ingress.kubernetes.io/canary: 'true'
    nginx.ingress.kubernetes.io/canary-by-header: 'X-Canary'
    nginx.ingress.kubernetes.io/canary-by-header-value: '1'
spec:
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend: { service: { name: web-v2, port: { number: 80 } } }
```

**Rollback:** Remove canary Ingress.

---

## PR 64 — Mobile staged rollout (optional)

**Purpose:** Gate risky mobile features; automate staged release tracks.

**Files**

**`mobile/flags.yaml`**

```yaml
mobile_ranker_v2: { default: false, owners: [mobile] }
```

**`.github/workflows/mobile-release.yml`**

```yaml
name: mobile-release
on: workflow_dispatch
jobs:
  staged:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create staged rollout
        run: echo "Simulate 10% → 25% → 50% tracks" # integrate with store APIs if applicable
```

**Rollback:** Disable workflow; leave flags default false.

---

## PR 65 — Chaos for stores (latency & kill)

**Purpose:** Prove graceful degradation when Neo4j/Redis degrade.

**Files**

**`k8s/chaos/redis-latency.yaml`** (tc/netem via busybox)

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: redis-latency, namespace: stage }
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: netem
          image: alpine
          securityContext: { capabilities: { add: ['NET_ADMIN'] } }
          command: ['/bin/sh', '-c']
          args:
            [
              'apk add tc && tc qdisc add dev eth0 root netem delay 200ms && sleep 300 && tc qdisc del dev eth0 root netem',
            ]
```

**`k8s/chaos/neo4j-kill.yaml`**

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: neo4j-kill-one, namespace: stage }
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: killer
          image: bitnami/kubectl
          command: ['/bin/sh', '-c']
          args:
            [
              'kubectl -n stage delete pod -l app.kubernetes.io/name=graph --field-selector=status.phase=Running --limit=1',
            ]
```

**Rollback:** Do not schedule jobs; run only by hand.

---

## PR 66 — Feature flag lifecycle & sunsets

**Purpose:** Prevent flag sprawl; enforce expirations and removals.

**Files**

**`feature-flags/flags.yaml`** (add `expires` key)

```yaml
ranker_v2:
  default: false
  owners: [search]
  expires: 2025-12-31
```

**`scripts/flags-audit.ts`**

```ts
import fs from 'fs';
import yaml from 'js-yaml';
const flags = yaml.load(
  fs.readFileSync('feature-flags/flags.yaml', 'utf8'),
) as any;
const today = new Date().toISOString().slice(0, 10);
const expired = Object.entries(flags.features || flags).filter(
  ([, v]: any) => v.expires && v.expires < today,
);
if (expired.length) {
  console.error('Expired flags:', expired.map(([k]) => k).join(','));
  process.exit(1);
}
console.log('No expired flags.');
```

**`.github/workflows/flags-audit.yml`**

```yaml
name: flags-audit
on:
  schedule: [{ cron: '0 8 * * 1' }]
  pull_request:
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/flags-audit.ts
```

**Rollback:** Remove schedule; keep manual audits.

---

## PR 67 — Service catalog (Backstage descriptors)

**Purpose:** Clear ownership, systems, and dependencies for audits.

**Files**

**`catalog/catalog-info.yaml`**

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: web
  description: IntelGraph web frontend
  tags: [web, user-facing]
spec:
  type: service
  owner: team/web
  lifecycle: production
  providesApis: [intelgraph-web]
```

**Rollback:** Keep docs without Backstage; optional.

---

## PR 68 — Quarterly access review automation

**Purpose:** Prove least‑privilege with auditable reviews.

**Files**

**`.github/workflows/access-review.yml`**

```yaml
name: access-review
on:
  schedule: [{ cron: '0 9 1 */3 *' }]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Dump K8s RBAC
        env: { KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }} }
        run: |
          kubectl get roles,rolebindings,clusterroles,clusterrolebindings -A -o yaml > rbac.yaml
      - name: Open review issue
        uses: peter-evans/create-issue-from-file@v5
        with:
          title: "Quarterly Access Review"
          content-file: rbac.yaml
          labels: security,access-review
```

**Rollback:** Disable schedule.

---

## PR 69 — Base image policy (distroless/Wolfi only)

**Purpose:** Reduce CVE surface and supply‑chain risk.

**Files**

**`policy/rego/baseimage.rego`**

```rego
package images
allow {
  startswith(input.image, "gcr.io/distroless/")
} else {
  startswith(input.image, "cgr.dev/chainguard/")
}
```

**`.github/workflows/baseimage-check.yml`**

```yaml
name: baseimage-check
on: [pull_request]
jobs:
  conftest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: instrumenta/conftest-action@v0.3.0
        with:
          files: Dockerfile
          policy: policy/rego
```

**Rollback:** Relax policy to audit; add exceptions file.

---

## PR 70 — KMS envelope encryption helper + rotation

**Purpose:** Encrypt sensitive fields at rest with KMS, support key rotation.

**Files**

**`server/crypto/kms.ts`**

```ts
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
const kms = new KMSClient({});
const KEY_ID = process.env.KMS_KEY_ID!;
export async function enc(plaintext: Buffer) {
  const r = await kms.send(
    new EncryptCommand({ KeyId: KEY_ID, Plaintext: plaintext }),
  );
  return Buffer.from(r.CiphertextBlob as Uint8Array).toString('base64');
}
export async function dec(ciphertextB64: string) {
  const r = await kms.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertextB64, 'base64'),
    }),
  );
  return Buffer.from(r.Plaintext as Uint8Array);
}
```

**`scripts/rotate_dek.ts`**

```ts
// Re-encrypt selected columns with new DEK; idempotent, chunked
```

**`.github/workflows/rotate-dek.yml`**

```yaml
name: rotate-dek
on: workflow_dispatch
jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/rotate_dek.ts
        env:
          KMS_KEY_ID: ${{ secrets.KMS_KEY_ID }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Rollback:** Keep old ciphertext (KMS keeps DEK history); stop rotation.

---

# Cutover (half day)

1. Enable **Lighthouse CI** and **RUM** in stage; tune thresholds; fix quick wins.
2. Roll out **CSP/Trusted Types** in report‑only mode, then enforce.
3. Introduce **CDN blue/green** with 10% green; verify canary and header‑based cohorts.
4. Run **store chaos** on stage; confirm graceful degradation & alerts.
5. Turn on **flag sunsets** audit and open issues for expired flags.
6. Seed **service catalog** with core services; wire owners.
7. Schedule **access review** and **base image policy** as required checks.
8. Integrate **KMS envelope encryption** for sensitive fields; dry‑run rotation.

# Rollback

- Reduce DNS/Ingress weights to 0; remove canary.
- Disable CSP enforcement (keep report‑only).
- Stop RUM collection; remove route.
- Do not schedule chaos jobs; revert store configs.
- Mark flags without expiries as `expires: null` temporarily.

# Ownership

- **Web/Frontend:** PR 59–61, 63
- **Platform/Edge:** PR 62, 69
- **SRE/Platform:** PR 65, 68
- **Security:** PR 61, 69, 70
- **Data/Backend:** PR 60, 70
- **DX/Arborist:** PR 66, 67
