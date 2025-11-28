# Summit Reporting & Data Export System

This document describes the production-ready reporting backbone that powers scheduled executive briefings, intelligence rollups, and export workflows across Summit.

## Capabilities

- **Template-driven authoring** using a Jinja2-compatible renderer (Nunjucks) with reusable filters for dates, truncation, and emphasis.
- **Multi-format export** to JSON, CSV, PDF, Excel (XLSX), Word (DOCX), and PowerPoint (PPTX) with consistent watermarking.
- **Automated delivery** to email, Slack webhooks, and arbitrary HTTPS webhooks with attachment metadata.
- **Scheduling** via cron-style expressions for recurring briefs, daily threat assessments, and executive dashboards.
- **Access control** enforced per action (view/deliver) with auditable version history (hashes per artifact).
- **Input validation** on templates, requests, and delivery instructions to prevent misrouted jobs or malformed payloads.
- **Extensibility** through a pluggable exporter registry and dependency-free template layer.

## Architecture

- **TemplateEngine (`server/src/reporting/template-engine.ts`)** renders Jinja2-compatible templates and exposes reusable filters.
- **Exporters (`server/src/reporting/exporters/`)** transform rendered payloads into target formats while applying titles and watermarks.
- **DeliveryService (`server/src/reporting/delivery-service.ts`)** handles channel fan-out (email/Slack/webhook) with swappable transports.
- **AccessControlService (`server/src/reporting/access-control.ts`)** enforces RBAC rules on generate/deliver actions.
- **VersionStore (`server/src/reporting/version-store.ts`)** tracks immutable checksums for every generated artifact to support audit and rollback.
- **ReportingService (`server/src/reporting/service.ts`)** orchestrates render → export → version → delivery for a single request.
- **ReportScheduler (`server/src/reporting/scheduler.ts`)** wires validated cron expressions to generation jobs for recurring delivery.
- **Validation (`server/src/reporting/validation.ts`)** centralizes Zod schemas for templates, requests, and delivery instructions.

## Delivery Flow

1. Request enters `ReportingService.generate` with a template, context, watermark, and optional recipients.
2. Access checks ensure the caller can view/deliver reports.
3. The template is rendered and normalized for the appropriate exporter.
4. The exporter emits a binary artifact with format-specific metadata and watermarking.
5. The artifact hash is recorded in the `VersionStore`.
6. `DeliveryService` fan-outs the artifact to configured channels and returns per-channel delivery results for auditing.
7. `ReportScheduler` can bind the above to a cron cadence for continuous delivery; invalid cron strings are rejected before registration.

## Operational Notes

- Request validation leverages `zod` to catch missing delivery configuration (for example, enabling `email` without recipients) and malformed cron strings before a job is registered.
- Each artifact records a version identifier and delivery metadata to support downstream observability and troubleshooting.
- Time zone-aware schedules can be set via the optional `timezone` field on `ScheduledReportJob`, enabling region-specific cadences.

## Security & Compliance

- Watermarks are injected at the exporter layer (PDF overlays, worksheet banners, DOCX/PPTX copy) to prevent uncontrolled dissemination.
- RBAC gatekeeping protects both generation and delivery pathways.
- Artifact hashes provide tamper-evident history for audits and executive approvals.
- Default email transport uses `jsonTransport` for safe local development; production uses `SMTP_URL`.

## Extending

- Add a new exporter by implementing `ReportExporter` and registering it in `exporters/index.ts`.
- Introduce additional delivery channels by extending `DeliveryService` with new handlers.
- Persist `VersionStore` to an external database by swapping the in-memory map with a durable implementation.
- Wrap `ReportScheduler` registration inside existing job orchestration or worker pools to centralize observability.
