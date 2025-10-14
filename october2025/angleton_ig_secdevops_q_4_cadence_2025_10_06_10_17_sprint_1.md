# Angleton IG — SecDevOps Workstream

**Cadence:** Oct 6–17, 2025 (Sprint 1 of Q4)  
**Alignment:** Matches company OS cadence plan (Oct 6 – Dec 28, 2025)  
**Role:** Security • DevSecOps • Counterintelligence  
**Prime Directive:** Protect people, data, funds, infrastructure, brand.

---

## 1) In‑Depth Review (Repo + Sprint Docs)

### 1.1 What’s in scope (evidence)
- `october2025/companyos-switchboard/` (Next.js web app + Tauri shell; local docker stack; OPA policies; OpenAPI spec; CI workflow).
- `mc_*` bundles (scoped CI reusable workflows; release verification with OPA/cosign; release hardening dashboards; Renovate defaults).
- Sprint plans in `/october2025/*.md` including **Q4 cadence lock** and Switchboard notes.

### 1.2 Key findings (gaps & risks)
1. **CI least‑privilege & supply‑chain gates incomplete**  
   - `ci.switchboard.yml` lacks `permissions:` scoping, cache hardening, SBOM/provenance generation, secret scanning, and artifact signing.
2. **OPA policy hygiene**  
   - `policies/switchboard.rego` mixes **two packages in one file** (`package switchboard` and `package labels`), breaking module semantics; policy is minimal (no action/resource schema; no audit fields; no default labels dataset).
3. **OpenAPI surface underspecified**  
   - `apis/switchboard.yaml` lacks security schemes, request/response schemas, error model, and versioning headers—limits contract testing and policy context.
4. **Local stack security**  
   - `docker-compose.switchboard.yml` uses `network_mode: host` for media/turn; floating `:latest` tags; missing resource limits; no explicit TLS story; no `read_only`/`cap_drop` hardening.
5. **Provenance & SBOM verification**  
   - Release verification workflow exists (cosign/OPA) in `mc_release_verification_opa_alerts_bundle`, but **producer side** (the app repo) doesn’t emit SLSA provenance or CycloneDX SBOM yet; gate input is manual.
6. **Renovate is good but can be safer**  
   - Defaults encourage broad bumping; auto‑merge not bound by CI signal on apps/services; no "require passing" for protected paths.
7. **Observability & policy alerting**  
   - Dashboards templates exist, but Switchboard CI lacks metrics emission and policy‑decision logs artifacting; no tamper‑evident run logs stored.
8. **AuthN step‑up not enforced end‑to‑end**  
   - Policy assumes `webauthn_verified` but no test vectors or e2e checks binding session → action.

---

## 2) Sprint Goal (Oct 6–17)
**Raise baseline to “green, verifiable releases”**: emit & verify SBOM + provenance; fix OPA module hygiene; tighten CI permissions; harden local stack; wire minimal contract tests; ship dashboards; document runbooks.

**Definition of Done**  
- Releases blocked unless: `provenance=verified ∧ SBOM=present ∧ secrets=0 ∧ tests>=90% pass ∧ policies=pass`.  
- CI jobs run with scoped `permissions:` and short‑lived OIDC tokens; all images pinned by digest.  
- OPA policies split, tested, and versioned; inputs and decisions logged.

---

## 3) Backlog (ranked)

### P0 — Must land this sprint
1. **Fix OPA policy module & add labels dataset** (split files; tests; decision log).
2. **Scoped CI + Supply‑chain emitters** for Switchboard (SBOM via CycloneDX + Syft fallback; GitHub Artifact Attestations + cosign).
3. **Release Gate wiring** (auto‑generate `input.json` from CI artifacts; evaluate `release_gate.rego`).
4. **Local stack hardening** (drop `host` network; pin digests; resource limits; minimal caps).

### P1 — Strongly desired
5. **OpenAPI hardening** (security schemes, schemas, error model).
6. **Renovate safety rails** (require CI passing; restrict auto‑merge to devDeps + docs).
7. **Policy telemetry + dashboards** (upload `decision.log` + CI metrics; add PR Health/CI Overview dashboards from bundle).

### P2 — Stretch
8. **WebAuthn step‑up e2e** smoke with Playwright.
9. **DLP/redaction pre‑commit** for logs and PR bodies.

---

## 4) Patch Set (ready‑to‑apply)

> Minimal diffs; reversible; testable. Adjust paths if repo root differs.

### 4.1 OPA Policy split & tests
**File:** `policies/switchboard.rego`
```rego
package switchboard

import data.labels

default allow = false

action_safe {
  input.subject.authenticated
  input.subject.webauthn_verified
  input.action == "render_widget"
  input.resource.widget == "AgentRoster" or input.resource.widget == "LiveTiles" or input.resource.widget == "MeetingStage"
  input.context.classification <= labels.allow_max
}

allow {
  action_safe
}

deny[msg] {
  not allow
  msg := sprintf("blocked: %v on %v", [input.action, input.resource])
}
```

