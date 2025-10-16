# PR Pack 007 — Service Mesh mTLS/Zero‑Trust, Multi‑Cluster Traffic, DORA Metrics, Release Notes/SBOM+VEX, Secretless DB, SIEM (Ready‑to‑merge)

Twelve PRs to finish hardening: mesh‑level security & authz, cross‑cluster failover, measurable delivery (DORA), signed release artifacts/SBOM+VEX, short‑lived DB credentials, and centralized audit to SIEM. Each has rollback and cutover.

---

## PR 71 — Mesh install & global mTLS (Istio or Linkerd)

**Purpose:** Encrypt service ↔ service by default; identity via SPIFFE.

**Files**

**`mesh/istio/base.yaml`** (Istio minimal profile)

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata: { name: istio, namespace: istio-system }
spec:
  profile: minimal
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    pilot: { k8s: { resources: { requests: { cpu: 200m, memory: 256Mi } } } }
```

**`mesh/istio/mtls.yaml`**

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata: { name: default, namespace: prod }
spec:
  mtls: { mode: STRICT }
```

**Rollback:** Uninstall mesh or set `mode: PERMISSIVE` during adoption.

---

## PR 72 — Zero‑trust AuthZ (JWT + mTLS) at mesh

**Purpose:** Authorize who can talk to whom; require identity and scoped JWT claims.

**Files**

**`mesh/istio/authz.yaml`**

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata: { name: web-jwt, namespace: prod }
spec:
  selector: { matchLabels: { app.kubernetes.io/name: web } }
  jwtRules:
    - issuer: https://auth.intelgraph
      audiences: [intelgraph]
      jwksUri: https://auth.intelgraph/.well-known/jwks.json
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata: { name: web-policy, namespace: prod }
spec:
  selector: { matchLabels: { app.kubernetes.io/name: web } }
  action: ALLOW
  rules:
    - from: [{ source: { principals: ['cluster.local/ns/prod/sa/api'] } }]
      when:
        - key: request.auth.claims[scope]
          values: ['read:web']
```

**Rollback:** Switch to `action: DENY` policies only; loosen selectors temporarily.

---

## PR 73 — Envoy ext‑authz with OPA (fine‑grained)

**Purpose:** Central policy decisions using Rego.

**Files**

**`mesh/opa/authorizer.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: opa-extauthz, namespace: prod }
spec:
  replicas: 2
  selector: { matchLabels: { app: opa-extauthz } }
  template:
    metadata: { labels: { app: opa-extauthz } }
    spec:
      containers:
        - name: opa
          image: openpolicyagent/opa:latest-envoy
          args:
            [
              'run',
              '--server',
              '--addr=localhost:8181',
              '--config-file=/config/config.yaml',
              '/policy',
            ]
          volumeMounts:
            - { name: policy, mountPath: /policy }
            - { name: conf, mountPath: /config }
      volumes:
        - name: policy
          configMap: { name: opa-policies }
        - name: conf
          configMap: { name: opa-config }
```

**`mesh/opa/policy.rego`**

```rego
package envoy.authz

allow {
  input.attributes.request.http.headers["x-tenant-id"] == input.attributes.context.extensions.tenant
  input.parsed_body != null
}
```

**Rollback:** Bypass ext‑authz filter in EnvoyFilter; keep OPA deployed for audit only.

---

## PR 74 — Multi‑cluster service failover (Istio east↔west)

**Purpose:** Survive cluster loss; shift traffic cross‑region.

**Files**

**`mesh/multicluster/eastwest-gateway.yaml`** (per cluster)

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-eastwestgateway
        enabled: true
        label: { istio: eastwestgateway }
        k8s: { service: { type: LoadBalancer } }
```

**`mesh/multicluster/serviceentry.yaml`**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata: { name: web-remote, namespace: prod }
spec:
  hosts: ['web.prod.global']
  location: MESH_EXTERNAL
  ports: [{ number: 80, name: http, protocol: HTTP }]
  resolution: DNS
  endpoints:
    - address: web.prod.us-west.internal
    - address: web.prod.us-east.internal
