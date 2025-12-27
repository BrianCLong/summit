# Conductor Summary — v24.1 Verification & Release

**Goal.** Validate hardening work from E1–E7 and ship **v24.1.0** with evidence that SLOs, policy, and cost controls hold under load.

**SLOs.** Read p95 ≤ 350 ms; Write p95 ≤ 700 ms; Error‑rate ≤ 0.1%; Sub fan‑out p95 ≤ 250 ms; Ingest pre‑storage p95 ≤ 100 ms.

**Definition of Done.** All ACs met; CI gates green (tests+OPA+SBOM+vuln+k6+sub‑fanout); evidence bundle attached; runbooks & dashboards updated.

---

# 1) k6 Read/Write Tests

**File:** `.maestro/tests/k6/graphql_read.js`

```js
import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 50, duration: '3m' };
const url = __ENV.GRAPHQL_URL;
const jwt = __ENV.JWT;
export default function () {
  const payload = JSON.stringify({
    query:
      'query($t:ID!){ tenantCoherence(tenantId:$t){ score status updatedAt } }',
    variables: { t: 'tenant-123' },
  });
  const res = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  });
  check(res, { 200: (r) => r.status === 200 });
}
```

**File:** `.maestro/tests/k6/graphql_write.js`

```js
import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 20, duration: '3m' };
const url = __ENV.GRAPHQL_URL;
const jwt = __ENV.JWT;
export default function () {
  const payload = JSON.stringify({
    query:
      'mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }',
    variables: {
      input: {
        tenantId: 'tenant-123',
        type: 'k6',
        value: Math.random(),
        source: 'k6',
        ts: new Date().toISOString(),
      },
    },
  });
  const res = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  });
  check(res, { 200: (r) => r.status === 200 });
}
```

---

# 2) Subscription Fan‑out Latency Test (Node)

**File:** `.maestro/tests/subscription_fanout.js`

```js
// Measures server→client latency by publishing signals and timing Socket.IO events
const { io } = require('socket.io-client');
const fetch = require('node-fetch');
const url = process.env.GRAPHQL_URL; // e.g., http://localhost:4000/graphql
const subUrl = process.env.SUB_URL || url.replace('/graphql', '');
const jwt = process.env.JWT;
const tenant = process.env.TENANT_ID || 'tenant-123';
const runs = Number(process.env.RUNS || 200);

function now() {
  return Date.now();
}

async function publish(value) {
  const body = {
    query:
      'mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }',
    variables: {
      input: {
        tenantId: tenant,
        type: 'subtest',
        value,
        source: 'fanout',
        ts: new Date().toISOString(),
      },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('publish failed ' + res.status);
}

(async () => {
  const socket = io(subUrl, {
    auth: { token: jwt },
    transports: ['websocket'],
  });
  const lats = [];
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('connect timeout')),
      10000,
    );
    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.on('connect_error', reject);
  });
  socket.emit('subscribe', { tenantId: tenant });
  socket.on('coherenceEvents', async (evt) => {
    if (evt && evt._t0) lats.push(now() - evt._t0);
    if (lats.length >= runs) {
      socket.close();
      const p95 = quantile(lats, 0.95);
      const p99 = quantile(lats, 0.99);
      const out = { count: lats.length, p95_ms: p95, p99_ms: p99 };
      console.log(JSON.stringify(out));
      require('fs').writeFileSync('fanout.json', JSON.stringify(out, null, 2));
      process.exit(p95 > 250 ? 1 : 0);
    }
  });
  // warmup
  for (let i = 0; i < runs; i++) {
    await publish(Math.random());
    // mark time origin for latency calc; server should echo _t0 back in event for precision
    socket.emit('t0', { _t0: now(), tenantId: tenant });
    await new Promise((r) => setTimeout(r, 10));
  }
})();

function quantile(arr, q) {
  const a = arr.slice().sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return a[base + 1] !== undefined
    ? a[base] + rest * (a[base + 1] - a[base])
    : a[base];
}
```

> **Server note:** include `_t0` passthrough on the emitted event to measure end‑to‑end latency precisely.

---

# 3) CI Gates Add‑Ons (v24.1)

**File:** `.github/workflows/ci.yml` (fragments to add)

```yaml
slo-k6-read:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/k6-action@v0
      with:
        {
          filename: .maestro/tests/k6/graphql_read.js,
          flags: --out json=read.json,
        }
    - run: node .maestro/scripts/parse-k6.js --p95 350 --errorRate 0.1
    - uses: actions/upload-artifact@v4
      with: { name: slo-read, path: read.json }

slo-k6-write:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/k6-action@v0
      with:
        {
          filename: .maestro/tests/k6/graphql_write.js,
          flags: --out json=write.json,
        }
    - run: node .maestro/scripts/parse-k6.js --p95 700 --errorRate 0.1
    - uses: actions/upload-artifact@v4
      with: { name: slo-write, path: write.json }

sub-fanout:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm i socket.io-client node-fetch@2
    - run: node .maestro/tests/subscription_fanout.js
```

---

# 4) Evidence Bundle (v24.1)

```
.evidence/
  v24.1/
    slo/
      read.json
      write.json
      fanout.json
    policy/
      opa_report.json
    security/
      sbom.syft.json
      vulns.grype.json
    ops/
      dashboards/
        grafana-v24-slos.json
      alerts/
        slo-burn-rate.yaml
```

---

# 5) PR Body — v24.1

**File:** `PR_BODY_v24.1.md`

```md
**Title:** v24.1 — Hardening & Ops (E1–E7)

### What

- Complete ingest scaffolds; Redis cache; RPS limiter; residency guard; fine‑grained scopes; retention dry‑run; subscription metrics; trace sampling; chaos hooks.

### Why

- Improve resilience, cost, and policy assurances; validate end‑to‑end SLOs.

### SLOs

- Read p95 ≤ 350 ms; Write p95 ≤ 700 ms; Err ≤ 0.1%; Sub fan‑out p95 ≤ 250 ms; Ingest p95 ≤ 100 ms pre‑storage.

### Evidence

- Attach `.evidence/v24.1/*` from CI artifacts.

### Rollback

- Feature flag off `v24.coherence=false`; Helm rollback; disable cache layer.
```

---

# 6) Release Notes — v24.1

**File:** `RELEASE_NOTES_v24.1.md`

```md
**Release:** v24.1 — Hardening & Operations
**Date:** 2025‑**‑**

## Highlights

- Ingest reliability & idempotency hooks
- Redis caching + RPS limiter
- Residency guard + fine‑grained scopes
- Subscription latency metric; trace sampling

## SLO Validation

- Read p95: \_**\_ Write p95: \_\_** Error‑rate: \_**\_ Sub p95: \_\_** Ingest p95: \_\_\_\_

## Ops Notes

- Feature flags unchanged; same rollback path as v24.0.0
```

---

# 7) Quick Commands

```bash
# RC
git checkout -b release/v24.1 && git add . && git commit -m "v24.1: verification pack" && git push origin release/v24.1
git tag -a v24.1.0-rc1 -m "v24.1 RC" && git push origin v24.1.0-rc1

# Prod
git tag -a v24.1.0 -m "v24.1 Hardening & Ops" && git push origin v24.1.0
```
