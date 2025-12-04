# Sprint 21 — Ecosystem & Enterprise (Mar 23–Apr 3, 2026)

**Theme:** Ship a Plugin & Webhook SDK, STIX/TAXII & SIEM integrations, lifecycle/retention controls, and billing/metering with scoped tokens and auditable flows.

## 1) Sprint Goals

- Plugin SDK (server + UI) so partners can add ingest/enrich/visual widgets without touching core.
- Outbound Webhooks with signing & retries; first-class events (share, export, alert, case updates).
- Threat Intel Pipelines: STIX 2.1 ingest + TAXII 2.1 poller; SIEM sinks (Splunk HEC, Elastic Ingest).
- Lifecycle & Retention: per-workspace policies (legal hold, retention days, redaction-on-expiry).
- Billing/Metering (MVP): usage counters (seats, queries, exports, storage), plan limits, and overage alerts.

## 2) Epics → Stories (Definition of Done)

### Epic A — Plugin SDK (server + UI)
- **A1. Server Plugin API:** register connectors, enrichers, playbook steps. **DoD:** example plugin “url-screenshot” loads via config; sandboxed; crash isolated.
- **A2. UI Widget API:** embeddable panel modules (e.g., “Entity Overview Card”). **DoD:** example widget renders in tri-pane; RBAC respected; unload cleans up listeners.
- **A3. Packaging & Signing:** zip manifest with checksum; allow-list per workspace. **DoD:** unsigned plugins rejected; audit(entry: install/update/remove).

### Epic B — Webhooks & Events
- **B1. Event Bus → Delivery:** durable queue, exponential backoff, HMAC-SHA256 signing. **DoD:** 99.9% delivery on green endpoints; DLQ with replay; 5xx retries with jitter.
- **B2. Event Catalog:** `case.created`, `alert.triaged`, `share.created`, `export.completed`, `risk.updated`. **DoD:** schema docs + sample payloads; versioned contracts.
- **B3. Endpoint Manager UI:** add/rotate secrets, test ping, per-event subscriptions. **DoD:** invalid signature clearly surfaced; test ping round-trips <500 ms.

### Epic C — Threat Intel & SIEM
- **C1. STIX/TAXII Ingest:** TAXII 2.1 collections → STIX objects → graph mapping (Indicator, SDO/SRO). **DoD:** pulls delta windows; dedup by `id`/`modified`; lineage + license captured.
- **C2. SIEM Sinks:** Splunk HEC, Elastic Ingest pipeline for alerts/receipts/exports. **DoD:** configurable filters; backpressure aware; p95 ship <2s.
- **C3. IOC Auto-Linking:** normalized Indicators link to entities/edges (domains, hashes, IPs). **DoD:** precision ≥0.98 on canonical test set; false links require human confirm.

### Epic D — Lifecycle & Retention
- **D1. Policy Engine:** `{entityType, rule: delete|redact|hold, afterDays, basis, exceptions}`. **DoD:** dry-run report + execute; idempotent; audit why/what/when.
- **D2. Legal Hold:** tag datasets/cases; retention suspension with reason. **DoD:** hold prevents purge; UI shows holds and approvers.
- **D3. Secure Deletion:** cryptographic delete (key shred) for blob evidence; verify via challenge. **DoD:** proof-of-delete artifact stored; periodic test passes.

### Epic E — Billing & Metering (MVP)
- **E1. Counters & Attributors:** seats, active users, query executions, exports, storage GB. **DoD:** monotonic counters per workspace; time-bucketed; no double-counting.
- **E2. Plans & Limits:** free/standard/enterprise caps; soft/hard thresholds with guidance. **DoD:** hitting a cap shows actionable banner; admin override logged.
- **E3. Usage API & Admin UI:** monthly usage, forecasts, CSV export. **DoD:** numbers reconcile with Prom metrics; CSV downloads under 2s for 100k rows.

## 3) Interfaces & Exemplars

### Plugin SDK — server manifest (TypeScript)
```typescript
// plugin.json
{
  "name": "url-screenshot",
  "version": "1.0.0",
  "scopes": ["ingest", "enrich"],
  "entry": "dist/server.js",
  "ui": "dist/widget.js",
  "permissions": ["net:allowlist:https://api.screenshot.example/*"]
}
```

```typescript
// server.js
export default function register({ bus, graph, evidence, logger }) {
  bus.on('ingest:url', async (msg) => {
    const shot = await takeScreenshot(msg.url); // sandboxed fetch
    const hash = await evidence.storeBlob(shot.buffer, { type: 'image/png' });
    await graph.upsert({
      entities: [{ type: 'URL', key: msg.url, props: { title: shot.title } }],
      edges: [{ type: 'HAS_SCREENSHOT', from: `url:${msg.url}`, to: `blob:${hash}`, props: { capturedAt: new Date().toISOString() } }]
    });
    logger.info('url-screenshot: stored %s', hash);
  });
}
```

### UI Widget API (tri-pane card)
```javascript
// widget.js
export function mount(el, context){
  const id = context.selection?.[0];
  el.innerHTML = '<div class="card"><h4>Overview</h4><div id="info"></div></div>';
  context.api.fetch(`/entity/${encodeURIComponent(id)}`).then(function(res){
    document.getElementById('info').textContent = (res.name || id) + ' — ' + (res.type || '');
  });
  return { unmount: function(){ el.innerHTML=''; } };
}
```

### Webhook payload + signature
```json
// POST body
{
  "id": "evt_01HXYZ",
  "type": "alert.triaged",
  "ts": "2026-03-24T18:11:42Z",
  "workspaceId": "ws_123",
  "actor": "u_456",
  "data": { "alertId": "a_789", "status": "triaged", "assignee": "u_111" }
}
```
Header: `X-IntelGraph-Signature: t=1711303902,v1=hex(hmac_sha256(secret, t + '.' + body))`