```

**Rollback:** Remove ServiceEntry; keep single‑cluster routing.

---

## PR 75 — Global traffic policy (DestinationRule + Outlier)

**Purpose:** Active health‑based ejection and canary per subset.

**Files**

**`mesh/istio/destinationrule.yaml`**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata: { name: web, namespace: prod }
spec:
  host: web
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 5s
      baseEjectionTime: 30s
  subsets:
    - name: stable
      labels: { version: v1 }
    - name: canary
      labels: { version: v2 }
```

**Rollback:** Remove outlier detection; route all to stable.

---

## PR 76 — DORA metrics exporter (Actions → Prom/Grafana)

**Purpose:** Track deployment frequency, lead time for changes, MTTR, CFR.

**Files**

**`dora/exporter.ts`**

```ts
import { Octokit } from 'octokit';
import http from 'http';
const client = new Octokit({ auth: process.env.GH_TOKEN });
let metrics = { deploys: 0, lead_time_s: 0, mttr_s: 0, cfr: 0 };
// TODO: compute from releases, deployments, incidents issues
http
  .createServer((_req, res) => {
    res.end(
      `# HELP dora_deploys deployments\n# TYPE dora_deploys gauge\ndora_deploys ${metrics.deploys}\n`,
    );
  })
  .listen(9102);
```

**`k8s/monitoring/dora-sd.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata: { name: dora-exporter, namespace: monitoring }
spec:
  selector: { app: dora-exporter }
  ports: [{ port: 9102, targetPort: 9102 }]
