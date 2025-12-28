# Summit Frontend Reliability Contract

**Owner:** Frontend Reliability Owner
**Scope:** User-visible browser experience for Summit web applications.
**Effective window:** Rolling 28 days unless otherwise stated.

## 1) Frontend SLO Specification

### A. Availability SLOs

| SLO                                                 | User journey                                                                     | Measurement window | Target | User-visible “unavailable” definition                                                                                | Signal & measurement                                                                                                                                      | Error budget                    | Enforcement trigger                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **A1: Application shell load availability**         | App shell initial load                                                           | 28 days            | 99.9%  | HTML shell fails to render within **10s** or results in blank shell UI (no global nav + no primary layout container) | **Synthetic:** Playwright journey checks (app shell URL + DOM assertions). **Gap:** verify RUM shell render events are emitted to observability pipeline. | 0.1% of shell load attempts     | Burn >50% in 7 days triggers lane restriction; burn >100% triggers freeze of feature lanes affecting shell. |
| **A2: Core dashboards render availability**         | Core dashboards (e.g., Investigation, Entities, Relationships, Copilot, Results) | 28 days            | 99.5%  | Dashboard route loads but **primary data widget fails** to render within 15s or shows blocking error state           | **Synthetic:** route-level checks for dashboard main widgets. **Gap:** route-level render success events in telemetry.                                    | 0.5% of dashboard load attempts | Burn >50% in 7 days triggers targeted rollback or feature gate.                                             |
| **A3: Critical workflows (read-only) availability** | Read-only investigative workflows (search + view details)                        | 28 days            | 99.5%  | Search results fail to render or details pane cannot open within 15s                                                 | **Synthetic:** search + open detail via Playwright. **Gap:** workflow success events in telemetry.                                                        | 0.5% of workflow attempts       | Burn >50% in 7 days blocks new features in workflow lane until remediated.                                  |

### B. Performance SLOs

| SLO                              | User journey                                                  | Measurement window | Target | Threshold                                                      | Signal & measurement                                                                                                                                      | Error budget                            | Enforcement trigger                                                  |
| -------------------------------- | ------------------------------------------------------------- | ------------------ | ------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| **P1: Initial load performance** | First content render                                          | 28 days            | 95%    | LCP ≤ **3.0s** on desktop, ≤ **4.0s** on laptop-class hardware | **Interim:** synthetic Lighthouse/Playwright web-vitals collection in CI and nightly runs. **Gap:** production RUM web-vitals ingestion to observability. | 5% of page loads exceeding LCP          | Burn >50% in 7 days gates new UI features that increase bundle size. |
| **P2: Interaction latency**      | Key UI actions (filter toggle, expand row, open detail panel) | 28 days            | 97%    | INP ≤ **200ms** for tracked interactions                       | **Interim:** synthetic interaction timing via Playwright; manual profiling for regressions. **Gap:** INP telemetry in production.                         | 3% of interactions exceeding INP        | Burn >50% in 7 days blocks interaction-heavy features until fixed.   |
| **P3: Large dataset rendering**  | Render 2k-5k row dataset                                      | 28 days            | 95%    | Visible rows render in ≤ **2.5s** after data response          | **Interim:** component perf harness (if present) or Playwright test with dataset fixture. **Gap:** production render timing events.                       | 5% of large renders exceeding threshold | Burn >50% in 7 days triggers perf remediation sprint.                |

### C. Correctness & Trust SLOs

| SLO                                             | User-visible trust guarantee                                      | Measurement window | Target                    | Definition of violation                                             | Signal & measurement                                                                                                              | Error budget            | Enforcement trigger                                                |
| ----------------------------------------------- | ----------------------------------------------------------------- | ------------------ | ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| **C1: Provenance completeness**                 | All displayed claims show provenance and confidence when required | 28 days            | 99.9%                     | Any rendered claim missing provenance badge/metadata                | **Interim:** UI contract tests for claim cards; lint rules for required fields. **Gap:** production audit of provenance presence. | 0.1% of rendered claims | Any spike >0.05% triggers immediate rollback of offending release. |
| **C2: Simulated/forecasted data labeling**      | Simulated/forecasted data must be labeled                         | 28 days            | **100% (zero tolerance)** | Any simulated/forecasted datum displayed without label              | **Interim:** unit tests + visual regression for labels. **Gap:** runtime assertions in client for label presence.                 | 0%                      | Any violation blocks all feature lanes until fixed.                |
| **C3: Metrics integrity under partial failure** | UI must not misrepresent metrics when data is partial             | 28 days            | **100% (zero tolerance)** | Any metric shown without “partial data” indicator when sources fail | **Interim:** chaos-mocked UI tests for partial failures. **Gap:** runtime detection of partial data flags.                        | 0%                      | Any violation triggers immediate hotfix requirement.               |

