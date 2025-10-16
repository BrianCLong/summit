# Confidential Design — Analyst Experience & Design Systems Sprint (Nov 3–14, 2025) v3.0

> Mission: ship **Reporting & Brief Generator**, **I18N/L10N foundations**, **Policy Simulator 1.1**, and **Offline Demo Kit 1.1**, while graduating tokens to **v1.0** and adding **Graph Layout Presets + Keyboard Macros**. Build on v1/v1.1 features from Oct sprints; keep everything clean, green, and demo‑ready.

---

## 0) Alignment Snapshot

- **Cadence**: 2‑week sprint **Nov 3 → Nov 14, 2025**.
- **Upstream dependencies**: Provenance Ledger v2.1 (transform descriptors), OPA reasoner delta API, Ingestion Wizard A2.2 (multi‑lingual sample), Offline Sync agent v0.2, SLO dashboards v0.4.
- **Downstream partners**: Integration Mega Sprint, GA Release Bundle, Field Enablement.
- **Exit Criteria**: 100% green a11y; one‑click **Brief Generator** creates a publishable case brief; **Policy Simulator 1.1** supports saved scenarios; **Offline Demo Kit 1.1** seeds/records/resets; tokens v1.0 adopted; perf budgets met on 50k nodes.

---

## 1) Gaps Addressed (from v2 retro)

1. **Explainability clarity**: need tighter copy constraints and caveat taxonomy; add “Why not?” negative rationale.
2. **Policy What‑If discoverability**: surface saved scenarios + quick toggles.
3. **Offline demo**: add recording & reset checkpoints; simplify presenter cues.
4. **Reporting**: no native brief template; exports too manual; need red/blue team voice options.
5. **Globalization**: string externalization + bidi readiness not started; numeric/date/timezones inconsistent.
6. **Graph interactions**: layout choice buried; repetitive analyst actions need macros.

---

## 2) Goals & Non‑Goals

**Goals**

- G1: **Reporting & Brief Generator v1** with templates (Exec, Intel, Ops) and content controls.
- G2: **Policy Simulator v1.1** with saved scenarios, quick toggles, and compare views.
- G3: **Offline Demo Kit v1.1** adding recording, reset points, and improved talk‑track.
- G4: **I18N/L10N foundations**: extraction, locale switcher, number/date/RTL support.
- G5: **Graph Layout + Macros**: presets (Force, Radial, Geo‑pinned) and user macros/shortcuts.
- G6: **Design Tokens v1.0 + Theme Builder** graduation and docs.
- G7: **Perf/A11y hardening** at or better than prior budgets.

**Non‑Goals**

- Full machine translation; deep narrative causality editor; policy authoring UI; full audit pipeline.

---

## 3) Epics, Stories & Acceptance Criteria

> DoD for every story: unit/integration tests, MDX docs, telemetry hooks, zero critical a11y, demo inclusion.

### Epic RPT — Reporting & Brief Generator

- **RPT‑1 Template System**
  - _User_: Choose template (Exec 1‑pager, Intel 3‑pager, Ops Runbook) and export PDF/Markdown.
  - _Accept_: Render <800ms; sections: Summary, Findings, Evidence, Policy Caveats; optional red/blue voices; track sources.
- **RPT‑2 Content Controls**
  - _User_: Toggle sections; include/exclude sensitive evidence via policy guards.
  - _Accept_: Never leaks restricted payloads; simulator integration shows placeholders.
- **RPT‑3 Auto‑Compose**
  - _User_: Generate draft text from evidence roll‑ups + rationale + analyst notes.
  - _Accept_: 3‑level confidence bands; editable; change log maintained.

### Epic POLSIM‑11 — Policy Simulator 1.1

- **PS‑1 Saved Scenarios**
  - _User_: Save named what‑if sets (e.g., "NATO+OFAC exemptions").
  - _Accept_: Persist per case; shareable; appears in palette recents.
- **PS‑2 Compare View**
  - _User_: Side‑by‑side diff of current vs scenario; counts + non‑leaky examples.
  - _Accept_: Toggle via `d`; p95 preview <100ms; export manifest.

### Epic ODK‑11 — Offline Demo Kit 1.1

- **ODK‑1 Recording & Reset Points**
  - _User_: `odk record` to capture UI path; `odk checkpoint`/`odk rollback`.
  - _Accept_: Deterministic; stores minimal state; works air‑gapped.