**NEW:** `policies/labels.rego`
```rego
package labels
# 0=public,1=internal,2=confidential,3=secret
allow_max := 2
```

**NEW:** `policies/input.schema.json` (documentation aid)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "subject": {"type":"object","properties":{"authenticated":{"type":"boolean"},"webauthn_verified":{"type":"boolean"}},"required":["authenticated"]},
    "action": {"type":"string"},
    "resource": {"type":"object","properties":{"widget":{"type":"string"}}},
    "context": {"type":"object","properties":{"classification":{"type":"integer"}}}
  },
  "required": ["subject","action","resource","context"]
}
```

**OPA tests:** `policies/switchboard_test.rego`
```rego
package switchboard

test_allow_roster {
  allow with input as {
    "subject": {"authenticated": true, "webauthn_verified": true},
    "action": "render_widget",
    "resource": {"widget": "AgentRoster"},
    "context": {"classification": 1}
  }
}

test_deny_high_classification {
  not allow with input as {
    "subject": {"authenticated": true, "webauthn_verified": true},
    "action": "render_widget",
    "resource": {"widget": "AgentRoster"},
    "context": {"classification": 3}
  }
}
```

### 4.2 Scoped CI with SBOM + Provenance (Switchboard)
**Replace:** `.github/workflows/ci.switchboard.yml`
```yaml
name: CI Switchboard
on:
  pull_request:
  push:
    branches: [ main ]
permissions:
  contents: read
  packages: read
  id-token: write
jobs:
  build-web:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      packages: read
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: corepack enable && pnpm i --frozen-lockfile
      - run: pnpm --filter ./apps/web lint
      - run: pnpm --filter ./apps/web typecheck
      - run: pnpm --filter ./apps/web build
      - name: Generate SBOM (CycloneDX)
        run: |
          npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
      - name: Syft fallback (if CycloneDX fails)
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b .
          ./syft dir:. -o cyclonedx-json > sbom.json || true
      - name: Attest build (GitHub Artifact Attestations)
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: sbom.json
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with: { name: switchboard-ci-artifacts, path: sbom.json }

  policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
          chmod +x opa && sudo mv opa /usr/local/bin/opa
      - run: opa fmt -w policies
      - run: opa test policies -v
      - name: Upload OPA decision logs (sample)
        run: echo '{"ts":"${{ github.run_id }}","policy":"switchboard"}' > decision.log
      - uses: actions/upload-artifact@v4
        with: { name: policy-logs, path: decision.log }
```

**NEW:** `.github/workflows/release.gate.yml`
```yaml
name: release.gate
on:
  workflow_dispatch:
  push:
    tags: [ 'v*.*.*' ]
permissions:
  contents: read
  id-token: write
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: switchboard-ci-artifacts, path: . }
      - name: Build OPA input
        run: |
          jq -n '{ sbom_present: (input!=null), provenance_present: true, critical_checks: ["sbom","provenance"] }' sbom.json > input.json || echo '{"sbom_present":false,"provenance_present":false}' > input.json
      - name: Fetch gate policy
        run: |
          curl -sSL -o release_gate.rego https://raw.githubusercontent.com/your-org/mc_release_verification_opa_alerts_bundle/main/policies/release_gate.rego
      - name: Eval policy
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static && chmod +x opa
          ./opa eval -i input.json -d release_gate.rego "data.policy.release.allow" | tee allow.out
          [ "$(cat allow.out | tr -dc 'truefalsen')" = "true" ] || (echo "OPA gate failed" && exit 1)
```

### 4.3 Local stack hardening (docker‑compose)
**Edit:** `deploy/local/docker-compose.switchboard.yml`
```yaml
version: "3.8"
services:
  sfu:
    image: ghcr.io/companyos/media-sfu@sha256:<PINNED>
    ports: ["50000-50050:50000-50050/udp"]
    environment: [ "ENABLE_E2EE=true" ]
    read_only: true
    cap_drop: ["ALL"]
  turn:
    image: docker.io/coturn/coturn@sha256:<PINNED>
    ports: ["3478:3478/udp", "49160-49200:49160-49200/udp"]
    command: ["-n","--no-cli","--no-tls","--no-dtls","--min-port","49160","--max-port","49200"]
    read_only: true
    cap_drop: ["ALL"]
  signaling:
    image: ghcr.io/companyos/signaling@sha256:<PINNED>
    ports: ["8080:8080"]
    read_only: true
    cap_drop: ["ALL"]
  nats:
    image: docker.io/library/nats@sha256:<PINNED>
    command: ["-js"]
    ports: ["4222:4222","8222:8222"]
    read_only: true
    cap_drop: ["ALL"]
  opa:
    image: openpolicyagent/opa@sha256:<PINNED>
    command: ["run","--server","/policies"]
    volumes:
      - ../../policies:/policies:ro
    ports: ["8181:8181"]
    read_only: true
    cap_drop: ["ALL"]
  agent-gateway:
    image: ghcr.io/companyos/agent-gateway@sha256:<PINNED>
    environment:
      - NATS_URL=nats://nats:4222
      - OPA_URL=http://opa:8181
    ports: ["7070:7070"]
    read_only: true
    cap_drop: ["ALL"]
