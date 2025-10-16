# IntelGraph Maestro Conductor (MC) — Frontend Sprint 21 (Enterprise Integrations v0)

**Window:** Feb 2 – Feb 13, 2026 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** Post‑GA **Enterprise Integrations v0**: ship an **IdP Gallery & SSO config UI**, **SCIM Provisioning Console**, **Third‑Party Ticket Links** (Jira/ServiceNow) from Runs/Incidents, **Webhook Templates & Test‑Send**, and safe **Extension Points v0** (Run Detail panel + Control Hub tile). Polish responsive/mobile layouts and keep SLO/cost guardrails visible.

**Non‑Goals:** Deep custom analytics; marketplace publishing; arbitrary code execution in plugins; complex workflow designers; new data connectors.

**Assumptions:** Backend exposes `/sso/idp`, `/sso/test`, `/scim/config|status|mappings|sync`, `/integrations/jira|servicenow`, `/tickets/links`, `/webhooks/templates|send-test`, `/extensions/registry|assets`, `/branding`. OPA `decide` gates writes. Persisted Query ids for GETs.

**Constraints:** Org SLOs & budgets enforced. Route JS ≤ **170 KB** core; INP ≤ **170 ms p75**; WCAG 2.2 AA across new flows. No secret values ever rendered once saved.

**Definition of Done:**

- Admins can configure SSO from an IdP Gallery (Okta/AzureAD/Google—labels/examples), verify with **Test Login**, and save metadata (ROT13‑style masked view, never show secrets).
- SCIM Provisioning Console shows status, last sync, mappings; supports **manual sync** with guardrails; emits audit.
- Users can create/link **tickets** in Jira/ServiceNow from Runs/Incidents and see status inline (RO if denied).
- **Webhook Templates** (HMAC‑signed) can be created/test‑sent with sample payload; verification status shown.
- **Extension Points v0** allow safe panel/tile injection via registry (manifest + hosted asset); sandboxed (iframe + CSP) and OPA‑gated.
- Responsive/mobile polish applied to Control Hub, Runs/Run Detail, SLO, Incidents.

**Top Risks & Mitigations:**

- **SSO misconfig** → Test flow + lint checks + copy‑paste helpers + explicit redirect URI list.
- **Secrets exposure** → one‑way save; masked; rotate only; never render secret values; client can only test/replace.
- **Plugin safety** → sandboxed iframe + CSP allowlist; postMessage API; permissions surfaced.

---

## Scope (MoSCoW)

**Must**

1. **IdP Gallery & SSO Config UI** with Test Login and redirect URI helpers.
2. **SCIM Provisioning Console** with status/mappings and manual sync (guarded).
3. **Third‑Party Ticket Links**: Jira/ServiceNow create/link from Run/Incident.
4. **Webhook Templates + Test‑Send** with HMAC signing & verify indicator.
5. **Extension Points v0**: Run Detail side‑panel + Control Hub tile (sandboxed).
6. **Responsive/Mobile polish** for core routes.

**Should** 7) **Branding kit** (logo, primary/neutral token set) per tenant. 8) **Alert Routing UI** (escalations/schedules) integrated with Notifications Center.

**Could** 9) **Quick Actions customization** (show/hide/reorder) per user. 10) **Ticket auto‑link suggestions** from run metadata (RO hints only).

---

## Backlog & RACI

**Capacity:** ~22–24 SP. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM. R=Responsible, A=Accountable, C=Consulted, I=Informed.

