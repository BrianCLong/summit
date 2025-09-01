# IntelGraph — UI Architecture & Component Outline (v1)

> Scope: exhaustive outline of pages, components, functions, features, interaction patterns, and design system specs for the near‑term GA slice (Provenance/Export MVP + NL→Cypher Preview + SLO dashboards), with forward hooks for future capabilities.

---
## 0) Product Pillars & Roles
- **Pillars:**
  1) Truth & Lineage (Provenance/Claim Ledger)  
  2) Explainable Graph Insight (NL→Cypher preview, safe sandbox)  
  3) Operability (SLOs, audit, license guardrails)
- **Primary roles:** Viewer, Analyst, Case Owner, Data Steward, Admin/SRE, Ombudsman.
- **Permission model (RBAC):** Page/feature gates and inline controls reflect role; feature flags can further restrict.

---
## 1) Application Shell & Navigation
- **Global Layout:**
  - Left **Sidebar** (collapsible) with primary nav: Home, Cases, Graph Explorer, Sources, Exports, Policy, Observability, Admin, Help.
  - **Top Bar:** global search, breadcrumbs, environment badge (Dev/Stage/Prod), notifications, profile menu.
  - **Command Palette** (⌘K / Ctrl+K): quick jump to entities, cases, actions.
  - **Feature Flag Toggle** indicator (dev only).
- **Responsive:** 2‑column + drawer on mobile; persistent shell on desktop.
- **Routes (examples):**
  - `/` dashboard  
  - `/cases`, `/cases/:id`  
  - `/graph`  
  - `/sources`, `/sources/:id`  
  - `/exports`  
  - `/policy`  
  - `/observability`  
  - `/admin`  
  - `/help`

---
## 2) Pages (Goals → Components → Key Interactions → Routes → Permissions)

### 2.1 Auth & Session
- **Goals:** Secure entry (OIDC/SSO), MFA, consent/ethics acknowledgement.
- **Components:** AuthCard, ProviderButtons, MFAForm, SessionTimeoutModal.
- **Interactions:** Login → MFA → Environment select (if applicable); session expiry → resume; legal consent banner.
- **Routes:** `/signin`, `/mfa`, `/consent`.
- **Permissions:** Public.

### 2.2 Home / Dashboard
- **Goals:** Launchpad for work; show recents, assigned cases, alerts, system health.
- **Components:** KPIStat, CardGrid, RecentList, AlertTicker, QuickActions, ConnectorHealth.
- **Interactions:** Pin widgets; filter time ranges; click‑through to detail.
- **Routes:** `/`.
- **Permissions:** Viewer+.

### 2.3 Cases
- **List**
  - **Goals:** Browse, filter, sort cases; ownership/permissions at a glance.
  - **Components:** DataTable (virtualized), FacetFilters, SavedViews, BulkActions, TagChips.
  - **Interactions:** Multi‑select; column chooser; saved filters.
  - **Route:** `/cases`.
  - **Permissions:** Viewer+.
- **Detail**
  - **Goals:** Manage a single case: timeline, exhibits, graph view, notes, export.
  - **Components:** CaseHeader (title, status, owners), Timeline, ExhibitList, NotePad, PeopleOrgPanels, LicenseStatus, ExportButton, AuditTrailPanel.
  - **Interactions:** Add exhibit; link entities; start export; review license blockers; view audit events.
  - **Route:** `/cases/:id`.
  - **Permissions:** Analyst+ (Viewer read‑only).

### 2.4 Graph Explorer
- **Goals:** Visual exploration of nodes/edges; safe querying; explain preview.
- **Components:**
  - **GraphCanvas** (rendering library TBD: Cytoscape/Sigma/D3 wrapper), MiniMap, ZoomControls, LayoutPicker.
  - **Inspector** (NodeInspector, EdgeInspector) with property grids and linked exhibits.
  - **QueryPanel** with **NLPromptBar** and **CypherPreviewPanel** (code view, copy, cost/row badges, plan viewer).
  - **ResultTable** (virtualized), SavedViewManager, SelectionSummary.
