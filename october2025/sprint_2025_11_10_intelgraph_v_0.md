````markdown
# IntelGraph — Next Sprint Plan (v0.9.0)

**Slug:** `sprint-2025-11-10-intelgraph-v0-9`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2025-11-10 → 2025-11-21 (10 business days)  
**Theme:** **Case Automation & Enterprise Integrations** — investigation playbooks, case lifecycle automation, signed exports, external API/webhooks, and enterprise identity.

---

## 0) North Stars & DoD

- **Automate, don’t obfuscate:** Playbooks guide analysts while preserving intent, provenance, and human approval gates.
- **Enterprise‑ready:** Signed exports (detached signatures), service accounts & API tokens, SAML/SCIM for identity.
- **Observable:** Every automation emits structured audit and metrics; rollback paths exist.
- **SLOs:** p95 case action < 800ms; webhook delivery success ≥ 99.5% with retry/backoff.

**DoD Gate:**

1. Demo: Create case from template → run playbook steps (ingest→ER→analytics→report) → export signed bundle.
2. External system receives webhooks for case events; retries with exponential backoff; signature verified.
3. API tokens + scoped service accounts usable from CLI to list/search/update case artifacts with ABAC.
4. SAML login & SCIM user sync working in staging; audit trails complete.

---

## 1) Epics → Objectives

1. **Playbooks & Case Automation (PBK‑E1)** — YAML playbooks, step runner, approvals, guardrails, and UI wizard.
2. **Signed Exports & Receipts (EXP‑E2)** — Detached signature (Ed25519) for exports; verifier CLI & CI step.
3. **Public API + Webhooks (API‑E3)** — REST subset for automation; webhook delivery w/ HMAC and retries.
4. **Enterprise Identity (ID‑E4)** — SAML SSO, SCIM user/group sync, role mapping to RBAC/ABAC.
5. **Ops & QA (OPS‑E5)** — Metrics, budgets, chaos tests for webhook outages, docs & runbooks.

---

## 2) Swimlanes

### Frontend (React + MUI + Cytoscape.js + jQuery)

- Playbook Runner panel with step list, status chips, approval modals, rollback buttons.
- Case Template gallery (YAML import) with validation feedback and linting.
- Export dialog shows signature status and verifier output; copyable `intelgraph verify` CLI snippet.
- Webhook monitor tab (recent deliveries; retry button).

### Backend (Node/Express + Apollo + Neo4j)

- Playbook engine (BullMQ jobs) w/ step DSL → concrete actions (ingest, run ER, run GDS, snapshot/export).
- REST API v0: service account auth, rate limits, ABAC scopes; `/cases`, `/exports`, `/webhooks`, `/playbooks`.
- Webhook dispatcher (retry/backoff/jitter, DLQ, idempotency keys, HMAC signature).
- Export signer (Ed25519) & verifier library; provenance manifest inclusion.
- SAML (SAML2) & SCIM (RFC7643/7644) adapters; role mapping.

### Ops/SRE & Security

- Grafana: webhook success, latency, retry histogram; API rate limit charts; SAML/SCIM health.
- Helm: HPA knobs for dispatcher; secrets management; signing key rotation.

### QA/Docs

- Playwright flows for playbook run/approve/rollback; k6 API/webhook mix; operator and security guides.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ 92 pts

### Playbooks (30 pts)

1. Playbook YAML schema & linter.  
   **AC:** JSON‑schema validation; lint errors inline in UI; examples committed. (**M**)
2. Step runner with approvals & rollback.  
   **AC:** Each step logs start/stop, emits audit; manual gate via RBAC; rollback hooks run on failure. (**XL**)
3. Playbook wizard to parameterize templates (sources, tags, license).  
   **AC:** Params resolved; preview plan; dry‑run mode. (**L**)

### Signed Exports (18 pts)

4. Detached signature generation (Ed25519) + manifest bundling.  
   **AC:** `intelgraph verify` validates signature + manifest; CI job fails on mismatch. (**L**)
5. Report UI shows verification state.  
   **AC:** Green/amber/red states; copyable CLI; audit entry. (**M**)

### Public API & Webhooks (28 pts)

6. Service accounts & API tokens with scopes.  
   **AC:** Create/rotate/revoke tokens; scopes enforced by ABAC; rate limit buckets per token. (**L**)
7. REST endpoints (`/cases`, `/exports`, `/webhooks`), OpenAPI spec, and SDK stub.  
   **AC:** 100% contract tests; examples in docs; SDK publishes to repo. (**L**)
8. Webhook dispatcher with HMAC, retries, idempotency.  
   **AC:** p95 < 400ms; success ≥ 99.5%; DLQ visible; manual retry; signature verified in sample app. (**L**)

### Identity (12 pts)

