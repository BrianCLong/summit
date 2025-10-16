# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Apr 6–Apr 17, 2026 (Sprint 12; Q2 kickoff)  
**Role:** Co‑CEO (Governance, Evidence, Compliance, Buyer/Partner Enablement)  
**Theme:** **Operationalize external trust** — run a limited external audit dry‑run, monetize attestation consumption, expand policy‑signed bundles org‑wide, and make procurement/self‑serve onboarding turnkey.

---

## 1) Sprint Goal

“Convert last quarter’s provenance stack into **repeatable external outcomes**: paid partner rollouts, audit‑ready packs, policy‑signed bundles across repos, and automated onboarding with evidence‑gated entitlements.”

---

## 2) Objectives & Key Results (OKRs)

1. **External audit dry‑run completed** with ≤ 2 remediation items.  
   _Measure:_ Auditor tenant + `auditor/signoff.zip` accepted; Decisions logged.
2. **Attestation consumption monetized** (metering + billing events).  
   _Measure:_ Billing emits `attestation.verify` events per API call; invoices simulated for ≥ 2 tenants.
3. **Signed policy bundle adoption ≥ 95%** of active repos.  
   _Measure:_ Packs contain `policy.tar.gz` + `policy.sig`; portal badge green.
4. **Self‑serve partner onboarding ≤ 1 hour.**  
   _Measure:_ `create-trust-portal` + wizard deploy; checklist passes end‑to‑end.
5. **Evidence SLOs tightened:** time‑to‑pack p50 ≤ **8 min**; portal uptime ≥ **99.95%**.  
   _Measure:_ Dashboards green; burn < 5%.

---

## 3) Deliverables (Definition of Done)

- **External Audit Dry‑run Kit**: scope doc, access policy overlay, curated sign‑off pack, checklist, acceptance capture.
- **Billing Meter + Entitlements Bridge**: emit usage records from Attestation API; price tiers bound to verified evidence.
- **Org‑wide Policy Signing rollout** via reusable workflow; rotation drill + audit.
- **Onboarding Wizard** (CLI/Portal): tenant config, policy selection, webhook URL test, pack verification.
- **Portal v2.4**: onboarding flow, billing usage panel, SLA badge (p95/uptime), policy signature status.
- **SLSA L3 phase‑2 rollout plan** to second repo (tasks queued, smoke job).

---

## 4) Work Plan & Owners

| Date   | Work Item                        | Owner          | Exit Criteria                                          |
| ------ | -------------------------------- | -------------- | ------------------------------------------------------ |
| Apr 6  | Audit dry‑run scope + kit        | Co‑CEO         | Scope + checklist merged; auditor tenant live          |
| Apr 7  | Billing meter in API + schema    | DevEx          | `attestation.verify` events in queue with tenant/plan  |
| Apr 8  | Org policy signing rollout       | SecOps         | 95% repos reference reusable signer; verify job green  |
| Apr 9  | Onboarding wizard (CLI + portal) | PM + DevEx     | Wizard creates tenant, tests webhook, verifies pack    |
| Apr 10 | Portal v2.4 usage/SLA badges     | PM             | Panels render; data sourced from metrics APIs          |
| Apr 13 | Audit dry‑run execution          | Co‑CEO         | Findings captured (≤2), Decisions created              |
| Apr 14 | Rotation drill + audit log       | SecOps         | Bundle keyless rotation documented, Maestro run linked |
| Apr 15 | SLSA L3 P2 smoke in second repo  | SecOps + DevEx | Hermetic job green; provenance subjects set            |
| Apr 17 | Demo, invoice sim, retro         | Co‑CEO         | OKRs measured; invoices generated; metrics updated     |

---

## 5) Artifacts & Scaffolding

### 5.1 External Audit Dry‑run Kit

**Path:** `auditor/dryrun.scope.md`

```md
# External Audit Dry‑run — Scope

- Access: auditor‑tenant (read‑only, expiring)
- Evidence: sign‑off pack + policy sigs + SBOM diff + vendor attestations
- Acceptance: ≤2 low‑severity notes; all Decisions logged with owners/dates
```

**Checklist** `auditor/dryrun.checklist.md`

```md
- [ ] Auditor tenant active & scoped
- [ ] Policy bundle signature verified in portal
- [ ] Compliance Pack signature verified
- [ ] DPA/DPIA present & current
- [ ] DR metrics (RPO/RTO) in pack
```

---

### 5.2 Billing Meter & Usage Events

**Path:** `services/billing/schema/usage.json`

```json
{
  "type": "object",
  "required": ["ts", "tenant", "event", "units"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "tenant": { "type": "string" },
    "event": {
      "type": "string",
      "enum": ["attestation.verify", "portal.download"]
    },
    "units": { "type": "number", "minimum": 0 }
  }
}
```

**Gateway hook** `apis/attestation/middleware/meter.mjs`

```js
export async function meter(req, res, next) {
  res.on('finish', () => {
    if (req.path.startsWith('/verify') && res.statusCode === 200) {
      queue.publish('usage', {
        ts: new Date().toISOString(),
        tenant: req.tenant.id,
        event: 'attestation.verify',
        units: 1,
      });
    }
  });
  next();
}
```

