# Summit App Runtime (SAR): MCP-Compatible Agentic App Runtime

## Authority alignment (governance first)

This plan is governed by the Summit Readiness Assertion and the ecosystem constitution. It is intentionally constrained to the definitions and authority files in `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, and the GA guardrails in `docs/ga/`. All SAR artifacts must align to those sources of truth, with any legacy bypasses reclassified as **Governed Exceptions** and logged in the provenance ledger.

## 1) Competitive teardown (MCP Apps baseline → SAR moat)

**MCP Apps key mechanisms**

- **ui:// resources** declared in tool metadata for host prefetch/review before execution.
- **JSON-RPC over postMessage** for UI ↔ host communication.
- **Cross-client UI rendering** inside AI hosts (Claude, Goose, VS Code Insiders, ChatGPT) enabling “apps-within-chat” UX.

**Gaps we exploit (SAR advantages)**

- **Governance-first UX**: MCP Apps lacks embedded policy evaluation for every UI event and tool call; SAR enforces policy-as-code at each boundary.
- **Cryptographic trust**: MCP Apps does not require signed UI resources or provenance chains; SAR mandates signature verification and supply-chain attestations.
- **Enterprise provenance**: MCP Apps lacks tamper-evident interaction logs and deterministic replay; SAR provides audit ledger + replay harness.
- **Distribution control**: MCP Apps has no tenant-scoped distribution, staged rollouts, or kill-switch infrastructure; SAR bakes these in.
- **Data boundary labeling**: MCP Apps does not enforce redaction or sensitivity labeling at UI boundaries; SAR does.

Security forcing function: MCP server ecosystems have already experienced real security failures; SAR treats server/tool inputs as hostile and enforces defense-in-depth by default.

## 2) Architecture (components + responsibilities)

```mermaid
flowchart LR
  subgraph Host[SAR Host (client adapter)]
    UI[UI Renderer]
    Bridge[postMessage JSON-RPC Bridge]
    Prefetch[UI Prefetch + Review]
  end

  subgraph Policy[SAR Policy Engine]
    OPA[OPA Eval]
    PolicyGate[Tool + UI Event Gate]
  end

  subgraph Sandbox[SAR UI Sandbox]
    IFrame[Isolated iframe + CSP]
    Cap[Capability Grants]
  end

  subgraph Registry[SAR App Registry]
    Pack[App Pack Store]
    Sign[Signature + Attestation Store]
    Kill[Kill Switch + Revocation]
  end

  subgraph Ledger[SAR Audit Ledger]
    Audit[WORM Audit Log]
    Replay[Deterministic Replay Store]
    Evidence[Evidence Bundle Export]
  end

  subgraph Harness[SAR Compatibility Harness]
    Ref[Reference Host Runner]
    Diff[UI + RPC Diffing]
    Fixtures[Golden Fixtures]
  end

  UI --> Sandbox
  Bridge --> PolicyGate
  PolicyGate --> OPA
  Prefetch --> Sign
  Sign --> Pack
  PolicyGate --> Audit
  UI --> Audit
  Audit --> Replay
  Replay --> Evidence
  Pack --> Host
  Ref --> Diff
  Diff --> Fixtures
```

**Component responsibilities**

- **SAR Host**: fetches UI resources (`ui://`), performs signature/provenance verification before render, mediates JSON-RPC for UI ↔ tool calls, emits audit events.
- **SAR Policy Engine**: enforces allow/deny/transform for every UI event and tool invocation; policy decisions are logged with immutable proofs.
- **SAR UI Sandbox**: isolates UI templates (CSP + sandboxed iframe), removes ambient authority, grants explicit capabilities only.
- **SAR App Registry**: stores signed app packs, manages tenant distribution, staged rollouts, and kill-switch revocations.
- **SAR Audit Ledger**: hash-chained, WORM-style audit trails across UI events, tool calls, outputs, and state transitions; provides deterministic replay and evidence bundles.
- **SAR Compatibility Harness**: runs MCP Apps in Summit host and a reference host to verify UI rendering and RPC parity.

## 3) Specs & schemas (repo-ready)

### 3.1 App manifest schema (`summit.app.json`)

```json
{
  "$schema": "https://schemas.summit.example/sar/app-manifest.schema.json",
  "app_id": "com.summit.sample.slack",
  "name": "Summit Slack MCP App",
  "version": "1.0.0",
  "publisher": {
    "name": "Summit",
    "org_id": "summit",
    "contact": "security@summit.example"
  },
  "entrypoints": {
    "mcp_server": "mcp://localhost:9000",
    "ui": ["ui://summit/slack/main"]
  },
  "capabilities": {
    "tools": ["slack.search", "slack.post"],
    "ui_events": ["ui.render", "ui.submit", "ui.intent"],
    "data_access": ["case.read", "case.write"],
    "network": ["https://slack.com"],
    "storage": ["kv.read", "kv.write"]
  },
  "policies": {
    "opa": {
      "bundle": "policies/opa/bundle.tar.gz",
      "entrypoint": "sar.app.allow"
    },
    "default_decision": "deny"
  },
  "signatures": {
    "ui": "signatures/ui.manifest.sig",
    "package": "signatures/app.pack.sig",
    "provenance": "attestations/slsa.provenance.json"
  },
  "sbom": "sbom/cyclonedx.json",
  "tests": {
    "compat": "tests/compat/harness.json",
    "policy": "tests/policy/denylist.json"
  },
  "distribution": {
    "tenants": ["alpha", "bravo"],
    "rollout": "staged",
    "min_host_version": ">=0.4.0"
  }
}
```

### 3.2 Capability model (`capabilities.yaml`)

