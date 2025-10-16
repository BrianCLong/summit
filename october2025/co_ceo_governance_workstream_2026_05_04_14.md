# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** May 4–May 15, 2026 (Sprint 14; Q2 cadence)

**Role:** Co‑CEO (Governance, Evidence, Compliance, Buyer/Partner Enablement)

**Theme:** **Scale & prove at revenue level** — External Audit #2 on a fresh tag, monetization reporting (recognition‑ready), SLSA L3 rollout playbook to more repos, and finance‑grade evidence surfaced in the Trust Portal.

---

## 1) Sprint Goal

“Turn provenance into **billable, auditable outcomes**: GA monetization reporting with evidence trails, execute **External Audit #2**, expand **SLSA L3** to 6 repos, and keep every tag shipping signed, verified packs within tighter SLOs.”

---

## 2) Objectives & Key Results (OKRs)

1. **Monetization reporting GA** (rev‑rec ready) with evidence.  
   _Measure:_ Revenue events → reports → invoice PDFs; hashes logged; variance ≤ 1% vs control.
2. **External audit #2 executed** with ≤ 2 low‑severity notes.  
   _Measure:_ Acceptance note logged as Decision; portal status green.
3. **SLSA L3 rollout → 6 repos** (hermetic builds + subject pinning).  
   _Measure:_ Jobs green; provenance includes isolated builder claims.
4. **Evidence SLOs tightened**: time‑to‑pack p50 ≤ **7 min**, uptime ≥ **99.95%**.  
   _Measure:_ Dashboards green; burn < 5%.
5. **Risk score ≤ 55** on last tag across core repos.  
   _Measure:_ `sbom.diff.json` risk scores ≤ 55 or Decision override.

---

## 3) Deliverables (Definition of Done)

- **Revenue Events → Reports**: schema v1.0, aggregation job, reconciliation with usage, invoice PDFs, and `revenue-report.csv` attached to release.
- **Audit #2 Kit**: scoped sign‑off pack, auditor tenant overlay, acceptance capture.
- **SLSA L3 Rollout Playbook**: reusable hermetic job, runner pool plan, vendor snapshot cookbook; applied to 3 additional repos.
- **SBOM Diff Allowlist**: policy + CI gate to reduce false positives; Disclosure Pack appendix updated.
- **SLA Credits Policy & Calculator** tied to uptime/p95 breaches; portal badge + credit note.
- **Portal v2.6**: Finance view (usage → invoice → revenue), Audit #2 tracker, SLSA L3 adoption map, Risk score trend.

---

## 4) Work Plan & Owners

| Date   | Work Item                            | Owner          | Exit Criteria                                        |
| ------ | ------------------------------------ | -------------- | ---------------------------------------------------- |
| May 4  | Revenue events schema & ETL          | Co‑CEO + DevEx | `revenue.events.json` + ETL job produce daily report |
| May 5  | Reconciliation + invoice PDFs        | DevEx          | Variance ≤1%; PDFs generated; hashes logged          |
| May 6  | Audit #2 scope + artifacts freeze    | Co‑CEO         | Scope signed; auditor tenant ready                   |
| May 7  | SLSA L3 rollout to repos D/E         | SecOps+DevEx   | Hermetic jobs green; provenance verified             |
| May 8  | SLSA L3 rollout to repo F + playbook | SecOps+DevEx   | Job green; playbook merged                           |
| May 11 | SBOM diff allowlist policy + gate    | SecOps         | Gate reduces noise; risks ≤55                        |
| May 12 | SLA credits policy + calculator      | Co‑CEO         | Credit notes produced on simulated breach            |
| May 13 | Portal v2.6 finance/audit maps       | PM             | Views render; data wired; no secrets                 |
| May 14 | Audit #2 execution + acceptance      | Co‑CEO         | Acceptance note logged with ≤2 notes                 |
| May 15 | Demo + retro + Q2 mid‑plan seeds     | Co‑CEO         | OKRs measured; dashboards updated                    |

---

## 5) Artifacts & Scaffolding

### 5.1 Revenue Events Schema + ETL

**Path:** `services/billing/schema/revenue.events.json`

```json
{
  "type": "object",
  "required": ["ts", "tenant", "event", "amount", "currency", "evidence"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "tenant": { "type": "string" },
    "event": {
      "type": "string",
      "enum": ["attestation.verify", "portal.download", "invoice.paid"]
    },
    "amount": { "type": "number" },
    "currency": { "type": "string", "enum": ["USD"] },
    "evidence": {
      "type": "object",
      "required": ["pack_sha256", "policy_sha256"],
      "properties": {
        "pack_sha256": { "type": "string" },
        "policy_sha256": { "type": "string" }
      }
    }
  }
}
```

**ETL** `services/billing/etl.mjs`

```js
import fs from 'fs';
const usage = JSON.parse(fs.readFileSync('usage.json', 'utf8'));
const rows = usage.map((u) => ({
  ts: u.ts,
  tenant: u.tenant,
  event: u.event,
  amount: u.units * u.price,
  currency: 'USD',
  evidence: u.evidence,
}));
fs.writeFileSync(
  'revenue-report.csv',
  'ts,tenant,event,amount,currency\n' +
    rows
      .map(
        (r) =>
          `${r.ts},${r.tenant},${r.event},${r.amount.toFixed(2)},${r.currency}`,
      )
      .join('\n'),
);
```

