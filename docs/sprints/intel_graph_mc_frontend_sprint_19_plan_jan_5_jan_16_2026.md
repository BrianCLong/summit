# IntelGraph Maestro Conductor (MC) — Frontend Sprint 19

**Window:** Jan 5 – Jan 16, 2026 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** **Release Candidate hardening** for MC: security & compliance surfacing (step‑up auth prompts, AMR awareness, CSP/Trusted‑Types adoption), **Evidence Signing UI v0** (backend‑driven), **A11y & i18n baseline completion (WCAG 2.2 AA)**, **Performance sweep** (bundle trims, INP polish), and **Onboarding & Feedback** flows. No net new heavy features—stabilize for GA track.

**Non‑Goals:** New connectors; deep pipeline editor features; prod region failover control; complex workflow engines. Backend signing keys/trust store mgmt live outside FE scope (RO views only).

**Assumptions:** Sprints 12–18 shipped. Gateway exposes `/security/session`, `/security/stepup`, `/evidence/:runId/sign` (server‑side signing), `/trust/store` (RO), `/feedback`, `/i18n/messages`, `/telemetry/sourcemaps` upload token. OPA `decide` provides `requires_step_up` and capabilities.

**Constraints:** Org SLOs & cost guardrails intact. Route JS initial ≤ **180 KB** (down from 200 KB) for core routes; INP ≤ **180 ms p75** on interactive views; WCAG 2.2 AA across critical flows (Auth, Control Hub, Runs, SLO, Incidents, Admin, Editor shells).

**Definition of Done:**

- Step‑up auth UX triggers when OPA or resource policy requires higher AMR; shows AMR state; preserves return path.
- CSP tightened (nonce‑based) + Trusted Types (where supported) + DOM sanitization audit complete; regressions fixed.
- Evidence **Signing UI v0** uses backend signer; verify chain against RO trust store; no private keys in client.
- i18n extraction complete; all new/changed strings externalized; LTR/RTL & reduced motion honored; a11y checks pass.
- Performance sweep reduces base bundles and improves INP on key interactions; error boundaries and sourcemap releases wired.
- First‑run Onboarding checklist + in‑product Feedback widget live.

**Top Risks & Mitigations:**

- **Step‑up loops** → one‑shot challenge with cooldown; AMR cache; diagnostics panel.
- **CSP breakage** → staged roll‑out behind flag + report‑only phase + console surface.
- **Signing UX confusion** → clear labels: _server‑signed_ vs _client‑verified_; no key handling in browser.

---

## Scope (MoSCoW)

**Must**

1. **Step‑Up Auth UX** (AMR‑aware) with returnTo and error handling.
2. **CSP/Trusted‑Types adoption** + HTML sanitization audit & fixes.
3. **Evidence Signing UI v0** (server‑sign + client verify) with chain display.
4. **A11y & i18n baseline completion** (WCAG 2.2 AA on critical paths; string extraction; plurals; RTL ready).
5. **Perf Sweep** (bundle trims, INP polish, image/route audits) + error boundaries & sourcemaps.
6. **Onboarding checklist** and **Feedback widget** (per tenant, dismissible).

**Should** 7) **Access Request Flow (RO + Create)**: request role; approver sees pending (if permitted), otherwise RO state. 8) **Saved diagnostics bundle** download for support (non‑PII env/telemetry snapshot).

**Could** 9) **Color‑blind safe palette** toggle on charts. 10) **Keyboard shortcut help** overlay enhancements (+ discoverability nudge).

---

## Backlog & RACI

**Capacity:** ~22 SP. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM. R=Responsible, A=Accountable, C=Consulted, I=Informed.

