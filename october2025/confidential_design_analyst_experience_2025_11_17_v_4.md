# Confidential Design — Analyst Experience & Design Systems Sprint (Nov 17–28, 2025) v4.0

> Mission: solidify **Brief Generator 1.1**, graduate **Runbook Composer 1.0**, ship **Collaborative Annotations**, harden **Policy Simulator 1.2** (governance + guardrails), uplift **I18N QA**, and scale perf to **100k nodes**. Thanksgiving cadence considered; keep features clean, green, and field‑ready.

---

## 0) Alignment Snapshot

- **Cadence**: 2‑week sprint **Mon Nov 17 → Fri Nov 28, 2025** (US holiday Nov 27; light ops Nov 28).
- **Upstream**: OPA “scenarios” persistence API; Provenance Ledger v2.2 (dissent tags); Offline Sync v0.3; SSO/RBAC scopes; Reporting pipeline (export service); i18n bundles seed (en, es, ar, fr).
- **Downstream**: GA Release hardening, Field Enablement guides, Compliance review.
- **Exit Criteria**: Runbook 1.0 usable for at least 3 repeatable workflows; annotations deliver async review with safe links; briefs export redacted variants; simulator governed (roles), non‑leaky; a11y zero criticals; perf budgets met at 100k nodes.

---

## 1) Gaps Addressed (from v3 retro)

1. **Report distribution**: need safe share (expiring links, watermarks) and redacted export.
2. **Collaboration**: no in‑graph comments/mentions; reviewers rely on external chat.
3. **Runbook maturity**: approvals exist but versioning & publishing not finished; need 1.0.
4. **Policy scenarios**: governance and audit trails missing; need role‑scoped visibility.
5. **Perf**: 50k → 100k scaling for brush/layout; GC spikes on bulk ops.
6. **I18N QA**: snapshot coverage and RTL visual diffs incomplete.

---

## 2) Goals & Non‑Goals

**Goals**

- G1: **Brief Generator 1.1** — redaction controls, watermarks, expiring share links.
- G2: **Runbook Composer 1.0** — versioning, publishing, rollout + rollback, signed exports.
- G3: **Collaborative Annotations v1** — comments, mentions (@), resolutions, and safe‑share deep links.
- G4: **Policy Simulator 1.2** — scenario governance (RBAC), audit log, compare to baseline.
- G5: **Perf@100k** — tri‑pane brush, layout switch, bulk ops; budgets & flamegraphs.
- G6: **I18N QA uplift** — snapshot diffs across locales + RTL; format fuzz tests.
- G7: **Theme Builder Beta 2** — presets + contrast locks; export/import presets.

**Non‑Goals**

- Full collaborative cursors; real‑time co‑editing; external policy authoring UI; machine translation.

---

## 3) Epics, Stories & Acceptance Criteria

> DoD across all: tests, MDX/docs, telemetry hooks, axe/pa11y **0 criticals**, demo coverage.

### Epic BRF‑11 — Brief Generator 1.1

- **BRF‑1 Redaction Controls**
  - _User_: Toggle redact for sensitive sections; preview placeholders.
  - _Accept_: Never leaks; policy‑aware; audit entry on export.
- **BRF‑2 Watermarks & Headers**
  - _User_: Apply classification (e.g., INTERNAL, SECRET) as diagonal watermark + header/footer.
  - _Accept_: Contrast‑safe; localized; persisted in template.
- **BRF‑3 Expiring Share Links**
  - _User_: Create expiring, signed link to a rendered brief.
  - _Accept_: TTL configurable; revoke; logs access; safe‑link banner.

### Epic RBC‑10 — Runbook Composer 1.0

- **RBC‑1 Versioning & Publishing**
  - _User_: Save versions, tag stable, publish; consumers pin to published.
  - _Accept_: Activity log; semantic version (x.y.z) auto; diff viewer.