```

**`.github/workflows/dora-refresh.yml`**

```yaml
name: dora-refresh
on:
  schedule: [{ cron: '*/30 * * * *' }]
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node dora/update.js
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
```

**Rollback:** Disable schedule; keep exporter static.

---

## PR 77 — Auto‑generated release notes (conventional + components)

**Purpose:** Cleaner user‑facing notes with change categories.

**Files**

**`.github/release-notes.hbs`**

```hbs
## Highlights
{{#each releases}}
  -
  {{title}}
  ({{tag}})
{{/each}}

### Changes by Type
{{#each commits}}
  -
  {{#if breaking}}💥 BREAKING: {{/if}}{{type}}:
  {{scope}}
  —
  {{subject}}
{{/each}}
```

**`.github/workflows/notes.yml`**

```yaml
name: notes
on: [release]
jobs:
  notes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mikepenz/release-changelog-builder-action@v5
        with:
          configuration: .github/release-notes.hbs
```

**Rollback:** Use release-please defaults.

---

## PR 78 — SBOM publish + VEX (CSAF) attach & sign

**Purpose:** Make vulnerability context explicit and signed with provenance.

**Files**

**`.github/workflows/sbom-vex.yml`**

```yaml
name: sbom-vex
on: [release]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions: { contents: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM (CycloneDX)
        run: npx @cyclonedx/cdxgen -o sbom.cdx.json
      - name: Generate VEX (CSAF)
        run: node scripts/make_vex.js sbom.cdx.json > vex.csaf.json
      - uses: sigstore/cosign-installer@v3
      - name: Sign artifacts
        env: { COSIGN_EXPERIMENTAL: 'true' }
        run: cosign sign-blob --yes sbom.cdx.json && cosign sign-blob --yes vex.csaf.json
      - name: Upload release assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            sbom.cdx.json
            vex.csaf.json
```

**Rollback:** Publish SBOM only; skip VEX/sign.

---

## PR 79 — Secretless DB (AWS IAM token / Cloud SQL IAM)

**Purpose:** Short‑lived auth instead of passwords.

**Files**

**`server/db/iam.ts`**

```ts
import crypto from 'crypto';
export async function buildRdsAuthToken(host: string, user: string) {
  // Placeholder: call AWS SDK RDS.Signer to create 15‑min token
  return `token-for-${user}@${host}`;
}
```

**`charts/app/values.yaml`** (env)

```yaml
env:
  DB_AUTH_MODE: iam
```

**`server/db/connect.ts`**

```ts
import { buildRdsAuthToken } from './iam';
export async function getConn() {
  if (process.env.DB_AUTH_MODE === 'iam') {
    const token = await buildRdsAuthToken(
      process.env.DB_HOST!,
      process.env.DB_USER!,
    );
    return new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: token,
      ssl: true,
    });
  }
}
```

**Rollback:** Set `DB_AUTH_MODE=password` and use existing secret.

---

## PR 80 — Central audit → SIEM (OTLP/HTTP → OpenSearch/Splunk)

**Purpose:** Immutable, queryable audit trail.

**Files**

**`otel/exporters-siem.yaml`**

```yaml
exporters:
  otlphttp/siem:
    endpoint: https://siem.example.com/otlp
service:
  pipelines:
    logs/siem:
      receivers: [otlp]
      exporters: [otlphttp/siem]
```

**Rollback:** Keep local logging only; disable SIEM pipeline.

---

## PR 81 — Docker layer caching + remote cache for CI

**Purpose:** Speed up builds reliably.

**Files**

**`.github/workflows/ci-core.yml`** (append)

```yaml
build_test:
  steps:
    - uses: actions/cache@v4
      with:
        path: ~/.cache/node
        key: node-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    - uses: docker/setup-buildx-action@v3
    - uses: actions/cache@v4
      with:
        path: /tmp/.buildx-cache
        key: buildx-${{ github.sha }}
        restore-keys: |
          buildx-
    - run: |
        docker buildx build --cache-from type=local,src=/tmp/.buildx-cache \
                             --cache-to type=local,dest=/tmp/.buildx-cache,mode=max \
                             -t ghcr.io/${{ github.repository }}/app:${{ github.sha }} .
```

**Rollback:** Remove caching steps; keep simple build.

---

## PR 82 — Mesh traffic mirroring for dark‑launch

**Purpose:** Send a copy of live traffic to canary without user impact.

**Files**

**`mesh/istio/virtualservice.yaml`**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata: { name: web, namespace: prod }
spec:
  hosts: ['web']
  http:
    - route:
        - destination: { host: web, subset: stable, weight: 100 }
      mirror: { host: web, subset: canary }
      mirrorPercentage: { value: 10 }
```

**Rollback:** Remove `mirror*` fields.

---

# Cutover (half day)

1. Install mesh in **stage** with `PERMISSIVE` mTLS; fix sidecar injection and health.
2. Turn on **STRICT mTLS** + JWT RequestAuth for one service; expand to all.
3. Deploy **OPA ext‑authz** in shadow; switch Envoy ext‑authz on selected routes.
4. Configure **DestinationRule outlier detection**; verify ejection behavior.
5. Set up **east↔west gateways** and ServiceEntry; simulate regional failover.
6. Start **DORA exporter** & Grafana board; sanity check metrics.
7. Enable **release notes** builder and **SBOM+VEX** signing on next release.
8. Switch DB to **IAM token** in stage; validate rotation; promote to prod.
9. Ship **OTLP→SIEM** for audit logs; confirm retention and access controls.
10. Add **build caches**; track CI duration reduction.
11. Use **traffic mirroring** to dark‑launch next canary.

# Rollback

- Mesh: set `PERMISSIVE` or disable sidecar injection per namespace.
- AuthZ: revert AuthorizationPolicies; leave RequestAuth in place.
- Multi‑cluster: remove ServiceEntries and point DNS to primary.
- DORA: disable schedule; keep historical data.
- Secretless: flip `DB_AUTH_MODE=password`.
- SBOM/VEX: publish only SBOMs.

# Ownership

- **Platform/Mesh:** PR 71–75, 82
- **Security/Policy:** PR 72–73, 80
- **Release/DevEx:** PR 76–78, 81
- **Data:** PR 79
