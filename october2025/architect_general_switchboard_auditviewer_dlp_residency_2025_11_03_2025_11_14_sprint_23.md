# Architect-General — Audit Viewer, DLP++ & Residency Routing

**Workstream:** Switchboard Platform — Governed Experiences & Resilience  
**Sprint Window:** 2025-11-03 → 2025-11-14 (10 biz days)  
**Ordinal:** Sprint 23 (Q4’25 cadence)  
**Prime Objective:** Turn security & policy into **clear user experiences** and **provable controls**: ship an Audit Viewer, advanced DLP (dictionary+entropy), signed policy bundles with startup verification, multi‑region residency routing, page‑level performance budgets, and DR game‑day automation.

---

## 0) Executive Summary

- **Track A (Now‑value):** Audit Viewer UI + export; advanced DLP; residency routing (US/EU) with graceful UX; Lighthouse CI budgets per page; DR restore drill; chaos‑lite canary.
- **Track B (Moat):** Signed policy bundles + init verification; SSO federation attestations → ABAC mapping; evidence automation expansion (Lighthouse, chaos, DR artifacts).

**Definition of Done:**

- Viewer queries/export works with filters; DLP blocks/logs PII with low FP; region routing enforced; OPA bundles verified at pod start; page budgets enforced in CI; DR drill pass with RPO≤15m / RTO≤30m; evidence archived.

---

## 1) Objectives & Key Results

**OBJ‑1: Audit Viewer & Export UX**

- **KR1.1** Filterable grid (subject/action/decision/trace/time) with server pagination.
- **KR1.2** Export current view → NDJSON + manifest (SHA256, count).
- **KR1.3** Deep‑link by traceId and copy‑to‑clipboard.

**OBJ‑2: Advanced DLP (Dictionary + Entropy)**

- **KR2.1** Dictionary rules (`security/dlp/dictionary.yaml`) + entropy detector for secrets/tokens.
- **KR2.2** Runtime redactor v2 with structured schema mapping; **drop at source**.
- **KR2.3** CI DLP scanner over repo and built assets; budgeted allow‑list with expiry.

**OBJ‑3: Residency Routing (US/EU)**

- **KR3.1** Edge/router middleware detects region → routes to region‑scoped API.
- **KR3.2** UX present: region badge + remediation CTA; policy‑consistent denies.
- **KR3.3** Synthetic probes per region; fail‑safe fallback rules documented.

**OBJ‑4: Signed Policy Bundles (OPA) + Startup Verification**

- **KR4.1** Build signed bundle (cosign over `bundle.tar.gz`) in CI.
- **KR4.2** InitContainer verifies signature & provenance before mounting to OPA.
- **KR4.3** Attest verification evidence stored; deploy fails on verify error.

**OBJ‑5: Page‑Level Performance Budgets**

- **KR5.1** Lighthouse CI with per‑route budgets (TTFB, LCP, CLS, JS bytes).
- **KR5.2** Budgets enforced in PRs; failing PRs blocked.
- **KR5.3** Trend artifact published per commit.

**OBJ‑6: Resilience — DR & Chaos‑lite**

- **KR6.1** Automated DB backup (audit store) + restore runbook validated in staging.
- **KR6.2** Chaos‑lite: kill one pod + add 400ms latency → SLOs hold; auto‑rollback verified.
- **KR6.3** Evidence pack (screenshots, logs, hashes) archived.

---

## 2) Work Breakdown & Owners

| #   | Epic      | Issue                     | Owner   | Acceptance                             | Evidence                      |
| --- | --------- | ------------------------- | ------- | -------------------------------------- | ----------------------------- |
| A   | Audit UX  | Grid, filters, export     | FE      | Pagination ≤300ms p95, export manifest | Video + artifact hashes       |
| B   | DLP       | Dict+entropy + CI scanner | SecEng  | Zero PII in sampled logs               | CI logs, allow‑list diffs     |
| C   | Residency | Edge router + UX          | AppEng  | Region‑scoped requests, probes green   | Synthetic reports             |
| D   | Policy    | Sign+verify bundles       | SRE     | Deploy blocks if verify fails          | Cosign logs, attest report    |
| E   | Perf      | Lighthouse budgets        | FE      | All budgets pass on PR                 | LHCI HTML, JSON trends        |
| F   | DR/Chaos  | Backup/restore + chaos    | ProdOps | RPO≤15m, RTO≤30m                       | Runbook, timestamps, SLO burn |