- **RBC‑2 Rollout & Rollback**
  - _User_: Staged rollout with % toggles; one‑click rollback.
  - _Accept_: Telemetry gate; approvals enforced; audit entries.
- **RBC‑3 Signed Export**
  - _User_: Export runbook JSON with signature + checksum.
  - _Accept_: Verifiable on import; mismatch blocks with clear explainer.

### Epic ANNO‑1 — Collaborative Annotations

- **AN‑1 Comments & Mentions**
  - _User_: Add comments on nodes/edges; @mention teammates; resolve threads.
  - _Accept_: Keyboard reachable; notifications emitted; screen reader parity.
- **AN‑2 Safe Deep Links**
  - _User_: Share a deep link with scoped redaction and TTL.
  - _Accept_: Link never reveals restricted payload; policy banner; revocation works.

### Epic POL‑12 — Policy Simulator 1.2

- **PS‑1 Scenario Governance (RBAC)**
  - _User_: Roles define who can create/view/apply scenarios.
  - _Accept_: UI indicates visibility; audits (create/apply/delete) recorded.
- **PS‑2 Baseline Compare**
  - _User_: Compare scenario vs baseline and vs current; export non‑leaky diff manifest.
  - _Accept_: p95 preview <100ms; keyboard toggle `d` cycles.

### Epic PERF‑100 — Scale to 100k

- **PF‑1 Brush & Select**
  - _Accept_: p95 brush <60ms @100k; select parity <90ms; no GC thrash spikes.
- **PF‑2 Layout Switch**
  - _Accept_: p95 re‑layout <400ms @100k with presets; progress toast.
- **PF‑3 Bulk Ops**
  - _Accept_: 10k entity bulk tag/export within budget; undo works.

### Epic I18N‑QA — Localization QA

- **IQA‑1 Snapshot & Visual Diffs**
  - _Accept_: Per‑locale Percy‑like diffs; RTL mirror checks pass.
- **IQA‑2 Format Fuzz**
  - _Accept_: Randomized date/number/timezone fuzz tests; no truncation.

### Epic THEME‑B2 — Theme Builder (Beta 2)

- **TH‑1 Presets**: Dark/Light/High Contrast; export/import.
- **TH‑2 Contrast Locks**: guard unsafe combos; inline warnings.

---

## 4) Deliverables (Artifacts)

- **Components**: `RedactionPanel`, `WatermarkToggle`, `BriefShareSheet`, `RunbookVersionBar`, `RunbookDiffViewer`, `AnnotationThread`, `MentionAutocomplete`, `ScenarioGovernancePanel`, `BaselineCompareView`.
- **CLIs/Utils**: `odk sign` for runbook; `brief share --ttl=...` helper.
- **Schemas**: runbook signature envelope, brief share token, annotation model, scenario ACLs.
- **Docs**: MDX stories, copy deck (en/es/ar/fr), a11y notes, perf budget report, demo scripts.

---

## 5) Interfaces & Contracts (extracts)

- **Brief Share Token**

```json
{
  "v": "1",
  "briefId": "...",
  "ttl": "2025-12-01T00:00:00Z",
  "scope": { "redact": true },
  "sig": "base64"
}
```

- **Annotation Model**

```ts
export interface Annotation {
  id: string;
  entityId: string;
  text: string;
  author: string;
  mentions: string[];
  createdAt: number;
  resolved?: { by: string; at: number };
}
```

- **Scenario ACL**

```json
{
  "scenarioId": "...",
  "owner": "user:123",
  "roles": { "view": ["analyst"], "apply": ["lead", "admin"] },
  "audit": [{ "ts": 1699900000, "act": "create", "by": "user:123" }]
}
```

- **Runbook Signature Envelope**

```json
{ "algo": "ed25519", "checksum": "sha256:...", "signature": "..." }
```

---

## 6) Telemetry & SLOs

