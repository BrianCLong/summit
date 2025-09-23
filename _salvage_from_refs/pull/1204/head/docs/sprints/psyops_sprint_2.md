## Sprint 2: PsyOps Console (API, Streaming, & UX v0.2) | IntelGraph Advisory Report | GitHub Branch: feature/psyops-api-sprint

> As Chair, I present the findings of the IntelGraph Advisory Committee on Sprint 2: wiring APIs, real‑time streams, and deepening the PsyOps Console UX. Consensus is noted where unanimous; dissents are highlighted.

### Consensus Summary
**Unanimous View:** Ship a secure **read‑only intelligence surface** backed by versioned APIs and a signed WebSocket event bus. Add deception scoring, provenance ACLs, and explainability payloads. Frontend gains runbook drawer, saved views, and uncertainty bands.  
**Dissents:** **🟥 Starkey** cautions against centralized stream brokering; **🟥 Foster** blocks any module that acts on audiences or pushes content—**analysis only**.

---

### Individual Commentaries

### 🪄 Elara Voss
- “By the runes of Scrum: time‑box to API contracts + WS demo + two UX affordances (saved views, explain overlay). Keep it shippable.”
- Normalize on **OpenAPI 3.1 + Zod** for end‑to‑end type safety.

### 🛰 Starkey
- Reality check: a single WS broker is a SPoF and a juicy target. Mirror a passive **fan‑out** via read‑only replicas; isolate secrets.
- Prefer **pull + short‑poll fallbacks** for degraded networks; WS as fast path only.

### 🛡 Foster
- Operational vectors indicate we must sign all events (Ed25519) and enforce **provenance ACL** at the edge.  
- [RESTRICTED] Blocklist any route that enables outbound influence ops; log denials with rationale.

### ⚔ Oppie (11‑persona consensus)
- We decree unanimously: couple graph deltas with **trace IDs** to power explain overlays.  
- Dissent: *Beria* demands “active counter‑ops”; the Committee rejects—**observe, hypothesize, defend**.

### 📊 Magruder
- For executive traction: add **KPI tiles** (time‑to‑hypothesis, evidence completeness, confidence spread).  
- Ensure **export packs** (ZIP) are policy‑aware and omit restricted sources.

### 🧬 Stribol
- Cross‑source analysis reveals lift from **cadence entropy** + **narrative burst score** + **bot‑likeness** fusion.  
- Add a **what‑if** panel fed by counterfactuals—read‑only, labeled "simulation."

---

### Chair Synthesis

#### Sprint Objectives (2 weeks)
1) **Stabilize the contract**: OpenAPI 3.1 spec for narratives, signals, graph, provenance, COAs.  
2) **Real‑time demo**: Signed WS stream with sample events and frontend hook.  
3) **UX v0.2**: Saved views + uncertainty bands + explain overlay with trace IDs.  
4) **Governance**: Provenance ACL, export policy, ethics rails (deny with reason codes).

#### Scope & Backlog (Must‑Have)
- **API**: `/narratives`, `/signals`, `/graph/delta`, `/provenance`, `/coas` (GET‑only for Sprint 2).  
- **Streaming**: `wss://…/psyops/events` (topic: `narrative.delta`, `signal.burst`, `graph.edgeDelta`).  
- **Security**: Ed25519 event signatures, JWT (read scope), per‑tenant rate limits, CORS allow‑list.  
- **Scoring**: deceptionScore, burstScore, cadenceEntropy, uncertainty (0–1) with rationale array.  
- **UX**: Save/restore view state (filters + brush window), uncertainty bands, explain overlay with path snippets.  
- **Exports**: Evidence bundle (JSONL + hashes) with license badges; deny when policy fails.

**Stretch**  
- **Replica fan‑out** for WS; **offline cache** snapshots (IndexedDB) and delta replays.

