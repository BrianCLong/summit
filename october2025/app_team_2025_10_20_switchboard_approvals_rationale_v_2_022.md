# AppTeam-2025-10-20-Switchboard-approvals-rationale-v2-022

**Sprint 22 (Oct 20 → Oct 31, 2025, America/Denver)**  
**Release Train:** Q4’25 “Foundations GA” — Wave 1  
**Theme:** Make Approvals & Incident/Runbook Hub production‑ready with **policy‑gated actions, rationale library v2, and evidence‑first UX**.

---

## 0) Sprint Goal & Exit Criteria

**Goal:** Ship a Switchboard canary build enabling **Approvals E2E with rationale templates, selective disclosure, command‑palette actions, and audit replay** for 1 pilot tenant.

**Exit Criteria (Go/No‑Go 2025‑10‑31):**

- Approvals: submit → evaluate (OPA) → approve/deny → rationale captured (template + free‑text) → **signed receipt** visible in Timeline.
- **Selective disclosure** working (redacted rationale for non‑privileged roles); access checked via ABAC.
- **Command Palette v1**: ≥10 core actions; denied actions show policy reason; telemetry events logged.
- **Runbook Center v0.9**: executable steps with inline approvals; rollback notes + receipts.
- p95 end‑to‑end approval roundtrip (UI→API→OPA→UI) **≤ 1.5s** in staging canary. p99 error rate **< 0.5%**.
- Docs-as-code, policies, tests, dashboards, Helm/Terraform updates, and evidence bundle attached to release.

---

## 1) Work Breakdown (Epics → Stories → Acceptance)

### EPIC D — Approvals & Rationale Center (v2)

- **D1. Rationale Templates v2**  
  _Stories:_ template CRUD, role‑scoped availability, reviewer hints, merge variables (entity, risk level).  
  _Acceptance:_ create/edit templates; ABAC enforces visibility; inline preview renders merged variables.
- **D2. Selective Disclosure & Redaction**  
  _Stories:_ redact rules in policy, redact‑aware receipt viewer, export with selective fields.  
  _Acceptance:_ non‑privileged view hides sensitive fields; export API returns minimal bundle; verification passes.
- **D3. Approvals Notifications & SLA Timers**  
  _Stories:_ email/webhook notifications, reminder SLA timers, escalation policy.  
  _Acceptance:_ timers fire via worker; escalation decision logged; audit shows notification evidence.

### EPIC E — Command Palette & Actionability

- **E1. Command Palette v1 (Hardening)**  
  _Stories:_ entity search perf, top actions, keyboard nav, policy preflight.  
  _Acceptance:_ 10 actions complete; denied actions show OPA reason; median search < 120ms on canary.
- **E2. Action Telemetry & Hints**  
  _Stories:_ emit events, quick‑hints tooltips, recently used.  
  _Acceptance:_ events visible in dashboard; hints rendered contextually; persistence across sessions.

### EPIC F — Runbook Center (v0.9 → v1 slice)

- **F1. Executable Steps + Inline Approvals**  
  _Stories:_ step types (shell/http/manual), gated by policy, receipt per step.  
  _Acceptance:_ sample incident runbook executes; each step produces a signed receipt; rollback path tested.
- **F2. Runbook Marketplace Scaffold**  
  _Stories:_ list/install sample runbooks, versioning, provenance manifest.  
  _Acceptance:_ install from catalog; signature verified; version pin recorded.

---

## 2) Definition of Done (Switchboard)

- **Spec/Policy:** updated UI/API spec; OPA bundle diff + coverage; acceptance tests added.
- **Tests:** unit/integration/e2e green; policy simulation harness run; golden datasets updated.
- **Provenance:** evidence bundle + signed receipts on privileged flows; selective disclosure validated.
- **Observability:** dashboards + alerts updated; trace exemplars included in PR.
- **Docs/Runbooks:** user guide, reviewer guide, incident runbook; screenshots/snaps updated.
- **Packaging:** Helm/Terraform charts, feature flags, seed data, sample policies/templates.
- **Changelog:** perf + cost deltas noted.

---

## 3) Artifacts, Collateral, and Scaffolds (ready to copy)

### 3.1 Directory Layout (proposed)