**Invoice simulator** `services/billing/run.mjs`

```js
import { sumBy } from 'lodash-es';
export function bill(usages, plan) {
  const price = { Starter: 0.01, Pro: 0.005, Enterprise: 0.0025 }[plan];
  const total =
    sumBy(
      usages.filter((u) => u.event === 'attestation.verify'),
      'units',
    ) * price;
  return { plan, total: Number(total.toFixed(2)) };
}
```

---

### 5.3 Reusable Policy Signing (Org‑wide)

**Path:** `.github/workflows/org.policy.sign.yml`

```yaml
name: org.policy.sign
on: { workflow_call: {} }
permissions: { id-token: write, contents: write }
jobs:
  sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: tar -czf policy.tar.gz policies/*.rego policies/*.json
      - run: COSIGN_EXPERIMENTAL=1 cosign sign-blob --yes --output-signature policy.sig policy.tar.gz
      - uses: actions/upload-artifact@v4
        with: { name: policy-bundle, path: |
          policy.tar.gz
          policy.sig }
```

**Call it from repos:**

```yaml
policy_sign:
  uses: org/.github/.github/workflows/org.policy.sign.yml@main
```

---

### 5.4 Onboarding Wizard (CLI + Portal)

**CLI** `tools/onboard/bin/index.js`

```js
#!/usr/bin/env node
import { execSync as sh } from 'node:child_process';
const name = process.argv[2] || 'tenant-portal';
sh(`npm create trust-portal ${name}`, { stdio: 'inherit' });
console.log('Testing webhook delivery...');
sh(
  `curl -fsS -X POST $WEBHOOK_URL -H 'X-Topicality-Signature: test' -d '{"ping":true}'`,
  { stdio: 'inherit' },
);
console.log('Next: run npm run verify:pack');
```

**Portal wizard route** `tools/trust-portal/pages/onboard.tsx`

```tsx
export default function Onboard() {
  return (
    <div className="grid gap-4">
      <h1>Onboard a Tenant</h1>
      <ol className="list-decimal ml-6">
        <li>Paste webhook URL → test delivery</li>
        <li>Select policy version → verify signature</li>
        <li>Enter repo → fetch latest tag → verify pack/signatures</li>
        <li>Enable entitlements → confirm features</li>
      </ol>
    </div>
  );
}
```

---

### 5.5 Portal v2.4 Panels & Badges

**SLA Badge** `components/SlaBadge.tsx`

```tsx
export function SlaBadge({ p95, uptime }: { p95: number; uptime: number }) {
  const ok = p95 <= 300 && uptime >= 99.95;
  return (
    <span
      className={`px-2 py-1 rounded-2xl ${ok ? 'bg-green-100' : 'bg-yellow-100'}`}
    >
      p95 {p95}ms • {uptime}%
    </span>
  );
}
```

**Usage panel** `components/UsagePanel.tsx`

```tsx
export function UsagePanel({
  rows,
}: {
  rows: { ts: string; event: string; units: number }[];
}) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.ts}</td>
            <td>{r.event}</td>
            <td className="text-right">{r.units}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### 5.6 SLSA L3 P2 — Second Repo Smoke Job

**Path:** `<second-repo>/.github/workflows/release.hermetic.yml` (clone from prior sprint, adjust subjects & runner labels).

---

## 6) Dashboards & Alerts

- **Audit dry‑run status:** green on acceptance; alert on overdue remediations.
- **Billing usage stream:** events/min by tenant; anomalies flagged.
- **Policy signature adoption:** ≥ 95% repos; alert on unsigned.
- **Onboarding success rate:** ≥ 90%; time ≤ 1h; drop‑off funnel.
- **Evidence SLOs:** p50 ≤ 8 min; uptime ≥ 99.95%.

---

## 7) Risks & Mitigations

| Risk                         | Likelihood | Impact | Mitigation                                        |
| ---------------------------- | ---------: | -----: | ------------------------------------------------- |
| Billing event loss           |        Med |    Med | Durable queue + retries + DLQ; reconciliation job |
| Onboarding wizard complexity |        Med |    Med | Keep MVP steps; add telemetry & docs              |
| Repos with custom policies   |        Low |    Med | Escape hatches; per‑repo signer override          |
| Auditor expectations drift   |        Low |    Med | Lock scope; capture deltas as Decisions           |

---

## 8) Alignment Notes

- Direct continuation of Sprint 11 (signed bundles, webhooks) and Q1 outcomes (sign‑off, DPA/DPIA, board pack).
- Preps Q2 mid‑cycle: external audit engagement, partner rollouts, monetization GA.

---

## 9) Exit Checklist

- Dry‑run accepted; ≤2 remediations logged with owners/dates.
- Billing meter producing events; two invoice sims generated.
- Signed policy bundles present and verified across ≥95% repos.
- Onboarding wizard deployed; two tenant runs completed ≤ 1h.
- Evidence SLOs green; portal v2.4 live; demo recorded; risks updated.