| ID      | Story (Epic)                                    | MoSCoW | Est | R/A               | C/I         | Deps    |
| ------- | ----------------------------------------------- | -----: | --: | ----------------- | ----------- | ------- |
| FE‑1001 | **IdP Gallery (RO)** + create/edit SSO config   |   Must |   3 | FE‑Lead / FE‑Lead | SRE,PM / QA | —       |
| FE‑1002 | **Test Login** flow + lint checks               |   Must |   2 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑1001 |
| FE‑1003 | **SCIM Console (status/mappings)**              |   Must |   3 | FE‑Eng / FE‑Lead  | PM,SRE / QA | —       |
| FE‑1004 | **SCIM Manual Sync** (guarded) + audit          |   Must |   2 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑1003 |
| FE‑1005 | **Ticket Links: Jira** (create/link/view)       |   Must |   3 | FE‑Eng / FE‑Lead  | PM / QA     | —       |
| FE‑1006 | **Ticket Links: ServiceNow** (create/link/view) |   Must |   3 | FE‑Lead / FE‑Lead | PM / QA     | FE‑1005 |
| FE‑1007 | **Webhook Templates + Test‑Send** (HMAC)        |   Must |   3 | FE‑Eng / FE‑Lead  | SRE / QA    | —       |
| FE‑1008 | **Extension Points v0** (panel + tile)          |   Must |   3 | FE‑Lead / FE‑Lead | SRE / QA    | —       |
| FE‑1009 | **Responsive/Mobile polish**                    |   Must |   1 | FE‑Eng / FE‑Lead  | QA / PM     | —       |
| FE‑1010 | **Branding kit** (tenant)                       | Should |   2 | FE‑Eng / FE‑Lead  | PM / QA     | —       |
| FE‑1011 | **Alert Routing UI** (escalations)              | Should |   2 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑406  |
| FE‑1012 | **Quick Actions customize**                     |  Could |   1 | FE‑Eng / FE‑Lead  | PM / QA     | —       |

**Planned:** 24 SP (Must=20, Should=4, Could=1; target Must + at least one Should).

---

## Acceptance Criteria (selected)

**FE‑1001/1002 IdP Gallery & Test Login**

- `GET /api/maestro/v1/sso/idp` lists configs (id, type, status, lastTest, createdBy); create/edit uses forms with copyable redirect URIs.
- Secrets (client secret, cert private key) are **write‑only**; UI shows masked placeholders; rotation supported.
- Test Login calls `POST /api/maestro/v1/sso/test` and shows AMR and issuer; preserves returnTo; audit `sso.tested`.

**FE‑1003/1004 SCIM Console**

- `GET /api/maestro/v1/scim/status` and `/scim/mappings` rendered; mapping editor (RO if denied) shows attribute map with examples.
- Manual Sync `POST /api/maestro/v1/scim/sync` requires confirmation text and date/window limits; shows progress + result; audit `scim.sync.started|finished`.

**FE‑1005/1006 Ticket Links**

- From Run/Incident, user can **Create Ticket** (summary, description, priority) or **Link Existing** (key/id); RO status shown (open/in progress/resolved).
- API: `/integrations/jira/*`, `/integrations/servicenow/*`, and `POST /api/maestro/v1/tickets/links`.
- Denied actions show OPA reason; links visible to all with RO access.

**FE‑1007 Webhook Templates**

- CRUD `/api/maestro/v1/webhooks/templates`; payload preview shows example JSON; **Test‑Send** posts to user‑supplied URL with `X‑IG‑Sig` HMAC; UI verifies echo response.
- Secrets write‑only; verification badge (verified/unverified/failed) displayed; audit `webhook.template.updated|tested`.

**FE‑1008 Extension Points v0**

- Registry `GET /api/maestro/v1/extensions/registry` returns list with manifest (name, slots, permissions, asset url).
- Slots: `run-detail.panel`, `control-hub.tile`. Assets loaded in **sandboxed iframe** with strict CSP and postMessage API; timeouts and error toasts on failure.
- Admin can enable per tenant; RO to others; audit `extension.enabled|disabled`.

**FE‑1009 Responsive/Mobile**

- Control Hub, Runs/Run Detail, SLO, Incidents pass Lighthouse mobile layout tests; tab bars collapse; tables listify; INP ≤ 170 ms p75 maintained.

**FE‑1010 Branding kit**

- Upload logo + set color tokens (primary/neutral); preview in header & Control Hub tiles; AA contrast enforced; can reset to defaults.

**FE‑1011 Alert Routing**

- Escalation policies list; schedules (quiet hours) UI; test notification; OPA‑gated writes; integrates with existing Notifications Center.

---

## Design & ADRs