---

## 3) Implementation Artifacts (Drop‑in)

### 3.1 Audit Viewer UI (Next.js + shadcn)

```tsx
// apps/web/src/app/audit/page.tsx
import { useState, useEffect } from 'react';
export default function AuditPage() {
  const [q, setQ] = useState({
    page: 1,
    pageSize: 50,
    action: '',
    decision: '',
    traceId: '',
    from: '',
    to: '',
  });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  async function load() {
    const url = '/api/audit/query?' + new URLSearchParams(q as any);
    const r = await fetch(url).then((r) => r.json());
    setRows(r.rows);
    setTotal(r.total);
  }
  useEffect(() => {
    load();
  }, [q]);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Audit Viewer</h1>
      {/* filters */}
      <div className="grid grid-cols-6 gap-2">
        <input
          placeholder="action"
          onChange={(e) => setQ({ ...q, action: e.target.value, page: 1 })}
        />
        <input
          placeholder="decision"
          onChange={(e) => setQ({ ...q, decision: e.target.value, page: 1 })}
        />
        <input
          placeholder="traceId"
          onChange={(e) => setQ({ ...q, traceId: e.target.value, page: 1 })}
        />
        <input
          type="datetime-local"
          onChange={(e) => setQ({ ...q, from: e.target.value })}
        />
        <input
          type="datetime-local"
          onChange={(e) => setQ({ ...q, to: e.target.value })}
        />
        <button
          onClick={() =>
            (window.location.href =
              '/api/audit/export?' + new URLSearchParams(q as any))
          }
          className="rounded-2xl px-3 py-2 shadow"
        >
          Export
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ts</th>
            <th>traceId</th>
            <th>subject</th>
            <th>action</th>
            <th>decision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-b">
              <td>{new Date(r.ts).toLocaleString()}</td>
              <td className="font-mono">{r.trace_id}</td>
              <td>{r.subject?.user?.id}</td>
              <td>{r.action}</td>
              <td>{r.decision}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <button onClick={() => setQ({ ...q, page: Math.max(1, q.page - 1) })}>
          Prev
        </button>
        <span>Page {q.page}</span>
        <button onClick={() => setQ({ ...q, page: q.page + 1 })}>Next</button>
      </div>
    </div>
  );
}
```

**Query API**

```ts
// apps/web/src/app/api/audit/query/route.ts
import { db } from '@/lib/db';
export async function GET(req: Request) {
  const u = new URL(req.url);
  const page = Number(u.searchParams.get('page') || '1');
  const pageSize = Math.min(
    Number(u.searchParams.get('pageSize') || '50'),
    200,
  );
  const where = [] as string[];
  const args: any[] = [];
  for (const k of ['action', 'decision', 'traceId']) {
    const v = u.searchParams.get(k);
    if (v) {
      where.push(
        `${k === 'traceId' ? 'trace_id' : k} ilike $${where.length + 1}`,
      );
      args.push('%' + v + '%');
    }
  }
  if (u.searchParams.get('from')) {
    where.push('ts >= $' + (args.length + 1));
    args.push(u.searchParams.get('from'));
  }
  if (u.searchParams.get('to')) {
    where.push('ts <= $' + (args.length + 1));
    args.push(u.searchParams.get('to'));
  }
  const w = where.length ? 'where ' + where.join(' and ') : '';
  const rows = await db.query(
    `select * from audit_events ${w} order by ts desc limit ${pageSize} offset ${(page - 1) * pageSize}`,
    args,
  );
  const total = (
    await db.query(`select count(*) from audit_events ${w}`, args)
  )[0].count;
  return Response.json({ rows, total });
}
```

**Export API**

```ts
// apps/web/src/app/api/audit/export/route.ts
export async function GET(req: Request) {
  // reuse filters, stream NDJSON; emit manifest header: x-export-sha256, x-export-count
}
```