- **Interactions:** Type NL → preview Cypher → cost shown → run in **Sandbox** → results pane; lasso select → bulk pin; save workspace view; annotate selection.
- **Routes:** `/graph` (+ optional params for saved view).
- **Permissions:** Analyst+; sandbox execution always read‑only.

### 2.5 Sources (Ingest & Connectors)
- **Goals:** Catalog connectors, inspect status, run health checks.
- **Components:** ConnectorList, ConnectorCard, HealthBadge, SchedulerPanel, SchemaMappingTable, LicensePane.
- **Interactions:** Pause/resume; test connection; view license metadata per source.
- **Routes:** `/sources`, `/sources/:id`.
- **Permissions:** Steward+, Admin.

### 2.6 Provenance & Ledger
- **Goals:** Show transform chains; evidence lineage; hash tree preview.
- **Components:** ManifestViewer (read‑only), TransformChainTimeline, EvidenceCard, HashTreeView.
- **Interactions:** Inspect transforms; copy manifest JSON; compare two manifests.
- **Routes:** `/cases/:id/provenance` (tab) or `/provenance/:manifestId`.
- **Permissions:** Analyst+.

### 2.7 Disclosure Export
- **Goals:** Package a shareable bundle; include manifest; enforce policy.
- **Components:** ExportWizard (Stepper), ScopePicker, OptionsForm (include/exclude), LicenseGateBanner, ProgressDialog, SuccessState with VerifyTips, FailureState with reasons.
- **Interactions:** Start export → preflight license check → generate → stream progress → download; if blocked, banner shows **clause/owner/appeal path**.
- **Routes:** Modal from case or `/exports` history page.
- **Permissions:** Case Owner+, Steward override flow.

### 2.8 Policy Center
- **Goals:** Manage licenses, policies, overrides; audit access.
- **Components:** PolicyTable, LicenseRuleEditor, OverrideQueue, AccessLog, ReasonForAccessDialog.
- **Interactions:** Add/edit policy; review override requests; export audit.
- **Routes:** `/policy`.
- **Permissions:** Steward+, Ombudsman read.

### 2.9 Observability
- **Goals:** Track SLOs, latency heatmaps, connector health.
- **Components:** SLOPanel (p50/p95), HeatmapChart, TimeRangePicker, AlertRuleTable, ConnectorStatusBoard.
- **Interactions:** Drill‑down by query type; simulate alert; link to runbooks.
- **Routes:** `/observability`.
- **Permissions:** Admin/SRE (Viewer read limited).

### 2.10 Admin & Settings
- **Goals:** Users/roles, feature flags, environments, API keys.
- **Components:** UserTable, RoleMatrix, FeatureFlagList, EnvSwitcher, APIKeyManager.
- **Interactions:** Invite user; assign roles; toggle flags; rotate keys.
- **Routes:** `/admin`.
- **Permissions:** Admin.

### 2.11 Help, Ethics & Ombudsman
- **Goals:** Publish policy; handle concerns; right‑to‑reply guidance.
- **Components:** HelpIndex, PolicyDocs, OmbudsmanForm, TriageQueue.
- **Routes:** `/help`.
- **Permissions:** Viewer+ (form submission gated by SSO).

### 2.12 Playground (Test Harness)
- **Goals:** Curate 100‑prompt set, measure NL→Cypher validity.
- **Components:** PromptList, PromptEditor, BatchRunPanel, MetricsCard (validity %, syntax errors), DiffViewer.
- **Routes:** `/playground`.
- **Permissions:** Analyst+, Feature‑flagged.

---
## 3) Component Inventory (React + Tailwind + shadcn/ui)

### 3.1 Atoms
- **Button** (`variant: primary/secondary/ghost/destructive`, `size: sm/md/lg`, `iconLeft`, `iconRight`)
- **Input**, **Textarea**, **Select**, **Checkbox**, **RadioGroup**, **Toggle**
- **Badge** (status: success/warn/error/info), **Tag/Chip** (removable)
- **Tooltip**, **Popover**, **DropdownMenu**
- **Avatar**, **Progress**, **Skeleton**, **Spinner**, **Divider**
- **CodeBlock** (copy, wrap, line numbers), **Kbd** (shortcut tag)

