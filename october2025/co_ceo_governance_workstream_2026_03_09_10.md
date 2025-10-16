# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Mar 9–Mar 20, 2026 (Sprint 10; Q1 cadence)  
**Role:** Co‑CEO (Governance, Evidence, Compliance, Board/Buyer Enablement)  
**Theme:** **Auditor sign‑off package**, **contract readiness (DPA/DPIA)**, and a **Q1 Board Brief Evidence Pack** that turns provenance into commercial trust.

---

## 1) Sprint Goal

“Ship an **auditor‑signable pack** (clean opinion target), automate **DPA/DPIA** generation & checks, and deliver a **Q1 Board Brief** with hard evidence (hashes/links) — all green via CI gates and surfaced in the Trust Portal.”

---

## 2) Objectives & Key Results (OKRs)

1. **Auditor sign‑off package** produced & accepted with ≤ 2 low‑severity notes.  
   _Measure:_ `auditor/signoff.zip` attached to latest tag; acceptance logged as Decision.
2. **DPA/DPIA automation live** for design partners.  
   _Measure:_ Packs include `DPA.md`/`DPIA.md` populated from policy data; checks pass.
3. **Q1 Board Brief Evidence Pack** delivered.  
   _Measure:_ `board-brief-Q1-2026.pdf` and appendix artifacts in repo, hashes logged.
4. **Contract readiness**: template set + redline workflow + watermarking.  
   _Measure:_ Two partner contracts generated; watermark + redaction reports attached.
5. **Evidence SLOs**: time‑to‑pack p50 ≤ **9 min**; portal uptime ≥ **99.9%**.  
   _Measure:_ Dashboards green; alerts ≤ 1/day.

---

## 3) Deliverables (Definition of Done)

- **Auditor Sign‑off Pack**: curated subset of Compliance Pack + cross‑refs → `auditor/signoff.zip` with manifest and acceptance note.
- **DPA/DPIA Generator**: CLI + CI steps to render DPA/DPIA from policy & data inventory; embedded into packs; OPA policy checks.
- **Board Brief (Q1)**: one‑pager + appendix with provenance links & run IDs; exportable PDF; disclosure‑first.
- **Contract Tooling**: redaction/watermark hook for legal docs; redline diff → PDF; storage with hashes.
- **Portal v2.2**: Auditor tab (sign‑off pack), Contracts tab (DPA/DPIA status), Board view badges.
- **Policy bundle v1.5**: incident notification SLAs + processor/sub‑processor registry checks.

---

## 4) Work Plan & Owners

| Date   | Work Item                                 | Owner          | Exit Criteria                                      |
| ------ | ----------------------------------------- | -------------- | -------------------------------------------------- |
| Mar 9  | Scope sign‑off contents & acceptance path | Co‑CEO         | `auditor/signoff.plan.md` merged                   |
| Mar 10 | DPA/DPIA generator + OPA checks           | SecOps + DevEx | `DPA.md`/`DPIA.md` render in CI                    |
| Mar 11 | Policy v1.5 (incident SLA + processors)   | SecOps         | `opa test` green; hash pinned                      |
| Mar 12 | Contract toolkit (redact/watermark/diff)  | DevEx          | Two sample contracts processed                     |
| Mar 13 | Portal v2.2 tabs and badges               | PM             | Auditor/Contracts/Board tabs live                  |
| Mar 17 | Compile sign‑off pack & run review        | Co‑CEO         | `signoff.zip` produced; auditor review scheduled   |
| Mar 18 | Board Brief + appendix + metrics          | Co‑CEO         | PDF generated; links verified                      |
| Mar 19 | Acceptance + Decisions + retro prep       | Co‑CEO         | Acceptance note logged; findings (≤2) as Decisions |
| Mar 20 | Demo & sprint close                       | Co‑CEO         | OKRs measured; dashboards updated                  |

---

## 5) Artifacts & Scaffolding

### 5.1 Auditor Sign‑off Pack Composer

**Path:** `.github/actions/auditor-signoff/action.yml`

```yaml
name: 'Auditor Sign-off Composer'
description: 'Curate Compliance Pack subset for auditor sign-off with manifest & hashes'
runs:
  using: 'composite'
  steps:
    - shell: bash
      run: |
        mkdir -p auditor/signoff
        cp compliance-pack.zip auditor/signoff/
        cp sbom.json provenance.intoto.jsonl auditor/signoff/
        test -f controls.json && cp controls.json auditor/signoff/ || true
        test -f vendor_attestations.json && cp vendor_attestations.json auditor/signoff/ || true
        test -f sla-report.pdf && cp sla-report.pdf auditor/signoff/ || true
        # Manifest
        (cd auditor/signoff && find . -type f -print0 | sort -z | xargs -0 sha256sum) > auditor/signoff/MANIFEST.sha256
        (cd auditor && zip -qr signoff.zip signoff)
        echo "SIGNOFF_SHA=$(sha256sum auditor/signoff.zip | awk '{print $1}')" >> $GITHUB_OUTPUT
    - uses: actions/upload-artifact@v4
      with: { name: auditor-signoff, path: auditor/signoff.zip }
```

**Workflow patch:** run after `compliance` and before final `release` upload.

---

### 5.2 DPA/DPIA Generator + Checks

**Path:** `tools/privacy/generate.mjs`