- **ADR‑056 IdP Config & Secrets:** Secrets are write‑only; rotation path; stored server‑side; UI never displays secret values.
- **ADR‑057 SCIM Admin UX:** Status + mappings + guarded manual sync; dry‑run where available; audit hooks.
- **ADR‑058 Ticket Links Model:** Generic `TicketLink { provider, key, url, status }` attached to Run/Incident; provider adapters.
- **ADR‑059 Extension Sandbox:** iframe + CSP allowlist; postMessage contract; permissions surfaced; timeout & error handling; no DOM escape.
- **ADR‑060 Webhook Security:** HMAC signing, timestamp, replay guard docs; verification flow and badges.
- **ADR‑061 Responsive Patterns:** Breakpoints, virtualized lists on mobile, bottom sheet drawers; motion‑reduction respected.

---

## API Contracts (consumed)

- `GET/POST/PATCH /api/maestro/v1/sso/idp → IdpConfig|IdpConfig[]`
- `POST /api/maestro/v1/sso/test → { amr: string[], issuer: string }`
- `GET /api/maestro/v1/scim/status → ScimStatus`, `GET /api/maestro/v1/scim/mappings → Mapping[]`, `POST /api/maestro/v1/scim/sync → SyncJob`
- `POST /api/maestro/v1/tickets/links`, `GET /api/maestro/v1/tickets/links?runId|incidentId → TicketLink[]`
- `GET/POST/PATCH/DELETE /api/maestro/v1/webhooks/templates → WebhookTemplate|WebhookTemplate[]`
- `POST /api/maestro/v1/webhooks/test → { verified: boolean, details }`
- `GET /api/maestro/v1/extensions/registry → Extension[]`
- `POST /api/maestro/v1/extensions/:id/enable|disable → { ok }`
- `GET/POST /api/maestro/v1/branding → Branding`

Headers: `Authorization`, `x-tenant-id`, `traceparent`, `x-trace-id`; PQ ids for GETs; secrets only in POST/PATCH (write‑only).

---

## Observability & SLOs (frontend)

- Spans: SSO load/test/save, SCIM mappings load/sync, ticket link create, webhook test, extension load, branding apply.
- Metrics: SSO test success rate, SCIM sync durations, ticket link counts, webhook verify rate, plugin load failures, mobile INP distributions.
- Alerts: admin route client errors > 1%/5m; plugin load failure spike; webhook test failures spike.

---

## Testing, CI/CD & Budgets

- **Unit:** idp form validators, mapping viewer, webhook HMAC adapter, extension postMessage bridge.
- **Integration:** SSO test → success/failure; SCIM sync guarded; Jira/ServiceNow adapters; webhook test verify; plugin sandbox timeout.
- **E2E (Playwright):** configure IdP → test login; view SCIM status + manual sync; create Jira ticket from a Run; create webhook template + test‑send; enable an extension panel; mobile viewport checks.
- **A11y:** axe on admin/integrations; forms, dialogs, tables; focus management.
- **Perf:** Lighthouse budgets; INP sampling; bundlesize gates for new routes.
- **Contracts:** PQ id checks; fixtures for SSO/SCIM/integrations/webhooks/extensions.

Pipelines gate on: lint, types, unit, integration, e2e smoke, a11y, bundlesize, Lighthouse, contracts.

---

## Rollout & Backout

- Flags: `FEATURE_SSO_UI`, `FEATURE_SCIM_CONSOLE`, `FEATURE_TICKET_LINKS`, `FEATURE_WEBHOOK_TEMPLATES`, `FEATURE_EXTENSIONS_V0`, `FEATURE_BRANDING`, `FEATURE_ALERT_ROUTING`.
- Canary 10% tenants; monitor test login success, SCIM sync errors, ticket linking usage, webhook verify rate, extension failures.
- Backout: disable writes; keep RO status pages; hide extension slots; keep existing linked tickets read‑only.

---

## Demo Script (Sprint Review)

1. Configure an IdP from Gallery; run **Test Login**; show AMR and audit trail.
2. Open SCIM Console; inspect mappings; run a guarded **Manual Sync**; show results and audit.
3. From a Run, **Create Jira ticket** and show linked status; then link an existing ServiceNow incident.
4. Create a **Webhook Template**, test‑send with HMAC signature; show verify badge.
5. Enable an **Extension Panel** on Run Detail; show sandbox & postMessage interaction.
6. Quick pass on responsive/mobile UI improvements and Branding kit tokens.

---

## Definition of Done (DoD)

- Must + at least one Should shipped; CI gates green; SLOs/budgets surfaced; flags & docs updated.
- Release notes `v1.1.0` prepared; sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
