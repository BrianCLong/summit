# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Apr 20–May 1, 2026 (Sprint 13; Q2 cadence)

**Role:** Co‑CEO (Governance, Evidence, Compliance, Buyer/Partner Enablement)

**Theme:** **Make it real for paying partners** — convert dry‑run → **external audit engagement**, push **monetization GA** for attestation/API, expand **SLSA L3 rollout**, finalize **procurement & contract packs**, and keep every release green with signed evidence.

---

## 1) Sprint Goal

“Launch paid partner cohorts with **evidence‑gated entitlements**, run the first **external audit engagement** on a live tag, and move SLSA L3 from POC to **repeatable org pattern** — while keeping Disclosure/Compliance Packs signed and consumable.”

---

## 2) Objectives & Key Results (OKRs)

1. **Monetization GA** for attestation consumption.  
   _Measure:_ Billing invoices generated for ≥ 3 tenants; error rate < 0.5%.
2. **External audit engagement #1 executed**.  
   _Measure:_ Auditor acceptance with ≤ 2 low notes; Decisions logged.
3. **SLSA L3 rollout** to **3 repos** with hermetic build + subjects pinned.  
   _Measure:_ Job green; provenance includes isolated builder claims.
4. **Procurement Pack v1.1** adopted by partners.  
   _Measure:_ 2 partner submissions accepted without rework.
5. **Evidence SLOs**: time‑to‑pack p50 ≤ **8 min**; portal uptime ≥ **99.95%**; policy signature coverage 100%.  
   _Measure:_ Dashboards green for the window.

---

## 3) Deliverables (Definition of Done)

- **Billing GA**: metering → rating → invoice PDF with line items for `attestation.verify`, portal downloads; webhook for `invoice.created`.
- **Audit Engagement Kit**: scope, access overlay, sign‑off pack, acceptance capture; portal Auditor tab deep‑links.
- **SLSA L3 Pattern**: reusable job, runner labels, vendor snapshot cookbook, checklist; added to repos A/B/C.
- **Procurement Pack v1.1**: fills CAIQ‑lite answers, adds policy signature proof + bundle hash; partner-facing README.
- **Portal v2.5**: Billing page (usage & invoices), Audit engagement tracker, SLSA indicators per repo.
- **Runbooks**: billing close process; audit day‑of flow; hermetic build FAQ.

---

## 4) Work Plan & Owners

| Date   | Work Item                              | Owner        | Exit Criteria                                     |
| ------ | -------------------------------------- | ------------ | ------------------------------------------------- |
| Apr 20 | Monetization GA plan lock & price card | Co‑CEO       | Plan, rates, limits merged; feature flags set     |
| Apr 21 | Billing pipeline GA (rating→invoice)   | DevEx        | Invoice PDFs emitted; signature hash stored       |
| Apr 22 | Audit #1 scope + artifacts freeze      | Co‑CEO       | Scope signed; tag frozen; Auditor tenant ready    |
| Apr 23 | SLSA L3 rollout to repo A              | SecOps+DevEx | Hermetic job green; provenance verified           |
| Apr 24 | SLSA L3 rollout to repos B & C         | SecOps+DevEx | Both jobs green; docs updated                     |
| Apr 27 | Procurement Pack v1.1 templates        | PM           | Accepted by 2 partners in sandbox                 |
| Apr 28 | Portal v2.5 billing/audit pages        | PM           | Pages green; data wired; no secrets               |
| Apr 29 | Audit #1 execution + acceptance        | Co‑CEO       | Acceptance note logged; ≤ 2 findings as Decisions |
| Apr 30 | Billing close + invoices to tenants    | Co‑CEO       | Invoices generated; webhooks sent                 |
| May 1  | Demo + retro + Q2 mid‑plan seeds       | Co‑CEO       | OKRs measured; dashboards updated                 |

---

## 5) Artifacts & Scaffolding

### 5.1 Billing GA — Rating → Invoice

**Invoice generator** `services/billing/invoice.mjs`

```js
import fs from 'fs';
export function generate(usages, plan) {
  const price = { Starter: 0.01, Pro: 0.005, Enterprise: 0.0025 }[plan];
  const total = usages.reduce(
    (s, u) => s + (u.event === 'attestation.verify' ? u.units * price : 0),
    0,
  );
  const inv = {
    id: `inv_${Date.now()}`,
    plan,
    lines: usages,
    total: +total.toFixed(2),
  };
  fs.writeFileSync(`invoices/${inv.id}.json`, JSON.stringify(inv, null, 2));
  return inv;
}
```

**Webhook** `services/billing/webhooks.mjs`

```js
export async function emitInvoice(inv, url, secret) {
  /* HMAC sign + POST {id,total,hash} */
}
```

**CI step (simulate):**