- **ODK‑2 Presenter Console**
  - _User_: Side overlay with slide cues, timers, hotkeys.
  - _Accept_: No PII; configurable speed; dark/light themes.

### Epic GLOB — I18N/L10N Foundations

- **GLOB‑1 String Externalization**
  - _User_: All UI strings in locale bundles; runtime switcher.
  - _Accept_: Coverage ≥95%; fallbacks logged; no hard‑coded copy.
- **GLOB‑2 Formats & RTL**
  - _User_: Correct dates/numbers/timezones; RTL mirrored layouts where applicable.
  - _Accept_: Snapshot tests; bidi marks handled in search/palette.

### Epic GLM — Graph Layout & Macros

- **GLM‑1 Layout Presets**
  - _User_: Switch presets (Force/Radial/Geo‑pinned/Hierarchical); remember per case.
  - _Accept_: p95 re‑layout <300ms @50k; legend & hints update.
- **GLM‑2 Keyboard Macros**
  - _User_: Record macro of actions and bind hotkey; share per team.
  - _Accept_: JSON schema; safe/undoable; palette integration.

### Epic TOK‑1 — Tokens v1.0 + Theme Builder

- **TOK‑1 Token Audit & Freeze**
  - _User_: Stable tokens with lint rules; migration codemods.
  - _Accept_: Token violations fail PR; Storybook theming parity.
- **TOK‑2 Theme Builder (Beta)**
  - _User_: Adjust semantic slots; preview across key screens; export theme package.
  - _Accept_: Exports JSON + TS; contrast checks inline.

### Epic HARD — Hardening

- **HARD‑1 Perf**: brush p95<45ms; palette exec p95<70ms; re‑layout p95<300ms.
- **HARD‑2 A11y**: 0 criticals; new patterns for reports & scenarios.

---

## 4) Deliverables (Artifacts)

- **Components**: `BriefTemplatePicker`, `BriefComposer`, `SavedScenarioMenu`, `ScenarioComparePanel`, `LayoutPresetSwitcher`, `MacroRecorder`, `ThemeBuilderPane`.
- **Docs**: MDX stories, copy deck (multi‑locale), a11y notes, perf budgets, demo scripts.
- **CLIs**: `odk record|checkpoint|rollback`.
- **Schemas**: report template, macro recording, theme package.

---

## 5) Interfaces & Contracts (extracts)

- **Report Template**

```json
{
  "$schema": "https://example/report.template.schema.json",
  "id": "exec-1pager",
  "sections": ["summary", "findings", "evidence", "policy"],
  "options": { "voice": "exec|intel|ops", "includeRestricted": false }
}
```

- **Macro Recording**

```ts
export interface Macro {
  id: string;
  name: string;
  steps: Array<CommandRef>;
  scope: 'global' | 'graph' | 'timeline' | 'map';
  hotkey?: string;
}
```

- **Theme Package**

```json
{
  "tokensVersion": "1.0",
  "color": { "bg": "#0B0C0F" },
  "typescale": { "body": 14 },
  "motion": { "base": 180 }
}
```

---

## 6) Telemetry & SLOs

- **Events**: `ui.report.compose`, `ui.report.export`, `ui.policy.scenario.save`, `ui.policy.scenario.compare`, `ui.layout.switch`, `ui.macro.record`, `ui.theme.export`.
- **Budgets**: brush p95<45ms; report render <800ms; compare preview <100ms; layout switch <300ms.

---

## 7) Work Plan (Nov 3–14)

- **D1–2**: RPT‑1 template & renderer POC; PS‑1 saved scenarios storage; ODK‑1 checkpoint POC; token audit start.
- **D3–4**: RPT‑2 content controls; GLOB‑1 extraction; GLM‑1 layout presets; Theme Builder skeleton.
- **D5**: RPT‑3 auto‑compose; PS‑2 compare view; ODK‑2 presenter console; macro recorder MVP.
- **D6–7**: I18N formats/RTL; perf passes; a11y across new surfaces; docs/MDX drafts.
- **D8–9**: Stabilization; demo rehearsals; SLO dashboards wired; final copy review.
- **D10**: Stakeholder review; release; retro.

---

## 8) Definition of Done