9. SAML SSO adapter with role mapping.  
   **AC:** Login round‑trip in staging; role claims mapped; logout works; error telemetry. (**M**)
10. SCIM user/group sync.  
    **AC:** Incremental sync; conflict resolution; audit for changes. (**M**)

### Ops/QA (4 pts)

11. Chaos tests for webhook outages & DLQ drain runbook.  
    **AC:** k6 scenarios; runbook links; on‑call tested. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Playbook Schema (JSON‑Schema) & Example

```json
// apps/web/public/playbook.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IntelGraph Playbook",
  "type": "object",
  "required": ["name", "version", "steps"],
  "properties": {
    "name": { "type": "string" },
    "version": { "type": "string" },
    "params": { "type": "object" },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "action"],
        "properties": {
          "id": { "type": "string" },
          "action": {
            "type": "string",
            "enum": ["ingest", "er", "gds", "snapshot", "export"]
          },
          "input": { "type": "object" },
          "approve": { "type": "boolean" },
          "rollback": { "type": "object" }
        }
      }
    }
  }
}
```
````

```yaml
# examples/playbooks/case-bootstrap.yaml
name: Case Bootstrap
version: 0.1.0
params:
  sourceUrl: string
  license: CC-BY
steps:
  - id: ingest
    action: ingest
    input:
      {
        mappingId: 'map:persons',
        sourceUrl: '${params.sourceUrl}',
        license: '${params.license}',
      }
    approve: true
  - id: er
    action: er
    approve: false
  - id: analytics
    action: gds
    input: { kind: 'community', params: { algorithm: 'leiden' } }
  - id: report
    action: snapshot
  - id: export
    action: export
    input: { caseId: '${ctx.caseId}', withProvenance: true }
    approve: true
```

### 4.2 Playbook Runner (Node/TypeScript)

```ts
// server/src/playbooks/runner.ts
import { Queue, JobsOptions } from 'bullmq';
import { z } from 'zod';
import { signExport } from '../provenance/sign';

const Step = z.object({
  id: z.string(),
  action: z.enum(['ingest', 'er', 'gds', 'snapshot', 'export']),
  input: z.record(z.any()).optional(),
  approve: z.boolean().optional(),
});
export async function runPlaybook(ctx, pb) {
  const steps = pb.steps.map((s: any) => Step.parse(s));
  for (const step of steps) {
    await log(ctx, 'step.start', step);
    if (step.approve) {
      await requireApproval(ctx, step);
    }
    try {
      switch (step.action) {
        case 'ingest':
          await doIngest(ctx, step.input);
          break;
        case 'er':
          await doER(ctx);
          break;
        case 'gds':
          await doGDS(ctx, step.input);
          break;
        case 'snapshot':
          await doSnapshot(ctx);
          break;
        case 'export':
          const bundle = await doExport(ctx, step.input);
          await signExport(bundle);
          break;
      }
      await log(ctx, 'step.done', step);
    } catch (e) {
      await log(ctx, 'step.error', { step, error: String(e) });
      await rollback(ctx, step);
      throw e;
    }
  }
}
```

### 4.3 jQuery Playbook UI Hooks

```js
// apps/web/src/features/playbooks/jquery-hooks.js
$(function () {
  $(document).on('click', '.pbk-run', function () {
    const id = $(this).data('id');
    $.ajax({
      url: '/api/playbooks/run',
      method: 'POST',
      data: JSON.stringify({ id }),
      contentType: 'application/json',
    });
  });
  $(document).on('click', '.pbk-approve', function () {
    const step = $(this).data('step');
    $.ajax({
      url: '/api/playbooks/approve',
      method: 'POST',
      data: JSON.stringify({ step }),
      contentType: 'application/json',
    });
  });
});
```

### 4.4 Export Signing (Ed25519)

```ts
// server/src/provenance/sign.ts
import { randomBytes } from 'crypto';
import nacl from 'tweetnacl';

export function genKeypair() {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: Buffer.from(kp.publicKey).toString('base64'),
    secretKey: Buffer.from(kp.secretKey).toString('base64'),
  };
}
export function signExport(bundle: Buffer, secretKeyB64?: string) {
  const sk = Buffer.from(
    secretKeyB64 || process.env.EXPORT_SIGNING_SK!,
    'base64',
  );
  const sig = nacl.sign.detached(bundle, sk);
  return Buffer.from(sig).toString('base64');
}
export function verifyExport(
  bundle: Buffer,
  sigB64: string,
  publicKeyB64: string,
) {
  const pk = Buffer.from(publicKeyB64, 'base64');
  const sig = Buffer.from(sigB64, 'base64');
  return nacl.sign.detached.verify(bundle, sig, pk);
}
```

### 4.5 Verifier CLI

