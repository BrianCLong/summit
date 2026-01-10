# PR-15381 Storage/DR Safety Hardening Prompt (v1)

Mission: tighten safety, idempotency, and deterministic verification for Redis query caching, partition maintenance, and DR restore validation without introducing new infrastructure features.

## Scope

- server/src/services/queryResultCache.ts
- server/src/services/QueryPreviewService.ts
- server/scripts/partition-maintenance.ts
- scripts/backup-restore-validation.sh
- docs/roadmap/STATUS.json

## Constraints

- Safe-by-default behavior for destructive operations.
- Deterministic verification suitable for CI and local runs.
- Minimal, scoped changes only.
- Follow Summit governance and readiness assertions.

## Deliverables

- Guarded DR restore validation defaults to dry-run unless explicitly enabled.
- Partition maintenance logs planned actions before executing.
- Query preview cache signature consistency fixes.
- Roadmap status refresh.