#### Acceptance Criteria
- OpenAPI passes spectral lint; server enforces schema via Zod; 100% responses include `traceId` + `provenance` link.  
- WS clients validate signatures; tampered payloads are dropped and surfaced as UI toasts.  
- Saved views restore tri‑pane state within 150ms P95 after load.  
- Export packs exclude restricted sources and include a machine‑readable policy report.  
- Any attempt to write/manipulate audiences returns HTTP 451 with human‑readable rationale.

#### Risk Matrix
| Risk | Severity | Likelihood | Mitigation |
|---|---:|---:|---|
| WS broker SPoF / takeover | Critical | Medium | Read‑replicas, mTLS, event signing, circuit‑breakers, short‑poll fallback |
| Metric gaming (deceptionScore) | High | Medium | Show uncertainty bands; expose feature attributions; cap confidence |
| Provenance leaks in exports | High | Low | Policy engine pre‑flight + redaction; signed manifest |
| Schema drift breaking FE | Medium | Medium | CI contract tests, canary tag `v0.2‑rc`, semver headers |

---

### Code & Specs (Guy IG)

#### 1) OpenAPI 3.1 (excerpt)
```yaml
openapi: 3.1.0
info:
  title: IntelGraph PsyOps Read API
  version: 0.2.0
servers:
  - url: https://api.intelgraph.local
paths:
  /narratives:
    get:
      summary: List narratives (read‑only)
      parameters:
        - in: query
          name: q
          schema: { type: string }
        - in: query
          name: timeStart
          schema: { type: string, format: date-time }
        - in: query
          name: timeEnd
          schema: { type: string, format: date-time }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/Narrative' }
  /graph/delta:
    get:
      summary: Streamable graph deltas for the tri‑pane
      responses:
        '200': { description: OK }
components:
  schemas:
    Narrative:
      type: object
      required: [id, title, deceptionScore, uncertainty, traceId, provenance]
      properties:
        id: { type: string }
        title: { type: string }
        tags: { type: array, items: { type: string } }
        deceptionScore: { type: number, minimum: 0, maximum: 1 }
        uncertainty: { type: number, minimum: 0, maximum: 1 }
        rationale: { type: array, items: { $ref: '#/components/schemas/Rationale' } }
        traceId: { type: string }
        provenance: { $ref: '#/components/schemas/Prov' }
    Rationale:
      type: object
      properties:
        feature: { type: string }
        weight: { type: number }
        snippet: { type: string }
    Prov:
      type: object
      properties:
        source: { type: string }
        license: { type: string }
        chain: { type: array, items: { type: string } }
```

#### 2) Node/TypeScript secure WS + API (express, ws, zod)
```ts
// apps/server/src/main.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import crypto from 'crypto';

const app = express();
app.use(express.json());
app.use(cors({ origin: [/^https:\/\/app\.intelgraph\.local$/] }));
app.use(rateLimit({ windowMs: 60_000, max: 600 }));

// --- Schemas ---
const Rationale = z.object({ feature: z.string(), weight: z.number(), snippet: z.string().max(512) });
const Prov = z.object({ source: z.string().url(), license: z.string(), chain: z.array(z.string()) });
const Narrative = z.object({
  id: z.string(), title: z.string(), tags: z.array(z.string()).default([]),
  deceptionScore: z.number().min(0).max(1), uncertainty: z.number().min(0).max(1),
  rationale: z.array(Rationale), traceId: z.string(), provenance: Prov
});

type NarrativeT = z.infer<typeof Narrative>;

// --- Read‑only API ---
app.get('/narratives', (_req, res) => {
  const items: NarrativeT[] = sampleNarratives();
  res.json({ items });
});

// --- WebSocket (signed events) ---
const wss = new WebSocketServer({ noServer: true });
const PRIV = crypto.generateKeyPairSync('ed25519').privateKey; // replace with HSM in prod

function sign(payload: string) {
  const sig = crypto.sign(null, Buffer.from(payload), PRIV).toString('base64');
  return sig;
}

function makeEvent(topic: string, body: any) {
  const payload = JSON.stringify({ topic, ts: Date.now(), body });
  return { payload, sig: sign(payload) };
}

wss.on('connection', (ws) => {
  const timer = setInterval(() => {
    const ev = makeEvent('narrative.delta', sampleNarratives()[0]);
    ws.send(JSON.stringify(ev));
  }, 1500);
  ws.on('close', () => clearInterval(timer));
});

const server = app.listen(8080);
server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/psyops/events') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

function sampleNarratives(): NarrativeT[] {
  return [{
    id: 'n1', title: 'Narrative: supply‑chain hoax', tags: ['coordination','burst'],
    deceptionScore: 0.78, uncertainty: 0.22,
    rationale: [ { feature: 'cadenceEntropy', weight: 0.42, snippet: '23 posts in 3m' } ],
    traceId: 'tr_01H...',
    provenance: { source: 'https://example.org/post/123', license: 'CC‑BY', chain: ['fetch','dedupe','score'] }
  }];
}
```