### 3.2 DLP Dictionary + Entropy

**Dictionary (`security/dlp/dictionary.yaml`)**

```yaml
patterns:
  - name: email
    match: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
  - name: phone
    match: /\+?[0-9][0-9\-\.\(\)\s]{7,}/
  - name: ssn
    match: /\b\d{3}-?\d{2}-?\d{4}\b/
  - name: jwt
    match: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/
  - name: api_key
    match: /(AKIA|sk[_-]|xox[baprs]-)[A-Za-z0-9]{10,}/
```

**Entropy Detector (`apps/shared/entropy.ts`)**

```ts
export function shannonEntropy(s: string) {
  const m = new Map<string, number>();
  for (const c of s) {
    m.set(c, (m.get(c) || 0) + 1);
  }
  const len = s.length;
  let H = 0;
  for (const [, n] of m) {
    const p = n / len;
    H += -p * Math.log2(p);
  }
  return H;
}
export function looksLikeSecret(s: string) {
  return s.length > 20 && shannonEntropy(s) > 3.5;
}
```

**Runtime Redactor v2**

```ts
import dict from 'security/dlp/dictionary.yaml';
import { looksLikeSecret } from '@/apps/shared/entropy';
export function redactDeep(obj: any) {
  /* walk object; apply dict + entropy; replace with [REDACTED:<rule>] */
}
```

**CI DLP Scanner (`.github/workflows/dlp-scan.yml`)**

```yaml
name: dlp-scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Repo scan
        run: node scripts/dlp-scan.js
      - name: Build assets scan
        run: |
          npm --prefix apps/web ci && npm --prefix apps/web run build
          node scripts/dlp-scan.js apps/web/.next/**
```

### 3.3 Residency Routing

**Edge Middleware**

```ts
// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
export function middleware(req: any) {
  const region =
    req.geo?.country === 'DE' || req.geo?.continent === 'EU' ? 'EU' : 'US';
  const url = new URL(req.url);
  url.hostname =
    region === 'EU'
      ? 'eu.api.switchboard.example.com'
      : 'us.api.switchboard.example.com';
  req.headers.set('x-region', region);
  return NextResponse.rewrite(url);
}
```

**UX Badge**

```tsx
export function RegionBadge({ region }: { region: 'US' | 'EU' }) {
  return (
    <span className="px-2 py-1 rounded-2xl bg-slate-100">Region: {region}</span>
  );
}
```

**Probes**

```yaml
# ops/synthetics/probe.residency.yaml
probes:
  - name: us-home
    url: https://switchboard.example.com/
    headers: { x-region: US }
    expect_status: 200
  - name: eu-home
    url: https://switchboard.example.com/
    headers: { x-region: EU }
    expect_status: 200
```

### 3.4 Signed Policy Bundles

**Bundle Build & Sign (CI)**

```bash
# scripts/build-policy-bundle.sh
set -euo pipefail
mkdir -p dist
opa build -b policies -t tar.gz -o dist/switchboard.bundle.tar.gz
cosign sign-blob --yes dist/switchboard.bundle.tar.gz > dist/switchboard.bundle.sig
sha256sum dist/switchboard.bundle.tar.gz > dist/switchboard.bundle.sha256
```

**Verify InitContainer (Helm template excerpt)**

```yaml
initContainers:
  - name: verify-policy-bundle
    image: ghcr.io/org/verify-tool:latest
    env:
      - name: COSIGN_EXPERIMENTAL
        value: '1'
    command: ['/bin/sh', '-c']
    args:
      - >-
        cosign verify-blob --yes --signature /policy/switchboard.bundle.sig /policy/switchboard.bundle.tar.gz
    volumeMounts:
      - name: policy
        mountPath: /policy
```

**OPA Start with Verified Bundle**

```yaml
- name: opa
  image: openpolicyagent/opa:0.65.0-rootless
  args: ['run', '--server', '--bundle', '/policy/switchboard.bundle.tar.gz']
```

**CI Step**

