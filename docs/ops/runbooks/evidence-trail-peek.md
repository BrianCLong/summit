# Evidence-Trail Peek Runbook

## Summary

Evidence-Trail Peek is a feature-flagged UI overlay that surfaces provenance timelines, top artifacts, and minimized claims. It depends on read-only APIs and does not modify data.

## Enable in Staging

1. Set feature flag `evidenceTrailPeek` to **true** in the feature flag service, or set `VITE_FEATURE_EVIDENCE_TRAIL_PEEK=true` for the web build.
2. Reload the web app.
3. Validate the overlay in `/copilot` and graph panes.

## Health Checks

- `GET /api/evidence-index?answer_id=<id>`
- `GET /api/evidence-top?answer_id=<id>`
- `GET /api/claim-ranking?answer_id=<id>`

Expected responses are `200` with empty arrays when no data exists.

## Rollback

1. Flip `evidenceTrailPeek` flag to **false** (or unset `VITE_FEATURE_EVIDENCE_TRAIL_PEEK`).
2. Reload UI assets.

Endpoints can remain deployed (read-only).

## Observability

Monitor telemetry events:

- `time_to_first_confident_verdict_ms`
- `verification_error_rate`
- `answer_surface_claim_count`
- `badge_click_through`
- `artifact_click_through`
