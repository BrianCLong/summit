# Feedback Intake Model

This intake model converts external and production signals into a normalized, reviewable backlog entry. It is optimized for speed, traceability, and evidence-first decision making.

## Canonical Channels

- **Support tickets:** Zendesk/Jira export with customer, environment, and SLA tier.
- **Customer escalations:** Direct AM/CSM submissions with executive visibility requirements.
- **Partner issues:** Integration partner-raised defects or contract-blocking gaps.
- **Observability anomalies:** Alerts from error rates, latency, cost, or policy-denial spikes.
- **SLA breach reports:** Auto-generated incidents when SLO error budgets or latency thresholds are exceeded.

## Normalization Schema (authoritative)

Each intake item MUST be recorded with the following fields. Missing fields block triage.

| Field                  | Required | Values                                                               | Notes                                                     |
| ---------------------- | -------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| `category`             | Yes      | bug / usability / performance / cost / security                      | Drives ownership and verification scope.                  |
| `severity`             | Yes      | P0 / P1 / P2                                                         | Defined in `PRIORITIZATION.md`; P0 auto-escalates paging. |
| `impact_surface`       | Yes      | API / UI / data-plane / control-plane / docs / infra / policy-engine | Multiple allowed when cross-cutting.                      |
| `customer_tier`        | Yes      | strategic / enterprise / commercial / community                      | Influences response SLA and comms path.                   |
| `evidence.links`       | Yes      | URLs to logs, traces, runbooks, dashboards, support tickets          | Must include time window, environment, and provenance.    |
| `evidence.attachments` | Optional | screenshots, HAR files, payload samples                              | Sanitized; no secrets.                                    |
| `frequency`            | Yes      | once / intermittent / recurring                                      | Used for risk profiling.                                  |
| `blast_radius`         | Yes      | single-tenant / multi-tenant / global                                | Determines containment and rollback strategy.             |
| `detected_by`          | Yes      | monitoring / customer / partner / internal QA                        | Enables signal-quality scoring.                           |
| `requested_outcome`    | Optional | fix / workaround / clarification / roadmap                           | Guides prioritization discussions.                        |
| `owner`                | Yes      | functional DRI + backup                                              | Set during triage; enforces accountability.               |
| `status`               | Yes      | new / triaged / in-progress / ready-for-release / shipped / closed   | Mirrors triage flow states.                               |

## Single Intake Board

- **System of record:** `Feedback Intake` Jira project (backed by `docs/feedback` governance).
- **Creation path:** All channels forward into the board via integrations or manual logging. No side-channel tracking.
- **Deduplication:** Auto-dedupe by signature (service + symptom + time window) with manual verification.
- **Visibility:** Default open to engineering, CS, support; P0s mirrored to incident channel.

## Quality Gates for Intake

- Submissions lacking evidence links or impact surface are rejected back to submitter with the required template.
- Every new card is tagged with `category`, `severity`, `impact_surface`, and `customer_tier` before triage can begin.
- Intake bots enforce schema compliance; violations trigger a daily report to the Release Captain.

## Evidence Expectations

- Logs and traces MUST include correlation IDs and environment identifiers.
- Screenshots redact customer identifiers and secrets by default; any exception must be security-approved.
- For observability anomalies, attach the alert snapshot and link to the baseline chart demonstrating the delta.

## Operational Cadence

- **Intake sweep:** 4x daily (00:00, 06:00, 12:00, 18:00 UTC).
- **P0 ingestion:** Immediate page to on-call; card auto-labeled `incident` and linked to the incident timeline.
- **Metrics:** Track intake-to-triage lead time and rejected submissions rate; targets published in `TRIAGE_FLOW.md`.