### 3.2 Molecules
- **SearchBar** (debounced, scoped), **FacetFilters** (chips + drawer)
- **TableHeader** (column chooser, density, sort), **Pagination**
- **ConfirmModal**, **SlideOver** (right panel), **Stepper**
- **PropertyList** (key/value grid), **KeyValueRow**
- **NLPromptBar** (text + examples + submit), **CostBadge**
- **AlertBanner** (inline + page), **EmptyStateCard**
- **Breadcrumbs**, **Tabs**, **Accordion**, **TimeRangePicker**

### 3.3 Organisms
- **GraphCanvas** (wrapper over graph lib) with **MiniMap**, **LayoutPicker**, **SelectionSummary**
- **NodeInspector / EdgeInspector** (detail side panel)
- **CypherPreviewPanel** (code, plan, cost; Run in Sandbox button)
- **ResultTable** (virtualized, export CSV disabled in sandbox)
- **ExportWizard** (ScopePicker → Options → Review → Generate)
- **ManifestViewer** (hash tree, transforms, sources)
- **SLOPanel** (recharts area/line; p95 indicator; heatmap)
- **ConnectorStatusBoard** (cards grid)
- **LicenseRuleEditor** (YAML/JSON text + lint)
- **RoleMatrix** (users × roles grid)

### 3.4 Layout Templates
- **TwoPane** (content + inspector), **Console** (tabs + logs), **Wizard** (stepper top), **Dashboard** (cards grid), **Detail** (header + tabs + body).

---
## 4) Key Component Signatures (TypeScript)
```ts
// NL Prompt → Cypher Preview
export type CypherPreview = {
  cypher: string;
  estimatedRows?: number;
  estimatedCost?: number; // abstract units
  plan?: unknown; // serialized plan tree
  warnings?: string[];
};

export function NLPromptBar({
  examples?: string[];
  onGenerate: (nl: string) => Promise<CypherPreview>;
  disabled?: boolean;
}) {}

export function CypherPreviewPanel({
  preview?: CypherPreview;
  onRunSandbox: (cypher: string) => Promise<SandboxResult>;
}) {}

export function ExportWizard({
  caseId: string;
  onStart: (opts: ExportOptions) => Promise<ExportJob>;
}) {}

export function ManifestViewer({ manifest: Manifest }): JSX.Element {}

export function SLOPanel({
  series: Array<{ ts: number; p50: number; p95: number }>;
  onRangeChange?: (from: Date, to: Date) => void;
}) {}
```

---
## 5) Hooks, Services & Utilities
- **Hooks**
  - `useAuth()`, `useRBAC()`, `useFeatureFlag()`
  - `useCase(id)`, `useExport(caseId)`, `useProvenance(manifestId)`
  - `useNL2Cypher()` (calls `/copilot/nl2cypher`), `useSandboxRunner()` (read‑replica)
  - `useLicenseCheck(scope)` (preflight export), `useAudit()`
  - `useSLOMetrics(queryType, range)`, `useConnectorHealth()`
  - `useDebounce(value, delay)`, `useClipboard(text)`, `usePagination()`
- **Client Services (API)**
  - GraphQL/REST thin client: `exportCase`, `generateCypherPreview`, `runSandbox`, `listCases`, `getCase`, `listPolicies`, `checkLicense`, `getSLO`, `listAuditEvents`, `listConnectors`.
- **Utilities**
  - `formatBytes`, `formatDuration`, `truncateMiddle`, `safeJson`, `downloadStream`.

---
## 6) Feature Flags (examples)
- `ff.nl2cypher.preview` (default ON in Stage)  
- `ff.export.manifest` (ON for Case Owner+)  
- `ff.playground.harness` (OFF by default)  
- `ff.policy.overrides` (Steward gated)

---
## 7) Design System
- **Tech stack:** React + Tailwind; shadcn/ui components; lucide-react icons; recharts for charts; Framer Motion for micro‑interactions.
- **Tokens (example scale):**
  - **Spacing:** 2, 4, 8, 12, 16, 24, 32, 48
  - **Radius:** md, lg, **2xl** (default for cards/buttons)
  - **Elevation:** `shadow-sm`, `shadow`, `shadow-lg` (soft)
  - **Typography:**
    - Display: 28/36 semi‑bold  
    - H1: 24/32 semi‑bold  
    - H2: 20/28 medium  
    - Body: 14–16/20–24 regular  
    - Mono for code: 13/18
  - **Color (theming):** neutral‑700 text; brand‑600 primary; semantic green/amber/red/blue; dark mode supported.
