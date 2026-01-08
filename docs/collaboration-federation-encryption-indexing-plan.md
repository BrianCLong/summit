# Collaboration, Federation, Encryption, Indexing, Offline, Invite, and Watermark Blueprint

This document captures a cohesive plan for rolling out the eight requested platform capabilities behind feature flags. Each section articulates scope, API shapes, data flow, and testability expectations so implementation can proceed without ambiguity while preserving production safety.

## 1. Collaboration Layer v1 (Comments + Annotations)

- **Feature flag:** `COLLAB_V1=true` gates all HTTP handlers and background jobs.
- **Endpoints:**
  - `POST /comments` creates a new thread or reply with `resourceType`, `resourceId`, optional `parentId`, and `caseId` in body; tenant and case scope enforced via auth middleware.
  - `GET /comments?resourceType=&resourceId=&cursor=` returns paginated, stable-ordered threads (createdAt asc, tie-breaker by id) for the caller's tenant/case.
  - `POST /annotations` creates an anchored annotation with `anchor` (standard locator `{resourceType, resourceId, field?, offset?, length?}`) and optional `threadId` linkage.
  - `GET /annotations?resourceType=&resourceId=&cursor=` paginates anchored annotations deterministically.
- **Data model:**
  - `Comment`: `id`, `threadId`, `parentId?`, `caseId`, `tenantId`, `resourceType`, `resourceId`, `body`, `createdBy`, `createdAt`, `updatedAt`, `audit`. Replies inherit `threadId` from root.
  - `Annotation`: `id`, `caseId`, `tenantId`, `anchor`, `body`, `createdBy`, `createdAt`, `updatedAt`, `audit`.
- **Permissions:**
  - Enforcement via role-based policy: only case members with `collaborate:write` can post; `collaborate:read` can view. Multi-tenant isolation by `tenantId` and `caseId` row filters.
- **Audit:**
  - All create/update/delete flows emit audit events (`collaboration.comment.created`, `collaboration.annotation.created`) containing actor, caseId, tenantId, resource locator, and hash of payload for tamper detection.
- **Tests:**
  - Integration: permission matrix (member vs non-member), thread ordering, anchor validation, pagination cursors deterministic.

## 2. External Identity Federation (OIDC-first)

- **Feature flag:** `FEDERATION=true` to avoid impact on local auth.
- **Components:**
  - `server/src/auth/federation/oidcHandler.ts` handles `/auth/oidc/callback`, validates ID token via JWKS, and extracts `sub`, `email`, and `groups`.
  - Mapping layer translates external groups/claims -> internal roles/ABAC attributes using config-driven map (e.g., `federation.mappings.*` in config). Supports default role fallbacks and deny lists.
  - JIT provisioning: when enabled, creates user record bound to tenant with least-privilege role; otherwise links existing user by email.
- **Tests:**
  - Unit: mapping edge cases (unknown group, multiple matches, deny override).
  - Integration: mocked OIDC token callback validates role mapping and preserves local auth behavior when flag disabled.

## 3. Case-Level Envelope Encryption

- **Feature flag:** `CASE_ENCRYPT=true`.
- **Service:** `caseKeys` module with `createKey(caseId)`, `rotate(caseId)`, `encrypt(caseId, payload)`, `decrypt(caseId, blob)`.
  - Dev uses software KEK derived from `CASE_KEY_SEED`; production delegates KEK to provider interface placeholder (`KmsAdapter`).
  - Stores DEK metadata (`version`, `wrappedDek`, `kekKeyId`) per case without re-encrypting existing payloads.
- **Initial use:** export bundle manifest encryption metadata includes wrapped DEK and ciphertext; consumers decrypt only with matching case key version.
- **Tests:** unit crypto round-trip, rotation preserves previous versions; integration ensures wrong case key fails.

## 4. Full-Text Indexing Pipeline

- **Feature flag:** `FTS=true`.
- **Service:** `textIndex` with `indexDocument(docId, text, metadata)` and `searchText(q, filters)`.
  - In-process index (e.g., Lunr/mini-search) seeded from ingestion preview path; redaction hook invoked prior to indexing (no-op by default).
  - Supports phrase and prefix queries; returns snippets with hit highlighting and tenant isolation on `tenantId` filter.
- **Tests:** golden corpus fixtures for phrase/prefix queries, deterministic ordering across repeated runs.

## 5. Timeline Evidence Clustering

- **Feature flag:** `TIMELINE_CLUSTER=true` (read-only).
- **Package:** `packages/timeline-cluster/` exposing deterministic scoring that groups events by time proximity, source overlap, and label similarity (Jaro-Winkler or cosine on token vectors). Returns `clusterId`, representative label (top-scoring event), members, and confidence.
- **Integration:** `/entities/:id/timeline?cluster=true` wraps existing timeline query and decorates response with clusters without mutating stored data.
- **Tests:** golden fixtures guaranteeing stable cluster IDs and confidence for edge cases (singletons, identical timestamps, conflicting sources).

## 6. UI Offline Mode v1

- **Feature flag:** `OFFLINE_V1=true`.
- **Behavior:**
  - Service worker caches entity detail, timeline, and neighborhood responses with cache versioning keyed by tenant + case.
  - Read-only offline: write actions short-circuit with UI banner `Offline mode: reads only`.
  - Shows "last synced" timestamp from cache metadata; on reconnect triggers background refresh and diff indicator hook (optional).
- **Tests:** unit tests for cache adapter and service worker registration; simulated offline ensures cached view renders and mutations disabled.

## 7. Secure External Invite Flow

- **Feature flag:** `INVITES=true`.
- **Endpoints:**
  - `POST /invites` creates hashed token invite with `caseId`, scoped role, expiry; returns opaque token for email delivery.
  - `GET /invites/:token` shows invite metadata if valid and unused.
  - `POST /invites/:token/accept` provisions or links user, applying scoped role without escalation and emitting audit events.
- **Data model:** `Invite`: `id`, `caseId`, `tenantId`, `hashedToken`, `expiresAt`, `role`, `createdBy`, `usedAt?`, `usedBy?`, audit trail.
- **Tests:** integration lifecycle (create -> view -> accept), expiry enforcement, reused token rejection, audit assertions.

## 8. Export Integrity Watermark

- **Feature flag:** `EXPORT_WATERMARK=true`.
- **Behavior:** export generator injects footer (PDF/HTML) with tenant-safe identifiers: `exportId`, `createdAt`, `policyHash`, `manifestHash` prefix; optional QR text payload if QR library present.
- **Validation:** watermark appended without breaking format; manifest hash reference used by verifier; snapshot tests ensure deterministic footer content.
- **Tests:** snapshot for watermark presence and manifest hash consistency.

## Cross-Cutting Safety & Observability

- All features emit audit logs and structured metrics tagged by feature flag state and tenant.
- Permissions rely on existing role + case binding; no writes allowed when offline or flags disabled.
- CI gates should include new Jest/Playwright suites and golden fixtures alongside smoke tests.