```yaml
capabilities:
  tools:
    - id: slack.search
      risk: high
      requires: ["policy.allow.tool", "audit.log"]
    - id: slack.post
      risk: high
      requires: ["policy.allow.tool", "audit.log", "data.redaction"]
  ui_events:
    - id: ui.render
      risk: medium
    - id: ui.submit
      risk: high
  data_access:
    - id: case.read
      risk: medium
    - id: case.write
      risk: high
  network:
    - id: https://slack.com
      risk: high
  storage:
    - id: kv.read
      risk: low
    - id: kv.write
      risk: medium
```

### 3.3 Signature + provenance model (`signatures.json`)

```json
{
  "keys": {
    "ui_signer": "did:web:summit.example#ui-signer",
    "package_signer": "did:web:summit.example#package-signer"
  },
  "signatures": {
    "ui_manifest": {
      "alg": "ed25519",
      "sig": "base64:...",
      "signed_at": "2026-01-24T00:00:00Z"
    },
    "package": {
      "alg": "ed25519",
      "sig": "base64:...",
      "signed_at": "2026-01-24T00:00:00Z"
    }
  },
  "provenance_chain": ["attestations/slsa.provenance.json", "attestations/sbom.attestation.json"]
}
```

### 3.4 Policy hook contract (`policy-input.json`)

```json
{
  "event": {
    "type": "ui_event | tool_call",
    "name": "ui.submit",
    "app_id": "com.summit.sample.slack",
    "user": {
      "id": "user-123",
      "roles": ["analyst"]
    },
    "data_labels": ["CUI", "PII"],
    "payload_hash": "sha256:..."
  },
  "context": {
    "tenant_id": "alpha",
    "session_id": "sess-456",
    "host_version": "0.4.0"
  }
}
```

OPA decision outcomes are **allow**, **deny**, or **transform**. Transform responses must return redaction rules and a re-signed payload hash to preserve audit integrity.

### 3.5 Audit log schema (`audit-log.json`)

```json
{
  "event_id": "evt-001",
  "timestamp": "2026-01-24T00:00:01Z",
  "session_id": "sess-456",
  "app_id": "com.summit.sample.slack",
  "actor": { "id": "user-123", "roles": ["analyst"] },
  "ui_event": { "name": "ui.submit", "payload_hash": "sha256:..." },
  "tool_calls": [{ "name": "slack.search", "input_hash": "sha256:...", "decision": "allow" }],
  "outputs": ["sha256:..."],
  "policy": {
    "bundle": "policies/opa/bundle.tar.gz",
    "decision": "allow",
    "decision_id": "dec-789"
  },
  "integrity": {
    "prev_hash": "sha256:prev",
    "entry_hash": "sha256:this"
  }
}
```

## 4) Minimal implementation plan (MVP → V1 → VNext)

### MVP (compatibility + baseline governance)

- **Host**: render `ui://` resources, JSON-RPC over postMessage, prefetch/review of UI assets.
- **Sandbox**: iframe isolation + CSP + capability grant list.
- **Policy**: OPA decision gate on every UI event + tool call with structured audit output.
- **Audit**: hash-chained ledger for UI + tool events.
- **Harness**: compatibility runner for a third-party MCP App against a reference host.

**Acceptance criteria (MVP)**

- Summit host renders a third-party MCP App UI identically to the reference host.
- Every UI event yields a policy decision log and audit ledger entry.
- Denied tool calls return structured policy denial with remediation guidance.

### V1 (cryptographic trust + enterprise distribution)

- **Signed UI templates** with verification + provenance chain checks.
- **Supply-chain hardening**: SBOM + SLSA attestation required on app pack ingestion.
- **Tenant distribution**: staged rollout, version pinning, and kill-switch revocation.
- **Evidence bundles**: exportable session packages for compliance.
- **Deterministic replay**: runbook-style replay harness with declared limitations.

**Acceptance criteria (V1)**

- Host refuses unsigned UI assets and logs verification failures.
- Evidence bundle export includes policy decisions, tool calls, and data labels.
- Kill switch revokes app versions within defined SLO.

### VNext (marketplace + cross-client conformance)

- **Marketplace**: app discovery, trust scores, usage telemetry.
- **Conformance suite**: cross-client UI + RPC parity tests.
- **Advanced UI components**: governed component library with built-in data labeling.

**Acceptance criteria (VNext)**

- Marketplace publish requires policy bundle + attestations.
- Conformance suite passes for at least one external host adapter.

## 5) Example code skeleton (repo layout)

```
packages/
  sar-host/
    src/
      adapters/
        mcp-apps/
        summit/
      sandbox/
      prefetch/
      bridge/
      audit/
  sar-policy/
    src/
      opa/
      gates/
      policy-input.ts
  sar-registry/
    src/
      app-pack/
      signatures/
      distribution/
      kill-switch/
  sar-sdk/
    src/
      manifest/
      capabilities/
      client/
    examples/
      mcp-app-sample/
        summit.app.json
        ui/
        policies/
        tests/
      policy-pack-sample/
        bundle.tar.gz
        policy.rego
```

## 6) Acceptance tests (explicit)

1. **Run MCP App with rich UI and tool calls**
   - Verify host renders `ui://` resource and processes JSON-RPC UI events.
2. **Prefetch + signature verification**
   - Host prefetches UI resources and validates signatures before render.
3. **Policy denial + audit record**
   - Policy denies a forbidden tool call and emits a structured audit record.
4. **Evidence bundle export**
   - Exported bundle includes UI events, policy decisions, tool calls, outputs, and data labels.

## Tradeoffs and constraints

- **Intentionally constrained** to host-agnostic adapters (no platform-specific UI client work).
- **Deferred pending** external host conformance suite selection; MVP targets one reference host for parity testing.