**CI step:** attach `revenue-report.csv` to release and log SHA256 in ledger.

---

### 5.2 Audit #2 Kit

**Path:** `auditor/engagement2.plan.md`

```md
# External Audit — Engagement #2

- Tag: <frozen tag>
- Access: auditor-tenant (expires T+7)
- Packs: signoff.zip + compliance-pack.zip (sha256 listed)
- Acceptance: ≤ 2 low notes → Decisions with owners/dates
```

---

### 5.3 SLSA L3 Playbook (Rollout)

**Path:** `security/slsa-l3-playbook.md`

```md
- Runner pool labels & capacity plan
- Vendor snapshot procedure (lockfiles, offline cache)
- Hermetic job template usage
- Provenance subjects policy & verification commands
- Rollback/escape hatches
```

**Reusable job** (reference `org.release.hermetic.yml` from prior sprint), add job‑queue annotations.

---

### 5.4 SBOM Diff Allowlist Gate

**Path:** `policies/sbom_allowlist.json`

```json
{ "allowed_changes": ["dev:eslint:*", "types:*", "docs:remark:*"] }
```

**Gate** `tools/supplychain/gate.mjs`

```js
import fs from 'fs';
const diff = JSON.parse(fs.readFileSync('sbom.diff.json', 'utf8'));
const al = JSON.parse(
  fs.readFileSync('policies/sbom_allowlist.json', 'utf8'),
).allowed_changes;
const isAllowed = (k) =>
  al.some((p) => new RegExp('^' + p.replace('*', '.*') + '$').test(k));
const flagged = diff.added.concat(diff.changed).filter((k) => !isAllowed(k));
if (diff.risk_score > 55 && flagged.length) {
  console.error('risk too high', flagged);
  process.exit(1);
}
```

---

### 5.5 SLA Credits Policy & Calculator

**Path:** `policies/sla_credits.rego`

```rego
package sla

credit(percent) = p {
  input.uptime < 99.95; p := 10
} else = p {
  input.p95 > 300; p := 5
} else = 0
```

**CLI** `tools/sla/credit.mjs`

```js
import fs from 'fs';
const m = JSON.parse(fs.readFileSync('metrics/slo.json', 'utf8'));
const percent = m.uptime < 99.95 ? 10 : m.p95 > 300 ? 5 : 0;
fs.writeFileSync(
  'invoices/credit_note.json',
  JSON.stringify({ percent, reason: percent ? 'SLA breach' : 'none' }, null, 2),
);
```

---

### 5.6 Portal v2.6 — Finance & Adoption

**Finance view** `tools/trust-portal/pages/finance.tsx`

```tsx
export default function Finance({
  report,
}: {
  report: { rows: any[]; total: number };
}) {
  return (
    <div className="grid gap-4">
      <h1>Finance</h1>
      <div>
        Total (month): ${'{'}report.total.toFixed(2){'}'}
      </div>
    </div>
  );
}
```

**Adoption map** `components/SlsaMap.tsx` (renders repo→SLSA level chips).

**Risk trend** `components/RiskTrend.tsx` (line chart for `risk_score`).

---

## 6) Dashboards & Alerts

- **Revenue variance** ≤ 1%; alert if exceeded.
- **Audit #2 status** green on acceptance; notes ≤ 2.
- **SLSA L3 adoption**: 6 repos green; alert on failures.
- **Risk score** ≤ 55 on latest tag; alert when above.
- **Evidence SLOs**: p50 ≤ 7 min; uptime ≥ 99.95%.

---

## 7) Risks & Mitigations

| Risk                         | Likelihood | Impact | Mitigation                                      |
| ---------------------------- | ---------: | -----: | ----------------------------------------------- |
| Revenue reconciliation drift |        Med |   High | Golden dataset tests; manual tie‑out            |
| Hermetic capacity limits     |        Med |    Med | Queue + schedule windows; prioritize core repos |
| Allowlist over‑permissive    |        Low |    Med | Review weekly; Decision override with expiry    |
| Audit timing slippage        |        Low |    Med | Freeze tag; daily sync with auditor             |

---

## 8) Alignment Notes

- Builds on Sprint 13 (monetization GA, audit #1, SLSA pattern, portal billing).
- Preps Sprint 15 (May 18–May 29): partner cohort scale‑up, Trust Portal v3 (multi‑tenant), and Q2 mid‑cycle board update.

---

## 9) Exit Checklist

- Revenue ETL live; invoice PDFs + `revenue-report.csv` attached with hashes.
- Audit #2 accepted; notes logged; portal tracker green.
- SLSA L3 jobs live across 6 repos; provenance verified.
- SBOM allowlist gate reduces noise; risk ≤ 55 or justified.
- SLA credits calculator emits credit notes on breach; portal shows badge.
- Portal v2.6 deployed; dashboards green; demo recorded.