#### 3) Frontend WS hook + uncertainty bands (React)
```tsx
// apps/web/src/features/psyops/usePsyOpsEvents.ts
import { useEffect, useRef, useState } from 'react';

export type EventEnvelope<T> = { payload: string; sig: string };
export type Narrative = { id: string; title: string; deceptionScore: number; uncertainty: number; traceId: string };

export function usePsyOpsEvents() {
  const [items, setItems] = useState<Narrative[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('wss://api.intelgraph.local/psyops/events');
    wsRef.current = ws;
    ws.onmessage = (msg) => {
      const env: EventEnvelope<any> = JSON.parse(msg.data as string);
      const ev = JSON.parse(env.payload);
      if (ev.topic === 'narrative.delta') setItems((prev) => [ev.body, ...prev].slice(0, 50));
    };
    ws.onerror = () => console.warn('WS error');
    return () => ws.close();
  }, []);

  return items;
}

// apps/web/src/features/psyops/UncertaintyBand.tsx
export default function UncertaintyBand({ value }: { value: number }) {
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded bg-gray-200">
        <div className="h-2 rounded bg-gradient-to-r from-gray-300 to-gray-500" style={{ width: `${value * 100}%` }} />
      </div>
      <p className="text-xs mt-1">Uncertainty: {(value * 100).toFixed(0)}%</p>
    </div>
  );
}
```

#### 4) Policy & Export Manifest (JSONL + signature)
```json
{
  "packageId": "exp_01H...",
  "createdAt": "2025-09-11T17:00:00Z",
  "policy": {"licenseOk": true, "ethicsOk": true, "redactions": ["pii.email"]},
  "manifest": [
    {"sha256": "f2ab...", "path": "items/0001.json"},
    {"sha256": "91cd...", "path": "items/0002.json"}
  ],
  "signature": "BASE64_ED25519_SIG"
}
```

---

### Tickets (ready for grooming)
- **API‑101**: Implement OpenAPI 3.1 with spectral lint + CI contract tests.  
- **API‑102**: `/narratives` GET with Zod validation + pagination.  
- **API‑103**: `/graph/delta` GET; synthesize edge deltas from fixture.  
- **SEC‑110**: WS signing (Ed25519), verify on client, drop tampered events.  
- **UX‑120**: Saved views (URL‑encoded state) + restore on load.  
- **UX‑121**: Uncertainty bands + tooltip explanations.  
- **GOV‑130**: Provenance ACL + export policy check; return HTTP 451 w/ rationale on denial.  
- **OBS‑140**: KPI tiles; emit metrics: TTH, evidence completeness, confidence spread.

### OKRs (Sprint 2)
- KR1: WS demo stable for 30‑minute run (0 disconnects P95).  
- KR2: ≥95% responses include traceId + provenance link.  
- KR3: 0 policy violations; 100% denials carry human‑readable reasons.

---

**The Committee stands ready to advise further. End transmission.**