### D. Error Handling SLOs

| SLO                          | User-visible behavior                                        | Measurement window | Target                    | Definition of violation                                          | Signal & measurement                                                                                                                      | Error budget             | Enforcement trigger                                                |
| ---------------------------- | ------------------------------------------------------------ | ------------------ | ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| **E1: Error visibility**     | Errors must surface with user-readable message               | 28 days            | 99.9%                     | Request fails but UI shows stale/silent success                  | **Interim:** UI tests for error states; log-based detection of unhandled promise rejections. **Gap:** client-side error boundary metrics. | 0.1% of failed requests  | Burn >50% in 7 days freezes feature lanes touching error surfaces. |
| **E2: Graceful degradation** | UI shows partial data with explicit banner                   | 28 days            | 99.5%                     | Partial failure occurs with no banner or incorrect success state | **Interim:** chaos-mocked UI tests. **Gap:** production correlation of partial-failure flags to UI banners.                               | 0.5% of partial failures | Burn >50% in 7 days requires mitigation plan before new releases.  |
| **E3: No misleading UI**     | UI must never show incorrect “success” when failure occurred | 28 days            | **100% (zero tolerance)** | Any instance of “success” state shown while data invalid         | **Interim:** golden path tests + error injection. **Gap:** production event correlation for status misclassification.                     | 0%                       | Immediate shipping halt for UI-affecting lanes.                    |

## 2) Error Budgets & Shipping Rules

### Error Budget Definition

- **Budget** = 1 - SLO target (for zero-tolerance SLOs, budget = 0).
- **Burn rate** measured over rolling 7 days and rolling 28 days.
- **Critical threshold**: >50% burn in 7 days **or** >100% burn in 28 days.

### Shipping Governance

- **Feature lanes** are constrained by SLO health.
- **Any zero-tolerance breach** halts all lanes impacting user trust or correctness.
- **Non-zero breaches** cause lane-specific restrictions and require a remediation plan.

### Actions When Budgets Are Exceeded

1. **Lane restriction:** pause merges to lanes tied to the violated SLO.
2. **Hotfix or rollback:** required for any user-visible regressions.
3. **Root cause review:** document in reliability log within 48 hours.
4. **Budget recovery:** feature work resumes only after burn rate returns below 1x.

## 3) Lane-to-SLO Mapping

| Feature lane                   | Constrained by SLOs | Enforcement action on breach                                                        |
| ------------------------------ | ------------------- | ----------------------------------------------------------------------------------- |
| **UI/UX lane**                 | A1, A2, P1, P2, E1  | Freeze UI releases when shell or interaction SLOs breach.                           |
| **Data rendering lane**        | A2, P3, C1, C3, E2  | Hold data visualization changes until correctness and render SLOs recover.          |
| **Trust & labeling lane**      | C1, C2, C3, E3      | Hard stop for any trust breach (zero-tolerance).                                    |
| **Workflow lane (read-only)**  | A3, P2, E1, E2      | Pause new workflow features when read-only availability or error handling breaches. |
| **Compliance/Governance lane** | C2, C3, E3          | Requires full health before merge; zero-tolerance only.                             |

## 4) Instrumentation & Measurement Plan

### Current Signals (Known/Verifiable)

- **Synthetic checks:** Playwright or equivalent browser tests for shell load and critical journeys.
- **CI perf checks:** Lighthouse or web-vitals collection in CI for regressions.
- **UI tests:** unit/integration tests for labels, provenance badges, error boundaries.

### Gaps & Follow-up Work

- **RUM web-vitals ingestion** for LCP/INP in production.
- **Route-level render success events** emitted from the frontend.
- **Partial-failure banner correlation** to backend error flags.

### Interim Proxies

- **Synthetic nightly runs** with fixed dataset fixtures.
- **Error-boundary logging** in browser console to CI artifact parsing.
- **Manual release checks** for key dashboards until RUM instrumentation is live.

## 5) Reliability Governance Memo

**Reliability Contract:** Summit frontend reliability is defined by explicit SLOs for availability, performance, correctness, and error handling. Each SLO has an error budget that governs release velocity.

**How it governs shipping:** Feature lanes are gated by their mapped SLOs. When error budgets burn too fast—or any zero-tolerance SLO is violated—shipping halts until remediation or rollback restores health. Reliability gates are not discretionary; they are policy.

**How it preserves user trust at scale:** Users see accurate labels, complete provenance, and correct error states even under partial failure. Performance and availability guarantees ensure the UI remains responsive and truthful as traffic and data volume grow.

---

**Next steps:** Align telemetry ownership, implement RUM web-vitals, and wire dashboard-level success events into the observability pipeline.