```
switchboard/
  apps/web/
    src/
      features/approvals/
        components/
        hooks/
        pages/
        policy/
        templates/
      features/runbooks/
      features/command-palette/
    public/
  packages/
    api-client/
    policy-bundles/
    telemetry/
    receipts-cli/
  ops/
    helm/
    terraform/
    dashboards/
    alerts/
    seed/
```

### 3.2 TypeScript Types — Approvals & Rationale

```ts
// packages/api-client/src/types/approvals.ts
export type RiskLevel = 'low' | 'medium' | 'high';
export interface RationaleTemplate {
  id: string;
  name: string;
  slug: string;
  roles: string[]; // ABAC-controlled visibility
  body: string; // markdown with {{mustache}} vars
  version: string; // semver
  createdAt: string;
}
export interface ApprovalRequest {
  id: string;
  entityId: string;
  action: string;
  risk: RiskLevel;
  requesterId: string;
  rationale: { templateId?: string; text: string };
  status: 'pending' | 'approved' | 'denied' | 'escalated';
  createdAt: string;
}
export interface ReceiptRef {
  id: string;
  url?: string;
  hash: string;
}
```

### 3.3 React Component Skeletons

```tsx
// apps/web/src/features/approvals/components/ApprovalPanel.tsx
import { useState } from 'react';
import { Check, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ApprovalPanel() {
  const [loading, setLoading] = useState(false);
  // TODO: wire to api-client, OPA preflight, receipts
  return (
    <div className="grid gap-4 p-4 rounded-2xl shadow">
      <header className="flex items-center gap-2">
        <Shield className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Approval Request</h2>
      </header>
      {/* rationale editor & template picker */}
      <div className="flex gap-2">
        <Button onClick={() => {}} disabled={loading}>
          <Check className="w-4 h-4" />
          Approve
        </Button>
        <Button variant="destructive" onClick={() => {}} disabled={loading}>
          <X className="w-4 h-4" />
          Deny
        </Button>
      </div>
    </div>
  );
}
```

### 3.4 OPA/ABAC Policy Snippets (selective disclosure)

```rego
package approvals.redaction

# Inputs: { user: {roles: [...]}, approval: {...} }

default redact := false

sensitive_fields := {"rationale.text", "attachments.secrets"}

redact {
  not user_has_privileged_role(input.user.roles)
}

user_has_privileged_role(roles) { some r; roles[r] == "SecurityReviewer" }
user_has_privileged_role(roles) { some r; roles[r] == "Admin" }
```

### 3.5 Telemetry Event Schema (JSONSchema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SwitchboardActionEvent",
  "type": "object",
  "required": ["ts", "tenant", "user", "action", "result"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "tenant": { "type": "string" },
    "user": { "type": "string" },
    "surface": {
      "type": "string",
      "enum": ["palette", "approvals", "runbook"]
    },
    "action": { "type": "string" },
    "result": { "type": "string", "enum": ["allowed", "denied", "error"] },
    "latency_ms": { "type": "number" },
    "receipt_id": { "type": "string" }
  }
}
```

### 3.6 Dashboards (Grafana JSON — sketch)

```json
{
  "title": "Switchboard — Approvals & Palette",
  "panels": [
    {
      "type": "stat",
      "title": "p95 Approval Roundtrip (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(approval_roundtrip_ms_bucket[5m])) by (le))"
        }
      ]
    },
    {
      "type": "stat",
      "title": "p99 Error Rate",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{job=\"switchboard\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"switchboard\"}[5m]))"
        }
      ]
    },
    {
      "type": "graph",
      "title": "Denied by Policy (5m)",
      "targets": [{ "expr": "sum(rate(policy_denied_total[5m])) by (policy)" }]
    }
  ]
}
```

### 3.7 Alert Rules (Prometheus)

```
- alert: SwitchboardHighApprovalLatency
  expr: histogram_quantile(0.95, sum(rate(approval_roundtrip_ms_bucket[5m])) by (le)) > 1500
  for: 10m
  labels: { severity: warning }
  annotations: { summary: "p95 approval roundtrip > 1.5s" }

- alert: SwitchboardErrorRate
  expr: (sum(rate(http_requests_total{job="switchboard",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="switchboard"}[5m]))) > 0.005
  for: 10m
  labels: { severity: critical }
  annotations: { summary: "p99 error rate > 0.5%" }
