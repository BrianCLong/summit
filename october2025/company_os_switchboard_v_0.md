# CompanyOS “Switchboard” — v0.1 Blueprint & Starter Kit

A local‑first, zero‑trust command center that gives you instant access to **all agents**, **all signals**, and **all collaborators** — with a **real‑time multimodal co‑pilot** (text/image/audio/video) that can present in stakeholder meetings and run secure, proprietary channels across devices.

---

## 1) Product Pillars

1. **Instant Reachability**
   - Global command palette (⌘K) for agents, people, data views, runbooks.
   - One‑click “handoff” between chat, whiteboard, tickets, incidents.
2. **Omni‑visibility**
   - Live tiles (graph/events/metrics/logs) + drill‑through provenance.
   - Org‑wide Status Bus (CloudEvents) with policy‑aware redaction.
3. **Multimodal Co‑pilot**
   - Summarize, argue, generate slides, narrate, transcribe, translate.
   - Meeting mode: WebRTC stage, auto‑chapters, action items → Jira/GitHub.
4. **Private Associates Network (PAN)**
   - End‑to‑end encrypted rooms (text/voice/video/whiteboard/files).
   - Double‑ratchet for DM; MLS (Messaging Layer Security) for groups.
5. **Local‑first & Portable**
   - Tauri/Electron desktop + local enclave (WASM + SQLite/Parquet).
   - Secure sync via WireGuard + mTLS; CRDTs for offline merge.
6. **Governed by Policy**
   - OPA ABAC at every boundary (UI widgets, APIs, agents, data taps).
   - Audit trail with signed events + SBOM/SLSA for build integrity.

---

## 2) High‑Level Architecture (MVP → v1)

```text
┌─────────────────────────────────────────────── Local Device ────────────────────────────────────────────────┐
│  Switchboard App (Tauri/Electron + React/Next)                                                             │
│  • UI Shell: Command Palette, Live Tiles, Meeting Stage, Agent Roster, Inbox, Notifications                │
│  • Local Services:                                                                                         │
│    - Agent Gateway (gRPC/WebSocket) —> Maestro/Model Matrix                                                │
│    - Key Manager (WebAuthn + OS keystore; passkeys, hardware keys)                                         │
│    - PAN Messenger (MLS/Double-Ratchet) + File Vault (age/sodium)                                          │
│    - Capture/Transcribe (VAD + WebRTC + Whisper/nnx local)                                                 │
│    - Data View Cache (SQLite/Parquet/Delta) with CRDTs                                                     │
│                                                                                                            │
│  Secure IPC (Tauri)                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                 │ WireGuard (device tunnel) + mTLS + OPA sidecars + signed CloudEvents
                 ▼
┌────────────────────────────── Company Edge (self‑hosted) ───────────────────────────────┐
│  Identity: Authentik/Keycloak + WebAuthn/FIDO2 + OIDC                                   │
│  Policy: OPA (env, service, widget gates) + Rego bundle registry                        │
│  Realtime: NATS JetStream / Redis Streams (Status Bus)                                  │
│  Media: SFU (mediasoup/LiveKit), TURN (coturn), Recording (S3/GCS)                      │
│  Agents: Maestro Conductor + Router (LLM, tools, cost guard, provenance)                │
│  Data: Graph/Timeline/Map backends (Neo4j/Postgres/Elastic/ClickHouse)                  │
│  Integrations: GitHub/Jira/Slack/Grafana/Prom/GCS/AWS SSM/Secrets Manager               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notes**

- Start **device‑only** (no cloud dependency) using loopback SFU + local models.
- Expand to Edge once trust posture is proven; keep PAN as the primary path.

---

## 3) Security & Privacy Model

- **Device Root of Trust**: WebAuthn (platform + roaming keys), Secure Enclave/TPM for key wrap; OS Keychain/TPM sealed storage.
- **Channels**: MLS for group secure messaging; X3DH/Double Ratchet for DMs; WireGuard for device identity/tunneling.
- **Media**: WebRTC E2EE with Insertable Streams; SFU relays SRTP; recording is opt‑in with per‑participant consent token.
- **Policy**: OPA ABAC everywhere (subject, resource, action, context); widget‑level enforcement (no render without allow).
- **Zero‑Knowledge Vault**: Client‑side encrypted files using `age`/libsodium; shards optional via SSS if required.
- **Audit**: Tamper‑evident logs (hash‑chained CloudEvents) + time‑stamped receipts signed with device keys.
- **Supply Chain**: Reproducible builds (Tauri), SBOM + cosign attestations, SLSA level targets.

---

## 4) UX Overview (MVP)

- **Left rail**: Org, Agents, People, Rooms, Views (Graph/Timeline/Map), Meetings.
- **Center**: Live Tiles grid (status cards) + Meeting Stage (when active).
- **Right rail**: Co‑pilot panel (context, tools, cost/time), Actions queue.
- **Global palette**: `⌘K` → “/call <Agent>”, “/present <deck|board>”, “/join <room>”, “/status <service>”.

---

## 5) Starter UI (React + Tailwind + shadcn)

> Drop this component into a Next.js/Tauri app. It renders roster, live tiles, and a co‑pilot drawer with a command palette.

```tsx
// app/components/Switchboard.tsx
'use client';
import { useState } from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mic,
  PhoneCall,
  Video,
  MessageSquare,
  Rocket,
  Activity,
  Users,
  Brain,
} from 'lucide-react';
import { motion } from 'framer-motion';