```js
import fs from 'fs';
const policy = JSON.parse(fs.readFileSync('policies/data.json', 'utf8'));
const proc = JSON.parse(fs.readFileSync('privacy/processors.json', 'utf8'));
const dpa = `# Data Processing Addendum\nProcessor regions: ${policy.residency.allowed.join(', ')}\nSub-processors: ${proc.items.map((x) => x.name).join(', ')}`;
const dpia = `# DPIA\nLawful basis: ${policy.legal?.basis || 'legitimate_interest'}\nRetention (days): ${policy.retention.days}`;
fs.mkdirSync('privacy', { recursive: true });
fs.writeFileSync('privacy/DPA.md', dpa);
fs.writeFileSync('privacy/DPIA.md', dpia);
```

**OPA checks** `policies/incident_sla.rego`

```rego
package incident

ok {
  input.sla.notify_hours <= data.incident.notify_hours
}
```

**Data** `policies/incident.json`

```json
{
  "incident": { "notify_hours": 24 },
  "processors": { "required": ["hosting", "error_monitoring"] }
}
```

**CI step (excerpt):**

```yaml
privacy:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: node tools/privacy/generate.mjs
    - run: opa eval -d policies -I --input <(jq -n '{sla:{notify_hours:12}}') 'data.incident.ok'
    - uses: actions/upload-artifact@v4
      with: { name: privacy, path: privacy/ }
```

---

### 5.3 Contract Toolkit (redaction/watermark/diff)

**Path:** `tools/contracts/diff.mjs`

```js
import fs from 'fs';
const a = fs.readFileSync(process.argv[2], 'utf8');
const b = fs.readFileSync(process.argv[3], 'utf8');
const diff = require('diff').createTwoFilesPatch('old', 'new', a, b);
fs.writeFileSync('contracts/redline.diff', diff);
```

**CI hooks:**

```yaml
contracts:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: node tools/redactor/redactor.js legal/DPA.template.md legal/DPA.redacted.md
    - run: node tools/contracts/diff.mjs legal/DPA.v1.md legal/DPA.v2.md
    - uses: actions/upload-artifact@v4
      with: { name: contracts, path: contracts/ }
```

---

### 5.4 Board Brief (Q1) Generator

**Path:** `tools/board/brief.mjs`

```js
import fs from 'fs';
const metrics = JSON.parse(fs.readFileSync('metrics/summary.json', 'utf8'));
const brief = `# Board Brief — Q1 2026\n\n- North Star: ${metrics.north_star}\n- Evidence coverage: ${metrics.evidence_coverage}%\n- Uptime: ${metrics.uptime}\n- API p95: ${metrics.p95} ms\n- Design partners: ${metrics.design_partners}\n\n## Links\n- Latest tag: ${metrics.latest_tag}\n- Disclosure Portal: ${metrics.portal_url}\n- Maestro runs: ${metrics.maestro_run}\n`;
fs.writeFileSync('board-brief-Q1-2026.md', brief);
```

**CI to PDF:**

```yaml
board_brief:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: node tools/board/brief.mjs
    - run: npx md-to-pdf board-brief-Q1-2026.md
    - uses: actions/upload-artifact@v4
      with: { name: board-brief, path: board-brief-Q1-2026.pdf }
```

---

### 5.5 Portal v2.2 — Tabs & Badges (excerpt)

**Path:** `tools/trust-portal/components/Tabs.tsx`

```tsx
export function Tabs() {
  const [tab, setTab] = React.useState<'auditor' | 'contracts' | 'board'>(
    'auditor',
  );
  return (
    <div>
      <nav className="flex gap-2">
        {['auditor', 'contracts', 'board'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className="px-3 py-2 rounded-2xl shadow"
          >
            {t}
          </button>
        ))}
      </nav>
      <section className="mt-4">
        {tab === 'auditor' && <AuditorView />}
        {tab === 'contracts' && <ContractsView />}
        {tab === 'board' && <BoardView />}
      </section>
    </div>
  );
}
```

**Board badge** `components/BoardBadge.tsx`

```tsx
export function BoardBadge({ coverage }: { coverage: number }) {
  const color =
    coverage === 100
      ? 'bg-green-100'
      : coverage > 80
        ? 'bg-yellow-100'
        : 'bg-red-100';
  return (
    <span className={`px-2 py-1 rounded-2xl ${color}`}>
      Evidence {coverage}%
    </span>
  );
}
```

---

## 6) Dashboards & Alerts

- **Evidence SLOs:** time‑to‑pack p50 ≤ 9 min; alert when > 12 min.
- **Auditor sign‑off status:** green with acceptance; red with pending/open notes.
- **DPA/DPIA freshness:** warn if > 90 days old or policy hash drift.
- **Portal availability:** ≥ 99.9%; auth failures spike alert.
- **Board pack completeness:** all referenced artifacts present & verified.

---

## 7) Risks & Mitigations

| Risk                            | Likelihood | Impact | Mitigation                                                |
| ------------------------------- | ---------: | -----: | --------------------------------------------------------- |
| Auditor scope creep in sign‑off |        Med |    Med | Freeze scope; track deltas as Decisions                   |
| DPA/DPIA data accuracy          |        Med |   High | Source of truth in `policies/data.json`; review checklist |
| PDF generation variability      |        Low |    Med | Store MD + PDF; retry with fallback renderer              |
| Contract PII exposure           |        Low |   High | Redaction + watermark mandatory; DLP scan gate            |

---

## 8) Alignment Notes

- Follows Sprint 9 remediation & SLSA trajectory; feeds Q1 close with Board/Evidence pack.
- Two‑way doors: portal tabs, generator scripts, policy v1.5 rev‑pinned.

---

## 9) Exit Checklist

- `auditor/signoff.zip` attached; acceptance note logged as Decision.
- `DPA.md`/`DPIA.md` generated, checked via OPA, shipped in packs.
- `board-brief-Q1-2026.pdf` generated with verified links & hashes.
- Contracts processed (2x), redaction/watermark/diff artifacts attached.
- Dashboards green on SLOs; demo recorded; next sprint seeds drafted.
