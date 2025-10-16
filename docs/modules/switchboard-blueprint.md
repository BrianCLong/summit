# CompanyOS Switchboard v0.1 Blueprint

CompanyOS Switchboard is a local-first, zero-trust command center that unifies agents, signals, and collaborators with a real-time multimodal co-pilot. This document captures the product pillars, architecture, security model, UX skeleton, and starter assets for the v0.1 implementation.

## 1. Product Pillars

1. **Instant Reachability** – Global command palette (⌘K) covering agents, collaborators, data views, and runbooks with one-click handoffs between chat, whiteboards, tickets, and incidents.
2. **Omni-visibility** – Live tiles showing graphs, events, metrics, and logs with provenance drill-through and an org-wide status bus using CloudEvents and policy-aware redaction.
3. **Multimodal Co-pilot** – Summarize, argue, generate slides, narrate, transcribe, and translate with a meeting mode that hosts a WebRTC stage, generates chapters, and syncs actions to Jira/GitHub.
4. **Private Associates Network (PAN)** – End-to-end encrypted rooms for text, voice, video, whiteboards, and files using Double Ratchet for DMs and MLS for groups.
5. **Local-first & Portable** – Tauri/Electron desktop build with a local enclave (WASM + SQLite/Parquet) using secure sync via WireGuard + mTLS and CRDTs for offline merge.
6. **Governed by Policy** – OPA ABAC guardrails for UI widgets, APIs, agents, and data taps with signed audit trails and SLSA-backed build integrity.

## 2. High-Level Architecture (MVP to v1)

```
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
┌────────────────────────────── Company Edge (self-hosted) ───────────────────────────────┐
│  Identity: Authentik/Keycloak + WebAuthn/FIDO2 + OIDC                                   │
│  Policy: OPA (env, service, widget gates) + Rego bundle registry                        │
│  Realtime: NATS JetStream / Redis Streams (Status Bus)                                  │
│  Media: SFU (mediasoup/LiveKit), TURN (coturn), Recording (S3/GCS)                      │
│  Agents: Maestro Conductor + Router (LLM, tools, cost guard, provenance)                │
│  Data: Graph/Timeline/Map backends (Neo4j/Postgres/Elastic/ClickHouse)                  │
│  Integrations: GitHub/Jira/Slack/Grafana/Prom/GCS/AWS SSM/Secrets Manager               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> **Note:** Start in device-only mode (loopback SFU + local models) and expand to the self-hosted edge after validating trust posture. PAN remains the default collaboration path.

## 3. Security & Privacy Model

- **Device Root of Trust:** WebAuthn-backed platform and roaming keys, with Secure Enclave/TPM key wrapping and OS keychain storage.
- **Channels:** MLS for group messaging, X3DH/Double Ratchet for DMs, and WireGuard for device identity and tunneling.
- **Media:** WebRTC E2EE via Insertable Streams with SFU relaying SRTP; recordings require opt-in consent tokens.
- **Policy:** OPA ABAC enforcement across subjects, resources, actions, and context, including widget-level render gates.
- **Zero-Knowledge Vault:** Client-side file encryption with `age`/libsodium and optional Shamir secret sharing for shards.
- **Audit:** Tamper-evident, hash-chained CloudEvents signed with device keys.
- **Supply Chain:** Reproducible Tauri builds, SBOM + cosign attestations, and SLSA maturity goals.

## 4. UX Overview (MVP)

- **Left rail:** Org, Agents, People, Rooms, Views (Graph/Timeline/Map), Meetings.
- **Center:** Live tiles grid with status cards and Meeting Stage when active.
- **Right rail:** Co-pilot panel showing context, tools, and an actions queue.
- **Global palette:** `⌘K` to trigger `/call <Agent>`, `/present <deck|board>`, `/join <room>`, `/status <service>`.

## 5. Starter UI Component (React + Tailwind + shadcn)

A drop-in component for a Next.js/Tauri shell. It includes an agent roster, live tiles, a co-pilot drawer, and a command palette overlay.

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
                className="flex items-center justify-between rounded-xl bg-muted p-2"
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
          <Rocket className="mr-2 h-4 w-4" />
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
              <div className="flex h-48 items-center justify-center rounded-xl bg-black/80 text-white">
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

      {/* Right rail: Co-pilot */}
      <aside className="col-span-3 space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Co-pilot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant="secondary">
                <Mic className="mr-2 h-4 w-4" />
                Listen
              </Button>
              <Button variant="secondary">Present</Button>
            </div>
            <div className="text-xs opacity-70">
              Context loaded: org, agenda, metrics. Actions will be
              policy-checked.
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
          <div className="min-h-32 rounded-xl border p-3">(messages…)</div>
        </DialogContent>
      </Dialog>

      {/* Command Palette */}
      {cmdOpen && (
        <div
          className="fixed inset-0 flex items-start justify-center bg-black/40 p-10"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="w-full max-w-xl"
            onClick={(event) => event.stopPropagation()}
          >
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

## 6. Realtime & Multimodal Services (Local-first Compose Stack)

```yaml
# deploy/local/docker-compose.switchboard.yml
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
      - ../../policies:/policies:ro
  agent-gateway:
    image: ghcr.io/companyos/agent-gateway:latest
    environment:
      - NATS_URL=nats://nats:4222
      - OPA_URL=http://opa:8181
    ports: ['7070:7070']