const agents = [
  { id: 'maestro', name: 'Maestro Conductor', tags: ['router', 'exec'] },
  { id: 'codex', name: 'CodeGen Codex', tags: ['dev', 'test'] },
  { id: 'sentinel', name: 'Sentinel CI', tags: ['sec', 'policy'] },
  { id: 'scribe', name: 'Scribe', tags: ['notes', 'transcribe'] },
];

const tiles = [
  {
    id: 'status',
    title: 'System Status',
    metric: 'OK',
    desc: 'All lanes green',
  },
  { id: 'incidents', title: 'Incidents', metric: '0', desc: 'No active' },
  { id: 'deploys', title: 'Deploys', metric: '3', desc: 'prod canary live' },
  { id: 'cost', title: 'LLM Spend', metric: '$42', desc: '24h window' },
];

export default function Switchboard() {
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [meeting, setMeeting] = useState(false);

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <aside className="col-span-3 space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded-xl bg-muted"
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs opacity-70">{a.tags.join(' • ')}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Button className="w-full" onClick={() => setCmdOpen(true)}>
          <Rocket className="h-4 w-4 mr-2" />
          Open Command Palette (⌘K)
        </Button>
      </aside>

      {/* Center tiles */}
      <main className="col-span-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{t.metric}</div>
                  <div className="text-sm opacity-70">{t.desc}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Meeting Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {meeting ? (
              <div className="h-48 rounded-xl bg-black/80 text-white flex items-center justify-center">
                Live WebRTC Stage
              </div>
            ) : (
              <Button onClick={() => setMeeting(true)}>
                Start Local Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Right rail: Co‑pilot */}
      <aside className="col-span-3 space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Co‑pilot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant="secondary">
                <Mic className="h-4 w-4 mr-2" />
                Listen
              </Button>
              <Button variant="secondary">Present</Button>
            </div>
            <div className="text-xs opacity-70">
              Context loaded: org, agenda, metrics. Actions will be
              policy‑checked.
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Chat dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat with Agent</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border p-3 min-h-32">(messages…)</div>
        </DialogContent>
      </Dialog>

      {/* Command Palette */}
      {cmdOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-start justify-center p-10"
          onClick={() => setCmdOpen(false)}
        >
          <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <Command>
              <CommandInput placeholder="/call maestro | /present deck | /join room | /status api" />
              <CommandList>
                <CommandItem onSelect={() => setMeeting(true)}>
                  Start meeting
                </CommandItem>
                <CommandItem onSelect={() => setOpen(true)}>
                  Message Scribe
                </CommandItem>
                <CommandItem>Open Graph View</CommandItem>
              </CommandList>
            </Command>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 6) Realtime & Multimodal Services (compose for local‑first)

```yaml
# deploy/local/docker-compose.switchboard.yml (MVP local stack)
version: '3.8'
services:
  sfu:
    image: ghcr.io/companyos/media-sfu:latest # or livekit/mediasoup build
    network_mode: host
    environment:
      - ENABLE_E2EE=true
  turn:
    image: coturn/coturn:latest
    network_mode: host
    command:
      [
        '-n',
        '--no-cli',
        '--no-tls',
        '--no-dtls',
        '--min-port',
        '49160',
        '--max-port',
        '49200',
      ]
  signaling:
    image: ghcr.io/companyos/signaling:latest
    ports: ['8080:8080']
  nats:
    image: nats:2
    command: ['-js']
    ports: ['4222:4222', '8222:8222']
  opa:
    image: openpolicyagent/opa:latest
    command: ['run', '--server', '/policies']
    volumes:
      - ./policies:/policies:ro
  agent-gateway:
    image: ghcr.io/companyos/agent-gateway:latest
    environment:
      - NATS_URL=nats://nats:4222
      - OPA_URL=http://opa:8181
    ports: ['7070:7070']
```

---

## 7) API Contracts (OpenAPI excerpt)

```yaml
# apis/switchboard.yaml (excerpt)
openapi: 3.0.3
info: { title: CompanyOS Switchboard API, version: 0.1.0 }
paths:
  /agents:
    get:
      summary: List registered agents
      responses:
        '200': { description: OK }
  /actions/dispatch:
    post:
      summary: Send structured action to agent with policy check
      requestBody: { required: true }
      responses: { '202': { description: Accepted } }
  /meetings/token:
    post:
      summary: Mint ephemeral meeting token
      responses: { '200': { description: OK } }
```

---

## 8) Policy (OPA ABAC skeleton)

```rego
# policies/switchboard.rego
package switchboard

default allow = false

allow {
  input.subject.authenticated
  input.subject.webauthn_verified
  input.action == "render_widget"
  input.resource.widget in {"AgentRoster","LiveTiles","MeetingStage"}
  input.context.classification <= data.labels.allow_max
}

deny[msg] {
  not allow
  msg := sprintf("blocked: %v on %v", [input.action, input.resource])
}
```

---

## 9) Meeting Co‑pilot — pipeline (MVP)

1. **Capture**: Browser media + VAD → chunked PCM/Opus.
2. **Transcribe**: Local Whisper or nnx; diarize (pyannote/rt-diarization).
3. **Enrich**: Agenda + docs + metrics via Router.
4. **Summarize**: Live chapters; action items; decisions.
5. **Present**: Render slides (mdx → deck) and narrate (TTS) on request.
6. **Export**: CloudEvents actions → Jira/GitHub/Linear; signed minutes → Vault.

---

## 10) Secrets & Identity

- **Bootstrap**: local provisioning wizard (passkeys → device key pair → WireGuard peer → OIDC registration).
- **Rotation**: background rotation for tokens/keys; revocation list synced over PAN.
- **Escrow (optional)**: split‑key (Shamir) with quorum for recovery; never server‑held.

---

## 11) CI/CD (reusable stub)

```yaml
# .github/workflows/ci.switchboard.yml
name: CI Switchboard
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm run build
  policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: open-policy-agent/setup-opa@v2
      - run: opa fmt -w policies && opa test policies -v
```

---

## 12) Data Model (core tables, SQLite local)

```sql
-- db/schema.sql
CREATE TABLE agent (id TEXT PRIMARY KEY, name TEXT, tags TEXT, endpoint TEXT, pubkey BLOB);
CREATE TABLE room (id TEXT PRIMARY KEY, name TEXT, mls_group_id TEXT);
CREATE TABLE event (
  id TEXT PRIMARY KEY,
  ts INTEGER,
  type TEXT,
  subject TEXT,
  resource TEXT,
  payload BLOB,
  sig BLOB
);
CREATE TABLE view_cache (id TEXT PRIMARY KEY, kind TEXT, data BLOB, updated_at INTEGER);
```

---

## 13) Backlog — MVP → v0.1 (2–3 weeks of focused work)

**Week 1**

- UI shell + ⌘K + roster/tiles; local meeting stage; local Whisper; OPA gates.
- Agent Gateway: dispatch + reply; NATS Status Bus integration.
- PAN: device‑to‑device WireGuard bootstrap; DM (Double Ratchet) prototype.

**Week 2**

- MLS groups (small rooms), message store, file vault; E2EE file share.
- Co‑pilot meeting pipeline; action items → GitHub issues.
- Compose stack (SFU, TURN, signaling) and packaging with Tauri.

**Week 3**

- Governance polish (SBOM, cosign, SLSA attestations); audit chain.
- Edge expansion toggle; performance passes; accessibility; on‑call runbook.

---

## 14) Risks & Mitigations

- **Key Recovery**: offer opt‑in Shamir escrow with offline custodians; warn loudly.
- **Media E2EE limits**: ensure Insertable Streams; avoid server recording unless client‑re‑encrypted.
- **Agent Safety**: router guardrails; cost/time budgets; provenance enforced.

---

## 15) Next Steps (copy/paste)

1. Create app shell and component above; wire `docker-compose.switchboard.yml` for local media + OPA + gateway.
2. Add OPA policy and CI stub; fail‑closed widget rendering.
3. Implement provisioning wizard (passkeys → WG peer → OIDC client).
4. Land meeting co‑pilot MVP (transcribe → chapters → actions).
5. Pilot with device‑only; expand to Edge when satisfied with posture.

---

**Appendix: Internal Naming**

- Project code name: **Switchboard** (unit: **Operator**). PAN overlay: **Backline**.
- UI palette verbs: `/call`, `/present`, `/join`, `/status`, `/handoff`.