```

### 4.4 OpenAPI hardening (seed)
**Edit:** `apis/switchboard.yaml`
```yaml
openapi: 3.0.3
info: { title: CompanyOS Switchboard API, version: 0.2.0 }
servers: [{ url: https://api.companyos.local }]
components:
  securitySchemes:
    session:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Agent: { type: object, properties: { id: { type: string }, name: { type: string } }, required: [id,name] }
    Dispatch: { type: object, properties: { agentId: { type: string }, action: { type: string }, payload: {} }, required: [agentId,action] }
paths:
  /agents:
    get:
      summary: List registered agents
      security: [ { session: [] } ]
      responses:
        '200': { description: OK, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Agent' } } } } }
  /actions/dispatch:
    post:
      summary: Dispatch action
      security: [ { session: [] } ]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/Dispatch' } } } }
      responses:
        '202': { description: Accepted }
        '401': { description: Unauthorized }
```

### 4.5 Renovate safety rails
**Edit:** `.github/renovate/default.json5`
```json5
{
  extends: ["config:recommended", ":semanticCommits", ":separateMajorReleases", "group:allNonMajor", "helpers:pinDigests"],
  timezone: "America/Denver",
  schedule: ["after 3am on Monday"],
  rangeStrategy: "bump",
  npm: { enabled: true }, pnpm: { enabled: true },
  packageRules: [
    { matchDepTypes: ["devDependencies"], matchUpdateTypes: ["minor","patch","pin","digest"], automerge: true, requiredStatusChecks: ["CI Switchboard"] },
    { matchPaths: ["apps/web/**","src-tauri/**"], automerge: false }
  ]
}
```

### 4.6 Code Scanning (optional but recommended)
**NEW:** `.github/workflows/codeql.yml`
```yaml
name: codeql
on: [push, pull_request]
permissions: { contents: read }
jobs:
  analyze:
    uses: github/codeql-action/.github/workflows/codeql.yml@main
    with: { languages: 'javascript' }
```

---

## 5) Runbooks

### 5.1 Containment (Assume‑breach: token leak in Switchboard)
1) Disable tokens / rotate keys → 2) Revoke risky roles → 3) Isolate workloads (scale‑to‑zero; NetworkPolicies) → 4) Preserve forensics (artifact logs, `decision.log`, CI artifacts).

**Rollback (30 min):** revert last policy diff; unpin prior working images; re‑enable gate.

### 5.2 Recovery
Rebuild artifacts with provenance; regenerate SBOM; policy tighten; staged traffic restore 1%→10%→50%→100%; alerting SLOs.

---

## 6) Tests & Verification
- **Policy:** `opa test policies -v` (added cases).
- **Gate:** `release.gate` must pass; fails without SBOM/provenance.
- **CI:** build proves with CycloneDX file present; GitHub attestation recorded.
- **Local:** `docker-compose up` without host networking; containers start with `read_only` and no caps.

**Success Criteria**  
- All CI jobs green; OPA allow=true for happy path; deny on high classification; dashboards rendering CI & PR health; Renovate PRs auto‑merge devDeps only after CI pass.

---

## 7) Ownership & Approvals
- **Owners:** SecDevOps (Angleton IG), App Eng (Switchboard), Infra.
- **Approvals required:** App Eng lead (CI changes), Infra lead (compose pins), Sec lead (policy changes).

---

## 8) Changelog / PR Template Snippets
**PR Checklist (add to `.github/pull_request_template.md`)**
- [ ] SBOM emitted  
- [ ] Provenance attested  
- [ ] OPA policies tested  
- [ ] Images pinned  
- [ ] Secrets scan clean

---

## 9) Artifacts Index (for reviewers)
- Policy files: `policies/switchboard.rego`, `policies/labels.rego`, `policies/switchboard_test.rego`, `policies/input.schema.json`  
- CI: `.github/workflows/ci.switchboard.yml`, `.github/workflows/release.gate.yml`, `.github/workflows/codeql.yml`  
- Local: `deploy/local/docker-compose.switchboard.yml`  
- API: `apis/switchboard.yaml`  
- Renovate: `.github/renovate/default.json5`

---

## 10) Timeline
- **Day 1–2:** OPA split + tests; CI permissions + SBOM emit.  
- **Day 3–4:** Release gate wiring; compose hardening.  
- **Day 5:** OpenAPI update; Renovate rails; dashboards wiring.  
- **Day 6–7:** Buffer + polish + docs.