```yaml
- name: Build+Sign policy bundle
  run: scripts/build-policy-bundle.sh
- name: Upload bundle artifacts
  uses: actions/upload-artifact@v4
  with: { name: policy-bundle, path: dist/ }
```

### 3.5 Lighthouse CI Budgets

**`lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "url": ["/", "/audit", "/agents"],
      "startServerCommand": "npm --prefix apps/web run start"
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-byte-weight": ["error", { "maxNumericValue": 400000 }]
      }
    }
  }
}
```

**Action**

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    configPath: lighthouserc.json
```

### 3.6 DR & Chaos‑lite

**Scheduled Backups (Postgres)**

```yaml
# infra/cron/pg-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: audit-pg-backup }
spec:
  schedule: '*/15 * * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: pgdump
              image: postgres:16
              args:
                [
                  '/bin/sh',
                  '-c',
                  'pg_dump $PGURL | gzip > /backup/audit-$(date +%s).sql.gz',
                ]
              env:
                [
                  {
                    name: PGURL,
                    valueFrom: { secretKeyRef: { name: audit-db, key: url } },
                  },
                ]
              volumeMounts: [{ name: backup, mountPath: /backup }]
          restartPolicy: OnFailure
          volumes:
            [
              {
                name: backup,
                persistentVolumeClaim: { claimName: audit-backups },
              },
            ]
```

**Restore Runbook (`ops/runbooks/dr-restore.md`)**

```md
# DR Restore — Audit DB

- Objective: RPO≤15m, RTO≤30m

1. Identify latest backup: `kubectl exec -it backup-pod -- ls -t /backup | head -1`
2. Restore: `gunzip -c /backup/<FILE> | psql $PGURL`
3. Validate: run `/api/audit/query?limit=1` and compare counts vs pre‑incident.
4. Evidence: record timestamps, rows restored, hash of backup file.
```

**Chaos‑lite GitHub Action**

```yaml
name: chaos-lite
on: workflow_dispatch
jobs:
  kill-one-pod:
    runs-on: ubuntu-latest
    steps:
      - name: Kill a pod
        run: kubectl delete pod -l app=switchboard -n prod --grace-period=0 --force
      - name: Inject latency (staging)
        run: kubectl annotate deploy/switchboard traffic.sidecar.istio.io/latency=400ms --overwrite
      - name: Synthetics + SLO gate
        run: ./ops/bin/run-probes ops/synthetics/probe.residency.yaml && ./ops/bin/check-slo ops/slo/switchboard.slo.yaml
```

---

## 4) Test Strategy

- **Unit:** DLP detector; export manifest; router middleware; bundle verify script.
- **Integration:** Audit query pagination; export hash validation; residency probes; signed bundle startup fail‑path.
- **Security:** DLP CI scan; dependency scan continues; verify that bundles are required (no unsigned start).
- **Performance:** Lighthouse CI budgets; p95 latency measured during chaos‑lite.

---

## 5) Acceptance Checklist (DoR → DoD)

- [ ] Audit Viewer filters + export with manifest hashes.
- [ ] DLP v2 on by default; CI scanner clean or waivers with expiry.
- [ ] Residency routing live; probes for US/EU green.
- [ ] Policy bundle signed + verified at startup (init container gate).
- [ ] LHCI budgets enforced; PRs blocked on regressions.
- [ ] DR drill completed; RPO/RTO met; evidence archived.

---

## 6) Risks & Mitigations

- **Edge geo mis‑classification** → allow manual region override + sticky session; log discrepancies to audit.
- **DLP false positives** → scoped allow‑list per route/component with TTL and PR approval.
- **Bundle verify tool drift** → pin cosign version; add self‑test on CI.

---

## 7) Evidence Hooks

- **LHCI report URL:** …
- **Cosign verify log (bundle):** …
- **Chaos‑lite SLO snapshot:** …
- **Backup/restore timestamps:** …
- **Export manifest SHA256:** …

---

## 8) Backlog Seed (Sprint 24)

- Audit Viewer advanced search (Lucene‑like); policy bundle transparency log; multi‑cloud region routing; SSO federation (OIDC/SAML) attribute mapper UI; inline DLP explanations; automated DR on‑push simulations; canary scoring with user journey weights.