- **Layout:** grid‑based, 8‑pt; comfortable density with compact toggle.
- **Motion:** 150–250ms ease for fades/slide‑overs; reduced‑motion respects OS.
- **Iconography:** lucide set; 16/20/24px sizes.

---
## 8) Patterns & States
- **Form pattern:** inline validation; helper text; error summary top.
- **Table pattern:** column chooser, sticky header, virtualized rows, empty state with CTA.
- **Graph interactions:** hover → highlight neighbors; click → inspector opens; marquee select; keyboard pan/zoom shortcuts; reset layout.
- **Code preview:** copy button; wrap toggle; monospace; line numbers.
- **Export flow states:** Draft → Preflight → Generating → Verifying → Ready | Blocked (with reasons & appeal link).
- **Blocked Export Banner copy (example):** “Export blocked by **License CLA‑3.2** (Owner: **Acme Data LLC**). Request steward review or proceed via documented override.”
- **Loading:** skeletons for tables/cards; spinners in buttons; optimistic toasts.
- **Empty:** guidance + sample actions (e.g., “Try a prompt: *show transactions between X and Y*”).
- **Error:** descriptive; correlation ID; retry; link to status.

---
## 9) Accessibility (WCAG 2.2 AA)
- Full keyboard navigation; skip links; focus rings visible.
- Graph canvas: keyboard panning/zoom; node list fallback; ARIA live for result counts.
- Color contrast ≥ 4.5:1; non‑color cues for status; tooltip content not essential.
- Screen reader labels for buttons; `aria-busy` during long ops; motion reduced.

---
## 10) Internationalization & Localization
- i18n keys for all strings; date/number formatting; LTR/RTL ready; glossary for license/legal terms.

---
## 11) Analytics & Telemetry
- Event schema (examples):
  - `nl2cypher_generated` { tokens, validity, warnings }
  - `sandbox_run` { duration_ms, rows, cost }
  - `export_attempt` { case_id, blocked: bool, reason_code }
  - `manifest_viewed` { nodes, edges }
  - `license_override_requested` { policy_id }
- Page view timing; error tracking; SLO views; alert tests.

---
## 12) Testing Strategy
- **Unit:** component props; hooks; utils.
- **Integration:** NL→Cypher preview; sandbox run; export preflight; blocked banner.
- **E2E:** case ingest → graph select → export → verify; screenshot diffs.
- **Accessibility tests:** aXe checks; keyboard nav flows.
- **Performance:** table virtualization; graph render under load; chart fps.

---
## 13) File Structure (client)
```
client/
  components/
    atoms/
    molecules/
    organisms/
    layout/
  features/
    cases/
    graph/
    exports/
    policy/
    observability/
    admin/
    help/
    playground/
  hooks/
  services/
  styles/
  pages/
```

---
## 14) Open Questions / Decisions
- Graph rendering lib final pick (Cytoscape vs Sigma vs ForceGraph).  
- In‑UI **ManifestViewer** depth (viewer only vs. local verify helper).  
- Query plan visualization (native vs. simplified tree).

---
## 15) Future Hooks (Post‑MVP)
- **Graph‑XAI explainers** UI slot in inspector (path rationales).
- **Write‑capable Copilot** actions gated by approvals.
- **Federated graph search** and cross‑graph joins.
- **Offline kit** sync and redaction overlays.

---
## 16) Appendix — Example Microcopy
- **NL Prompt placeholder:** “Ask in natural language… *show ties between Org A and Person B since 2022*”
- **Sandbox disclaimer:** “Runs in a **read‑only sandbox**—no writes, no side effects.”
- **License blocked:** “This action is blocked by **Data License 4.2**. Contact a **Data Steward** or request an override.”

---
**This document is the single source for UI build tickets.** Each page/organism should map 1:1 to a GitHub epic/story with acceptance criteria derived from the components and interactions above.