```

### 3.8 Feature Flags (YAML)

```yaml
switchboard:
  approvals:
    rationale_templates_v2: true
    selective_disclosure: true
    notifications_sla: true
  command_palette:
    v1: true
    action_hints: true
  runbooks:
    inline_approvals: true
    marketplace_scaffold: false # ramp after canary
```

### 3.9 Helm Values (snippet)

```yaml
image:
  repository: registry.internal/switchboard/web
  tag: 0.22.0
policyBundles:
  version: 1.8.0
  source: s3://policies/switchboard/1.8.0.tgz
receipts:
  notary: https://notary.internal
  signingKeyRef: switchboard-receipts-key
```

### 3.10 Seed Data — Templates & Policies

```json
{
  "templates": [
    {
      "name": "Production Access — Low Risk",
      "slug": "prod-access-low",
      "roles": ["Reviewer"],
      "body": "Reason: {{reason}}\nRisk: {{risk}}\nWindow: {{window}}"
    },
    {
      "name": "Data Export Justification",
      "slug": "data-export",
      "roles": ["SecurityReviewer", "Admin"],
      "body": "Purpose: {{purpose}}\nRetention: {{retention}}\nDPO Ticket: {{ticket}}"
    }
  ]
}
```

### 3.11 Runbook Example (incident)

```md
# DB Hot Partition — Mitigation

1. Throttle writes (http step) — requires approval _DBOps_
2. Rebalance shard (manual) — capture rationale
3. Verify latency < target — attach metrics screenshot
4. Rollback if error — receipt attached
```

### 3.12 CLI — Evidence Verification

```
receipts-cli verify --bundle ./artifacts/evidence-bundle.tar.gz --strict
```

### 3.13 PR Template (Switchboard)

```md
## What

-

## Why

-

## Proof

- [ ] Screenshots
- [ ] Trace exemplar link
- [ ] Evidence bundle hash

## Policy

- [ ] OPA bundle version bump
- [ ] Simulation results attached

## Ops

- [ ] Helm/Terraform updates
- [ ] Feature flags
```

### 3.14 Release Notes Template

```md
# Switchboard 0.22.0 — Sprint 22

**Highlights:** Approvals rationale v2, selective disclosure, palette v1 hardening, runbook inline approvals.
**Perf:** p95 approval roundtrip ≤ 1.5s (staging canary)
**Security:** receipts signed; OPA bundle 1.8.0; selective disclosure enabled.
**Ops:** helm chart 0.22; alerts updated.
```

---

## 4) Milestones & Dates

- **2025‑10‑20 Mon:** Kickoff; flags staged; policy bundle 1.8.0 published.
- **2025‑10‑23 Thu:** D1/D2 demo; selective disclosure end‑to‑end.
- **2025‑10‑28 Tue:** Runbook inline approvals demo; palette v1 perf pass.
- **2025‑10‑31 Fri:** Canary Go/No‑Go; evidence bundle finalized; release notes cut.

---

## 5) RASCI

- **Responsible:** App Team (Switchboard), Policy Guild (redaction rules), Platform (receipts/notary)
- **Accountable:** Switchboard Lead
- **Support:** Design (templates UX), SRE (dashboards/alerts), Security (attestations)
- **Consulted:** FinOps (telemetry), Legal (disclosure), DPO (exports)
- **Informed:** Partner Success, Pilot Tenant POCs

---

## 6) Risks & Mitigations

- **Perf hit from redaction hooks** → cache decisions; prefetch attributes; async render fallback.
- **Template sprawl/entropy** → approvals owner reviews weekly; versioning + deprecation policy.
- **Notification noise** → SLA windows + escalation paths; digest mode.
- **Canary instability** → feature flag ramps; rollback runbook; synthetic checks.

---

## 7) Acceptance Test Checklist

- [ ] Approve/Deny flows emit receipts (hash verified)
- [ ] Redacted viewer hides secrets for non‑privileged
- [ ] Export bundle verifies with CLI
- [ ] Palette denied actions show OPA reason
- [ ] Runbook steps produce receipts + rollback
- [ ] Dashboards & alerts live; thresholds tuned

---

## 8) Packaging & Delivery

- Helm chart: `charts/switchboard-0.22.0`
- Terraform: module updates for secrets + policy bundle
- Seed: templates.json, sample policies, demo runbook
- Evidence bundle: receipts + policy decisions + SBOM excerpt
- Screenshots/snaps: approvals,