```yaml
invoices:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: node services/billing/invoice.mjs
```

---

### 5.2 Audit Engagement Kit

**Path:** `auditor/engagement.plan.md`

```md
# External Audit — Engagement #1

- Tag: <frozen tag>
- Access: auditor-tenant (expires T+7)
- Pack: auditor/signoff.zip (sha256: ...)
- Acceptance: ≤ 2 low notes → Decisions with owners/dates
```

**Portal tracker component** `tools/trust-portal/components/AuditTracker.tsx`

```tsx
export function AuditTracker({
  status,
  notes,
}: {
  status: 'scheduled' | 'in_progress' | 'accepted';
  notes: number;
}) {
  const color =
    status === 'accepted' && notes <= 2 ? 'bg-green-100' : 'bg-yellow-100';
  return (
    <div className={`p-3 rounded-2xl ${color}`}>
      Audit: {status} • notes: {notes}
    </div>
  );
}
```

---

### 5.3 SLSA L3 Pattern (Reusable Job)

**Path:** `.github/workflows/org.release.hermetic.yml`

```yaml
name: org.release.hermetic
on: { workflow_call: {} }
permissions: { id-token: write, contents: write }
jobs:
  hermetic:
    runs-on: [self-hosted, isolated]
    container: { image: ghcr.io/yourorg/builder:20 }
    steps:
      - uses: actions/checkout@v4
      - run: iptables -P OUTPUT DROP || true
      - run: corepack enable && pnpm i --frozen-lockfile --offline
      - run: pnpm build
      - uses: slsa-framework/slsa-github-generator@v2
        with: { base64-subjects: ${{ secrets.SUBJECTS_B64 }} }
```

**Repo usage:**

```yaml
hermetic_release:
  uses: org/.github/.github/workflows/org.release.hermetic.yml@main
```

---

### 5.4 Procurement Pack v1.1

**Path:** `.github/actions/procurement-pack/action.yml` (delta)

```yaml
steps:
  - shell: bash
    run: |
      # add CAIQ-lite answers + policy signature proofs
      cp policies/answers/caiq-lite.md procurement/ 2>/dev/null || true
      cp policy.sig procurement/ 2>/dev/null || true
      echo "policy_sha=$(sha256sum policy.tar.gz|awk '{print $1}')" > procurement/POLICY_HASH.txt
```

---

### 5.5 Portal v2.5 — Billing & SLSA Indicators

**Billing page** `tools/trust-portal/pages/billing.tsx`

```tsx
export default function Billing({ rows }: { rows: any[] }) {
  const total = rows.reduce(
    (s, r) => s + (r.event === 'attestation.verify' ? r.units * r.price : 0),
    0,
  );
  return (
    <div className="grid gap-4">
      <h1>Billing</h1>
      <div>
        Total: ${'{'}total.toFixed(2){'}'}
      </div>
    </div>
  );
}
```

**SLSA chip** `components/SlsaChip.tsx`

```tsx
export function SlsaChip({ level }: { level: 2 | 3 }) {
  return (
    <span
      className={`px-2 py-1 rounded-2xl ${level === 3 ? 'bg-green-100' : 'bg-gray-100'}`}
    >
      SLSA L{level}
    </span>
  );
}
```

---

## 6) Dashboards & Alerts

- **Monetization GA:** invoice success rate ≥ 99%; webhook delivery ≥ 99%.
- **Audit #1:** status, notes count; alert if > 2 or overdue.
- **SLSA L3 adoption:** 3 repos green; alert if any job red.
- **Procurement v1.1:** acceptance rate; rework count.
- **Evidence SLOs:** p50 ≤ 8 min; uptime ≥ 99.95%; policy sig coverage 100%.

---

## 7) Risks & Mitigations

| Risk                       | Likelihood | Impact | Mitigation                              |
| -------------------------- | ---------: | -----: | --------------------------------------- |
| Invoice inaccuracies       |        Med |    Med | Golden tests + manual spot checks       |
| Audit scope drift          |        Low |    Med | Freeze tag; changes logged as Decisions |
| Hermetic runner contention |        Med |    Med | Stagger jobs; priority queue            |
| Partner procurement edits  |        Med |    Low | Editable appendix; keep core immutable  |

---

## 8) Alignment Notes

- Builds on Sprint 12 (dry‑run, signed bundles, onboarding, billing meter).
- Sets up Sprint 14: external audit #2, monetization reporting, and Q2 mid‑cycle board update.

---

## 9) Exit Checklist

- Invoices generated & delivered; partners confirm receipts.
- Audit #1 accepted; notes logged (≤ 2).
- Hermetic release jobs live in 3 repos; provenance verified.
- Procurement Pack v1.1 used by 2 partners with no rework.
- Portal v2.5 live; dashboards green; demo recorded.