| ID     | Story (Epic)                                       | MoSCoW | Est | R/A               | C/I         | Deps          |
| ------ | -------------------------------------------------- | -----: | --: | ----------------- | ----------- | ------------- |
| FE‑801 | **Step‑Up Auth UX** (detect, prompt, returnTo)     |   Must |   3 | FE‑Lead / FE‑Lead | PM,SRE / QA | FE‑104, OPA   |
| FE‑802 | **AMR surfacing** (token AMR, session panel)       |   Must |   2 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑801        |
| FE‑803 | **CSP tighten + Trusted Types** (flagged roll‑out) |   Must |   3 | FE‑Lead / FE‑Lead | SRE / QA    | —             |
| FE‑804 | **Sanitization audit** (DOMPurify paths, markdown) |   Must |   2 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑803        |
| FE‑805 | **Evidence Signing UI v0** (server sign + verify)  |   Must |   3 | FE‑Eng / FE‑Lead  | PM,SRE / QA | FE‑204        |
| FE‑806 | **Trust Store (RO)** viewer + chain status         |   Must |   1 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑805        |
| FE‑807 | **A11y & i18n completion** (AA audit fixes)        |   Must |   3 | FE‑Lead / FE‑Lead | QA / PM     | prior sprints |
| FE‑808 | **Perf sweep & error boundaries** + sourcemaps     |   Must |   3 | FE‑Eng / FE‑Lead  | SRE / QA    | —             |
| FE‑809 | **Onboarding checklist** (first‑run)               |   Must |   1 | FE‑Eng / FE‑Lead  | PM / QA     | —             |
| FE‑810 | **Feedback widget** (POST /feedback)               |   Must |   1 | FE‑Lead / FE‑Lead | PM / QA     | —             |
| FE‑811 | **Access Request (RO + Create)**                   | Should |   2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑401        |
| FE‑812 | **Diagnostics bundle** download                    | Should |   2 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑808        |
| FE‑813 | **Color‑blind palette toggle**                     |  Could |   1 | FE‑Eng / FE‑Lead  | QA / PM     | charts        |
| FE‑814 | **Shortcut help overlay upgrades**                 |  Could |   1 | FE‑Lead / FE‑Lead | PM / QA     | FE‑509        |

**Planned:** 23 SP (Must=18, Should=4, Could=2; target Must + at least one Should).

---

## Acceptance Criteria (selected)

**FE‑801/802 Step‑Up + AMR**

- OPA `decide` can return `requires_step_up: true` or resource indicates higher AMR.
- If current session `amr` insufficient, show prompt → call `POST /api/maestro/v1/security/stepup` → upon success, reload with preserved `returnTo`.
- Session panel shows AMR list (e.g., `pwd`, `mfa`, `hwk`), last refresh, and token expiry.

**FE‑803/804 CSP & Sanitization**

- CSP set to nonce‑based script/style; `unsafe-inline/eval` removed (except for report‑only stage);
- Trusted Types enabled where supported; all HTML rendering uses sanitizer; markdown rendered via safe component.
- Rollout: `report‑only` → `enforce`; regressions captured in console UI panel.

**FE‑805/806 Evidence Signing UI v0 + Trust**

- `POST /api/maestro/v1/evidence/:runId/sign` returns signature, signer id, alg, timestamp; UI shows **Server‑Signed** badge.
- Verify step: client verifies signature against RO trust store from `GET /api/maestro/v1/trust/store` and displays chain status.
- Export `evidence-run-<id>-signed.json` including signature block; audit `evidence.signed` emitted.

**FE‑807 A11y & i18n completion**

- Axe: zero serious/critical across Auth, Control Hub, Runs/Run Detail, SLO, Incidents, Admin, Editor shells.
- All strings externalized; pluralization/select rules applied; RTL ready; reduced motion & high contrast respected.

**FE‑808 Perf & Errors**

- Route bundles reduced to ≤ 180 KB on core routes; INP ≤ 180 ms p75 on interactions defined in prior sprints.
- Global error boundaries catch render & async errors; user‑visible error toasts; sourcemaps release uploaded (token‑based) with build id.

**FE‑809/810 Onboarding & Feedback**

- First‑run checklist shows 5–7 tasks (connect source, run pipeline, view SLOs, export evidence, set alerts); dismissible per tenant.
- Feedback widget posts `{message, page, traceId, tenantId}` to `/feedback`; shows success/failure with retry.

**FE‑811 Access Request**

- Non‑privileged user can request a role via `POST /api/maestro/v1/access/requests`; RO list visible; approver UI gated by OPA (may be hidden if backend not ready).

**FE‑812 Diagnostics Bundle**

- Download JSON `{appVersion, flags, vitalsSummary, lastErrors (hashes), browser, locale}`; no PII; size ≤ 200 KB.