- Tests green; Axe/Pa11y **0 criticals**; perf budgets met; docs complete; demo scripts updated; tokens v1.0 frozen and enforced.

---

## 9) Copy Deck Snippets (multi‑locale ready)

- **Brief intro**: “This brief summarizes key findings, evidence lineage, and policy considerations for decision‑makers.”
- **Scenario compare banner**: “You’re viewing a non‑leaky comparison. Restricted content is represented by placeholders.”

---

## 10) Jira Subtasks CSV (Import‑ready)

```csv
Summary,Issue Type,Parent Key,Assignee,Labels
Brief Template System — build,Sub-task,IG-2,design,ux,reporting
Brief Template System — tests,Sub-task,IG-2,qa,ux,reporting
Brief Content Controls — build,Sub-task,IG-2,design,ux,reporting
Brief Auto-Compose — build,Sub-task,IG-2,design,ux,reporting
Policy Saved Scenarios — build,Sub-task,IG-2,design,ux,policy
Policy Compare View — build,Sub-task,IG-2,design,ux,policy
ODK Recording — build,Sub-task,IG-2,design,demo
ODK Checkpoint/Reset — build,Sub-task,IG-2,design,demo
Presenter Console — build,Sub-task,IG-2,design,demo
I18N String Extraction — build,Sub-task,IG-2,design,ux,i18n
Formats & RTL — build,Sub-task,IG-2,design,ux,i18n
Layout Presets — build,Sub-task,IG-2,design,ux,graph
Keyboard Macros — build,Sub-task,IG-2,design,ux,productivity
Tokens v1.0 Audit & Freeze,Sub-task,IG-2,design,ux,tokens
Theme Builder (beta),Sub-task,IG-2,design,ux,tokens
Perf hardening — layouts/brush,Sub-task,IG-2,design,perf
A11y — reports/scenarios,Sub-task,IG-2,design,ux,a11y
Docs & MDX — all components,Sub-task,IG-2,design,docs
Demo rehearsals — updated scripts,Sub-task,IG-2,design,demo
```

---

## 11) GitHub Projects (v2) Snippet

```bash
gh project item-edit "Analyst Experience — Oct 2025" --id <id> --field Area --value RPT
# Add remaining items and set Area: RPT,POL-SIM,ODK,GLOB,GLM,TOK,HARD
```

---

## 12) Design Tokens v1.0 (finalized)

```json
{
  "spacing": { "xs": 4, "sm": 8, "md": 12, "lg": 16, "xl": 24 },
  "radius": { "sm": 4, "md": 8, "lg": 12 },
  "elevation": {
    "0": "none",
    "1": "0 1px 2px rgba(0,0,0,.08)",
    "2": "0 4px 12px rgba(0,0,0,.10)",
    "3": "0 12px 28px rgba(0,0,0,.12)"
  },
  "typescale": { "ui": 12, "body": 14, "h3": 20, "h2": 28, "mono": 13 },
  "motion": { "fast": 120, "base": 180, "slow": 240 },
  "opacity": { "muted": 0.72, "disabled": 0.44 },
  "color": {
    "bg": "#0B0C0F",
    "surface": "#14161A",
    "border": "#2B2F36",
    "text": "#E6E8EE",
    "muted": "#A6ADBB",
    "emphasis": "#F2F4F8",
    "success": "#2BB673",
    "warning": "#F5A623",
    "danger": "#E55353"
  }
}
```

---

## 13) Risks & Mitigations

- **Report complexity** → start with 3 templates; content controls guard leakage; strong copy review.
- **I18N regressions** → snapshot tests; bidi review; locale lint in CI.
- **Perf** → budget gates + flamegraph day; rollback plan.

---

## 14) Handoff & Review

- Storybook links/screens; API Tsdoc; copy deck (en + seeds for es, ar); perf/a11y reports; demo pack zip; retro template.

---

### Final Ship List

- [ ] Reporting & Brief Generator v1
- [ ] Policy Simulator 1.1 (saved scenarios + compare)
- [ ] Offline Demo Kit 1.1 (recording + checkpoints)
- [ ] I18N/L10N foundations (strings, formats, RTL)
- [ ] Graph Layout Presets + Keyboard Macros
- [ ] Tokens v1.0 + Theme Builder (beta)
- [ ] Perf/A11y hardening