- **Events**: `ui.brief.share.create`, `ui.brief.export.redacted`, `ui.runbook.publish`, `ui.runbook.rollback`, `ui.annotation.create`, `ui.annotation.resolve`, `ui.policy.scenario.apply`, `ui.layout.relayout@100k`.
- **Budgets**: brush p95<60ms @100k; layout switch p95<400ms @100k; bulk ops p95<2s/10k; brief render <900ms.

---

## 7) Work Plan (Nov 17–28)

- **D1–2**: BRF redaction/watermarks; RBC versioning model; AN comments skeleton; PERF probes.
- **D3–4**: Brief share links; RBAC for scenarios; runbook diff viewer; I18N snapshots; Theme presets.
- **D5**: Rollout/rollback; safe deep links; baseline compare; bulk ops perf.
- **D6–7**: Signatures; audit trails; visual diffs RTL; contrast locks; docs.
- **D8** _(Nov 27 — Holiday)_: No planned deploys; optional docs polish.
- **D9** _(Nov 28 — Light)_: Stabilization, perf passes, demo rehearsal, release & retro.

---

## 8) Definition of Done

- Tests pass; a11y 0 criticals; perf budgets met at 100k; docs/MDX complete; demo scripts updated; audit trails present for shares, scenarios, and runbook actions; exports verified non‑leaky.

---

## 9) Copy Deck Snippets

- **Share banner**: “This is a time‑limited, redacted brief. Restricted content is intentionally withheld.”
- **Scenario governance**: “You can view this scenario. Applying it requires elevated permission.”

---

## 10) Jira Subtasks CSV (Import‑ready)

```csv
Summary,Issue Type,Parent Key,Assignee,Labels
Brief Redaction Controls — build,Sub-task,IG-3,design,ux,reporting
Brief Watermarks — build,Sub-task,IG-3,design,ux,reporting
Brief Expiring Share Links — build,Sub-task,IG-3,design,ux,reporting
Runbook Versioning & Publish — build,Sub-task,IG-3,design,ux,runbook
Runbook Rollout & Rollback — build,Sub-task,IG-3,design,ux,runbook
Runbook Signed Export — build,Sub-task,IG-3,design,ux,runbook
Annotations — comments & mentions — build,Sub-task,IG-3,design,ux,collab
Annotations — safe deep links — build,Sub-task,IG-3,design,ux,collab
Policy Simulator — scenario governance — build,Sub-task,IG-3,design,ux,policy
Policy Simulator — baseline compare — build,Sub-task,IG-3,design,ux,policy
Perf@100k — brush/select/layout,Sub-task,IG-3,design,perf
Bulk Ops perf — 10k entities,Sub-task,IG-3,design,perf
I18N QA — snapshots & RTL,Sub-task,IG-3,design,ux,i18n
Format Fuzz Testing — dates/numbers,Sub-task,IG-3,design,ux,i18n
Theme Builder Beta 2 — presets & locks,Sub-task,IG-3,design,ux,tokens
Docs & MDX — all components,Sub-task,IG-3,design,docs
Demo rehearsals — updated scripts,Sub-task,IG-3,design,demo
```

---

## 11) Risks & Mitigations

- **Share link misuse** → strong banners, TTLs, revoke, audit, watermarking.
- **Perf at 100k** → gating on budgets; progressive rendering; workers; chunking.
- **RBAC complexity** → clear roles/visibility UI; audit trail; fail‑safe denies.

---

## 12) Handoff & Review

- Storybook/MDX, API Tsdoc, copy deck (multi‑locale), perf/a11y reports, demo pack zip, retro template.

---

### Final Ship List

- [ ] Brief Generator 1.1 (redaction, watermark, safe share)
- [ ] Runbook Composer 1.0 (versioning, rollout/rollback, signed export)
- [ ] Collaborative Annotations v1 (comments, mentions, safe links)
- [ ] Policy Simulator 1.2 (governance, baseline compare)
- [ ] Perf@100k (brush, layout, bulk ops)
- [ ] I18N QA uplift (snapshots, RTL, fuzz)
- [ ] Theme Builder Beta 2 (presets, contrast locks)