```

## 7. API Contracts (OpenAPI Excerpt)

```yaml
# apis/switchboard.yaml
openapi: 3.0.3
info:
  title: CompanyOS Switchboard API
  version: 0.1.0
paths:
  /agents:
    get:
      summary: List registered agents
      responses:
        '200':
          description: OK
  /actions/dispatch:
    post:
      summary: Send structured action to agent with policy check
      requestBody:
        required: true
      responses:
        '202':
          description: Accepted
  /meetings/token:
    post:
      summary: Mint ephemeral meeting token
      responses:
        '200':
          description: OK
```

## 8. Policy (OPA ABAC Skeleton)

```rego
# policies/switchboard.rego
package switchboard

default allow = false

allow {
  input.subject.authenticated
  input.subject.webauthn_verified
  input.action == "render_widget"
  input.resource.widget in {"AgentRoster", "LiveTiles", "MeetingStage"}
  input.context.classification <= data.labels.allow_max
}

deny[msg] {
  not allow
  msg := sprintf("blocked: %v on %v", [input.action, input.resource])
}
```

## 9. Meeting Co-pilot Pipeline (MVP)

1. **Capture:** Browser media + voice activity detection to chunked PCM/Opus.
2. **Transcribe:** Local Whisper/nnx transcription with diarization (pyannote/rt-diarization).
3. **Enrich:** Route agenda, docs, and metrics context through the agent router.
4. **Summarize:** Stream live chapters, action items, and decisions.
5. **Present:** Render slides (MDX → deck) and narrate via TTS as needed.
6. **Export:** Emit signed CloudEvents for actions → Jira/GitHub/Linear and archive minutes in the vault.

## 10. Secrets & Identity

- **Bootstrap:** Provisioning wizard issues passkeys, device key pairs, WireGuard peers, and OIDC registrations.
- **Rotation:** Background rotation for tokens/keys with revocation lists synced through PAN.
- **Escrow (optional):** Shamir split-key recovery with offline custodians (never server-held).

## 11. CI/CD Stub

```yaml
# .github/workflows/ci.switchboard.yml
name: CI Switchboard
on:
  push:
    paths:
      - 'ui/components/Switchboard.tsx'
      - 'deploy/local/docker-compose.switchboard.yml'
      - 'policies/switchboard.rego'
      - 'docs/modules/switchboard-blueprint.md'
      - 'apis/switchboard.yaml'
      - 'db/switchboard/schema.sql'
      - '.github/workflows/ci.switchboard.yml'
  pull_request:
    paths:
      - 'ui/components/Switchboard.tsx'
      - 'deploy/local/docker-compose.switchboard.yml'
      - 'policies/switchboard.rego'
      - 'docs/modules/switchboard-blueprint.md'
      - 'apis/switchboard.yaml'
      - 'db/switchboard/schema.sql'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
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

## 12. Data Model (SQLite Local Core Tables)

```sql
-- db/schema.sql
CREATE TABLE agent (
  id TEXT PRIMARY KEY,
  name TEXT,
  tags TEXT,
  endpoint TEXT,
  pubkey BLOB
);

CREATE TABLE room (
  id TEXT PRIMARY KEY,
  name TEXT,
  mls_group_id TEXT
);

CREATE TABLE event (
  id TEXT PRIMARY KEY,
  ts INTEGER,
  type TEXT,
  subject TEXT,
  resource TEXT,
  payload BLOB,
  sig BLOB
);

CREATE TABLE view_cache (
  id TEXT PRIMARY KEY,
  kind TEXT,
  data BLOB,
  updated_at INTEGER
);
```

## 13. Backlog (MVP → v0.1)

- **Week 1:** UI shell with ⌘K palette, roster/tiles, local meeting stage, local Whisper integration, and OPA gates. Agent gateway dispatch integration with NATS status bus and PAN WireGuard bootstrap with Double Ratchet DM prototype.
- **Week 2:** MLS group messaging, message store, file vault with E2EE sharing, co-pilot meeting pipeline pushing actions to GitHub, and compose stack packaging with Tauri.
- **Week 3:** Governance hardening (SBOM, cosign, SLSA attestations), audit chain completion, edge expansion toggle, performance passes, accessibility, and on-call runbook.

## 14. Risks & Mitigations

- **Key Recovery:** Offer opt-in Shamir escrow with offline custodians and provide strong warnings.
- **Media E2EE limits:** Ensure Insertable Streams coverage; avoid server-side recording unless re-encrypted by clients.
- **Agent Safety:** Apply router guardrails with cost/time budgets and enforce provenance.

## 15. Next Steps

1. Create the app shell and Switchboard component; wire `docker-compose.switchboard.yml` for local media, OPA, and the agent gateway.
2. Add OPA policy and CI stub, enforcing fail-closed widget rendering.
3. Implement the provisioning wizard (passkeys → WireGuard peer → OIDC client).
4. Ship the meeting co-pilot MVP (transcribe → chapters → actions).
5. Pilot in device-only mode before expanding to the edge once the security posture is validated.

---

**Internal Naming:** Project codename is **Switchboard** (unit: **Operator**); PAN overlay is **Backline**. Palette verbs include `/call`, `/present`, `/join`, `/status`, and `/handoff`.