```ts
// tools/intelgraph-verify.ts
#!/usr/bin/env node
import fs from 'fs'
import { verifyExport } from '../server/src/provenance/sign'
const bundle = fs.readFileSync(process.argv[2])
const sig = fs.readFileSync(process.argv[3],'utf8').trim()
const pk = process.argv[4]
const ok = verifyExport(bundle, sig, pk)
console.log(ok? 'OK: signature valid' : 'FAIL: signature invalid')
process.exit(ok?0:1)
```

### 4.6 REST API (Express) — tokens & scopes

```ts
// server/src/api/index.ts
import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireScope, authToken } from './tokens';

export const api = express.Router();
api.use(express.json());
api.use(authToken);
api.use(rateLimit({ windowMs: 60_000, max: 600 }));

api.get('/cases', requireScope('cases:read'), async (req, res) => {
  /* list cases with ABAC filter */
});
api.post('/webhooks', requireScope('admin:webhooks'), async (req, res) => {
  /* register */
});
api.post(
  '/exports/:id/retry',
  requireScope('exports:write'),
  async (req, res) => {
    /* retry */
  },
);
```

### 4.7 Webhook Dispatcher

```ts
// server/src/webhooks/dispatcher.ts
import crypto from 'crypto';
import axios from 'axios';

export async function dispatch(url, secret, body, id) {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  try {
    await axios.post(url, body, {
      headers: { 'X-IntelGraph-Signature': sig, 'X-Idempotency-Key': id },
      timeout: 3000,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
```

### 4.8 SAML/SCIM Adapters (stubs)

```ts
// server/src/identity/saml.ts
export async function samlLogin(req, res) {
  /* parse SAMLResponse, map roles to RBAC */
}
// server/src/identity/scim.ts
export async function scimUsers(req, res) {
  /* upsert users, mark inactive, audit */
}
```

### 4.9 OpenAPI Spec (excerpt)

```yaml
openapi: 3.0.3
info:
  title: IntelGraph Public API
  version: 0.9.0
paths:
  /cases:
    get:
      security: [{ bearerAuth: [] }]
      parameters: [{ name: q, in: query, schema: { type: string } }]
      responses: { '200': { description: OK } }
  /webhooks:
    post:
      security: [{ bearerAuth: [] }]
      requestBody: { required: true }
```

### 4.10 k6 — API + Webhook Chaos

```js
import http from 'k6/http';
export const options = { vus: 40, duration: '3m' };
export default function () {
  http.get('http://localhost:4000/api/cases', {
    headers: { Authorization: `Bearer ${__ENV.TOKEN}` },
  });
  http.post(
    'http://localhost:4000/api/webhooks/test',
    JSON.stringify({ event: 'case.updated' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Playbook schema/linter + runner skeleton; REST auth tokens & scopes.
- **D3–D4:** Step implementations (ingest/ER/GDS/snapshot/export); jQuery UI; approvals & rollback.
- **D5–D6:** Export signing + verifier CLI + UI status.
- **D7:** Webhook dispatcher (retry/DLQ/idempotency) + monitor; OpenAPI + SDK.
- **D8:** SAML/SCIM adapters; role mapping; ABAC wiring.
- **D9–D10:** Perf, chaos tests, docs, runbooks, demo polish.

---

## 6) Risks & Mitigations

- **Automation misfires** → approval gates, dry‑runs, rollback hooks, audit.
- **Signature key management** → rotation policy, HSM/KMS integration path, CI secrets scanning.
- **Webhook outages** → DLQ + backoff; replay tooling; idempotency keys.
- **Identity drift** → SCIM as source of truth; conflict rules; periodic audits.

---

## 7) Metrics

- Playbook duration, step success rate, rollback count; export verification pass rate; webhook latency/success/retry; API rate limit hits; SAML/SCIM errors; SLO compliance.

---

## 8) Release Artifacts

- **ADR‑018:** Playbook engine & rollback design.
- **ADR‑019:** Export signing & verification.
- **RFC‑024:** Public API v0 scopes & rate limits.
- **Runbooks:** Playbook failures; webhook DLQ drain; signing key rotation; SAML/SCIM troubleshooting.
- **Docs:** Playbook authoring guide; API quick‑start; security considerations.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, threat model, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Import **Case Bootstrap** playbook; parameterize; dry‑run → run with approvals.
2. Watch steps execute (ingest→ER→GDS→snapshot→export); export shows **Signed: OK**; run CLI verifier.
3. Update case; see webhook delivered to sample receiver with valid HMAC; trigger retry on a forced failure.
4. Login via SAML; show role mapping; SCIM sync adds a user; audit trail review.

---

## 11) Out‑of‑Scope (backlog)

- Marketplace for playbooks; multi‑tenant plugin sandbox; fully managed KMS/HSM; fine‑grained purpose binding; red‑team simulators.

```

```