---

## Design & ADRs

- **ADR‑044 Step‑Up Auth:** AMR‑aware flows; preserve returnTo; cooldown; telemetry for prompts and outcomes.
- **ADR‑045 CSP/Trusted Types:** Nonce strategy; Trusted Types policy register; legacy shims; staged enforcement.
- **ADR‑046 Evidence Signing UX:** Server‑only private keys; client verify; clear labeling; RO trust store viewer.
- **ADR‑047 A11y/i18n Baseline:** Central message catalog; lint for untranslated strings; RTL support; motion/contrast tokens.
- **ADR‑048 Perf & Errors:** Route budgets; lazy imports; error boundaries; sourcemap upload gated in CI.
- **ADR‑049 Onboarding & Feedback:** Tenant‑scoped checklist; feedback endpoint DTO; link traceId.

---

## API Contracts (consumed)

- `GET /api/maestro/v1/security/session → { amr: string[], exp: number }`
- `POST /api/maestro/v1/security/stepup → { amr: string[], exp: number }`
- `POST /api/maestro/v1/evidence/:runId/sign → SignatureBlock`
- `GET /api/maestro/v1/trust/store → { certs: TrustItem[], crl?: string }`
- `POST /api/maestro/v1/feedback → { id }`
- `GET /api/maestro/v1/i18n/messages?locale → MessageBundle`
- `POST /api/maestro/v1/telemetry/sourcemaps/init → { uploadUrl, token }`
- `POST /api/maestro/v1/access/requests → AccessRequest`

Headers: `Authorization`, `x-tenant-id`, `traceparent`, `x-trace-id`; PQ ids for GETs; `opa-decision-id` echoed for audits.

---

## Observability & SLOs (frontend)

- Spans: step‑up prompt, evidence sign/verify, sourcemap init, feedback submit, diagnostics export.
- Metrics: prompt success rate, AMR upgrade rate, CSP violations count, bundle size deltas, INP distributions.
- Alerts: client error > 1%/5m on auth/critical routes; INP > 180 ms p75 sustained; CSP violations spike.

---

## Testing, CI/CD & Budgets

- **Unit:** AMR detector, sanitizer wrappers, signature verify adapter, message catalog loader.
- **Integration:** step‑up flow success/failure; CSP report‑only → enforce; trust chain statuses; feedback retries.
- **E2E (Playwright):** trigger step‑up; sign evidence; verify chain; check a11y on critical flows; onboarding checklist; submit feedback.
- **A11y:** axe across critical routes; keyboard traps; focus states; screen‑reader labels.
- **Perf:** Lighthouse budgets; INP sampling; bundlesize route gates.
- **Contracts:** PQ id checks; mock fixtures for security/signing/feedback.

Pipelines gate on: lint, types, unit, integration, e2e smoke, a11y, bundlesize, Lighthouse, contracts.

---

## Rollout & Backout

- Flags: `FEATURE_STEP_UP_AUTH`, `FEATURE_CSP_TT`, `FEATURE_SIGNING_UI_V0`, `FEATURE_I18N_BASELINE`, `FEATURE_FEEDBACK`, `FEATURE_ONBOARDING`.
- Staged rollouts: CSP `report‑only` for 3 days in staging → enforce; signing UI limited to test tenants; monitor CSP reports & signing failures.
- Backout: disable CSP enforce (keep report‑only), hide signing UI, revert to previous bundle budgets if breakage.

---

## Demo Script (Sprint Review)

1. Attempt privileged action → step‑up prompt → return to action; show AMR panel.
2. Evidence Signing: open run, click **Sign**, show Server‑Signed badge and verify chain.
3. Toggle CSP report‑only → enforce in staging; show violation count panel and that app continues to function.
4. A11y/i18n: demonstrate keyboard nav, screen reader labels, reduced motion; switch locale to a sample pack.
5. Perf: show bundle budget diffs and INP improvement charts; error boundary catching a simulated failure.
6. Onboarding checklist and Feedback widget in action.

---

## Definition of Done (DoD)

- All Must + at least one Should shipped; gates green; SLOs met; flags documented.
- Release notes `v0.19.0`; sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
