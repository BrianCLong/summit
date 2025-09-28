# Connectors Verification (PR-12)

This checklist verifies availability and basic wiring of 10 connectors and the Ingest Wizard UI/flow.

## Targets
- Twitter/X
- TikTok
- RSS
- YouTube
- Reddit
- Telegram
- GitHub (Issues/PRs)
- Slack (Channels/Threads)
- Google Drive (Docs/Sheets)
- S3 (Object listings)

## Backend
- Endpoint `GET /ingest/connectors` returns available connector list.
- Endpoint `POST /ingest/start` accepts `{ connector, config }` and returns `job_id`.

## Frontend
- Ingest Wizard component present in side panel.
- Can list connectors and submit a simple job (shows `job_id`).

## Status
- API endpoints scaffolded (see `services/api/ingest_wizard.py`), require binding in the running API service.
- UI Ingest Wizard wired in `client/src/components/IngestWizard.tsx` with `VITE_API_URL` env fallback to `http://localhost:8000`.
- Next: integrate with actual connector worker jobs and progress tracking.

## Notes
- For each connector, add a minimal config schema and a dry-run validation endpoint.
- Ensure OPA/ABAC checks protect connector start operations by tenant/role.