### TAXII poller (Python/FastAPI worker)
```python
import httpx, json, datetime as dt

async def poll_taxii(base, collection, token, since_iso):
  headers = {"Authorization": f"Bearer {token}"}
  url = f"{base}/collections/{collection}/objects?added_after={since_iso}"
  async with httpx.AsyncClient(timeout=20) as client:
    r = await client.get(url, headers=headers)
    r.raise_for_status()
    bundle = r.json()  # STIX 2.1 bundle
  return bundle.get("objects", [])
```

### STIX → Graph mapping (Node sketch)
```javascript
// Indicator to IOC entity
function stixToGraph(obj){
  if(obj.type === 'indicator'){
    const patt = obj.pattern; // e.g., "[domain-name:value = 'example.com']"
    const ioc = parsePattern(patt); // returns { kind:'domain', value:'example.com' }
    return {
      entities: [{ type: ioc.kind.toUpperCase(), key: ioc.value, props: { value: ioc.value, source: 'TAXII' } }],
      edges: [{ type: 'INDICATES', from: `indicator:${obj.id}`, to: `${ioc.kind}:${ioc.value}`, props: { created: obj.created } }]
    };
  }
  return null;
}
```

### SIEM sink (Splunk HEC) — Node
```javascript
async function shipToSplunk(events, { url, token }){
  const lines = events.map(function(e){ return JSON.stringify({ time: Date.now()/1000, event: e }); }).join('\n');
  const res = await fetch(url, { method:'POST', headers: { 'Authorization': 'Splunk '+token }, body: lines });
  if(!res.ok) throw new Error('HEC failed: '+res.status);
}
```

### Retention policy DSL (YAML)
```yaml
policies:
  - entityType: "EvidenceBlob"
    rule: "delete"
    afterDays: 90
    exceptions: ["legal_hold:true"]
  - entityType: "Person"
    rule: "redact"
    fields: ["email","phone"]
    afterDays: 365
    basis: "license:partner-restricted"
```

### Secure deletion (proof artifact)
```javascript
async function secureDeleteBlob(id){
  const keyId = await kms.getKeyIdForBlob(id);
  await storage.deleteObject(id);            // remove blob
  await kms.destroyKey(keyId);               // shred envelope key
  const proof = sha256(id + ':' + keyId + ':' + new Date().toISOString());
  await audit.append({ action:'secure_delete', target:id, proof });
  return proof;
}
```

### Billing counters (Postgres)
```sql
CREATE TABLE usage_counters (
  workspace_id TEXT, metric TEXT, ts DATE, value BIGINT,
  PRIMARY KEY(workspace_id, metric, ts)
);
-- Upsert sample
INSERT INTO usage_counters (workspace_id, metric, ts, value)
VALUES ($1,$2,CURRENT_DATE,1)
ON CONFLICT (workspace_id, metric, ts) DO UPDATE
SET value = usage_counters.value + 1;
```

## 4) Acceptance & Demo

1. Plugin: install example plugin; run `ingest:url` → see screenshot evidence + edge; uninstall leaves no residual handlers.
2. Webhooks: configure endpoint; trigger `alert.triaged`; external server verifies signature and displays payload; DLQ replay works.
3. STIX/TAXII: connect to sample TAXII server; indicators ingested; IOC auto-links to entities; SIEM shows alert stream in Splunk and Elastic dashboards.
4. Retention: run dry-run → see deletion/redaction plan; execute → blobs receive proof-of-delete; legal hold blocks deletion.
5. Billing: run query/export bursts; admin usage page shows seat/queries/exports; cap reached triggers banner + email stub.

## 5) Risks & Mitigations

- Plugin supply-chain risk: signing + allow-list + sandbox perms; no net outside allowlist; kill-switch per plugin/workspace.
- Webhook abuse/leaks: HMAC signatures, IP allowlist, payload minimization, per-endpoint rate limits.
- STIX pattern parsing errors: strict parser + DLQ on unknown patterns; human review queue.
- Retention mistakes: mandatory dry-run, two-person approval for destructive runs, legal-hold precedence.
- Billing inaccuracies: monotonic counters + reconciliation job; never block critical security exports—soft fail with grace period.

## 6) Tracking Artifacts

- Branches: `feature/plugin-sdk`, `feature/webhooks`, `feature/taxii-stix`, `feature/siem-sinks`, `feature/retention-lifecycle`, `feature/billing-metering`.
- Labels: `area:extensibility`, `area:integrations`, `area:compliance`, `area:billing`, `needs:sec-review`, `needs:perf-bench`.
- CI/CD gates: plugin signing tests; webhook signature contract tests; STIX parser fixtures; retention dry-run property tests; usage reconciliation unit tests.

## 7) Exit Metrics

- Plugins: ≥1 reference plugin installed; crash isolation proven; zero unsandboxed net calls.
- Webhooks: 99.9% delivery on healthy endpoint; DLQ <0.5% of volume; signature verification success 100%.
- Intel/SIEM: TAXII delta pull ≤5 min intervals; IOC link precision ≥0.98; SIEM ship p95 <2s.
- Retention: 100% destructive actions preceded by dry-run & approval; proof artifacts generated.
- Billing: counters reconcile within ±1% to Prom; plan limits enforced with clear UX.

## 8) Open Questions

1. Which first two partner plugins should we target (ingest vs. UI widget)?
2. What TAXII collections/endpoints do we have rights to use in staging?
3. Any hard retention defaults (e.g., EvidenceBlob 90d delete, Person PII 365d redact) or legal-hold workflow owners?
4. Should billing surface only to workspace admins, or also read-only usage to analysts?
