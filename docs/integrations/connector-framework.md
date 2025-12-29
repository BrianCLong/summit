# CompanyOS Connector Framework and High-Value Integrations

## 1) Goals and Non-Negotiables

- Pluggable connectors that can be added/removed without affecting core runtime.
- Secure multi-tenant isolation for tokens, secrets, and webhooks.
- Unified lifecycle: install, authorize, sync, receive webhooks, schedule jobs.
- Observability and drift detection for every connector operation.
- Compliance-by-default: least privilege scopes, auditable decisions, policy-as-code guards.

## 2) Reference Architecture

| Layer             | Components                                                                              | Responsibilities                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ingress**       | Webhook Gateway (per-connector endpoints), Signature Validator, Replay Detector         | Validates HMAC/JWT/PKI signatures, enforces IP allowlists, drops/flags replays, pushes events to Event Bus.                                   |
| **Auth**          | OAuth Broker, Token Vault (HSM-backed), Token Refresh Service, Scope Catalog            | Manages OAuth flows, rotates/refreshes tokens, stores per-tenant secrets with envelope encryption, validates requested scopes against policy. |
| **Control Plane** | Connector Registry, Tenant Mapper, Installation Service, Policy Engine (OPA), Scheduler | Registers connector manifests, maps tenants to installations/accounts, enforces guardrails, schedules sync jobs (cron + adaptive).            |
| **Data Plane**    | Connector SDK, Sync Engine, Incremental Cursor Store, Conflict Resolver                 | Provides unified interfaces for install/sync/webhook handlers; tracks checkpoints; handles merge rules and source-of-truth policies.          |
| **Reliability**   | Event Bus (e.g., NATS/Kafka), DLQ, Retry/Backoff Manager, Rate-Limit Governor           | Decouples processing, applies exponential backoff + jitter, enforces connector-specific rate budgets, captures poison events.                 |
| **Observability** | Metrics/Logs/Traces, Drift Detector, Alerting Rules                                     | Emits per-tenant/connector metrics, compares last-seen hashes vs source-of-truth, raises alerts for sync failures or drift.                   |

### Key Data Stores

- **Secrets Vault**: HSM/KMS-encrypted storage for tokens, per-tenant isolation, immutable audit trail of access.
- **Tenant Mapping DB**: Maps CompanyOS tenant → connector installation → provider account/workspace identifiers and scopes.
- **Sync State Store**: Per-tenant checkpoints (timestamps, cursors, ETags), hash digests for drift detection, conflict-resolution metadata.
- **DLQ**: Captures irrecoverable events with headers (tenant, connector, error class, replay token).

### OAuth & Token Refresh Flow

1. Tenant admin initiates install → OAuth Broker redirects to provider with pre-declared scopes.
2. Broker stores state nonce (per-tenant) and PKCE verifier; upon callback, validates state + code verifier.
3. Token Vault exchanges code, stores access/refresh tokens encrypted with tenant-specific key; writes audit event.
4. Token Refresh Service renews tokens proactively (70% of lifetime) and on-demand when 401/invalid token is detected.
5. Scopes are validated against policy catalog; overbroad scopes are rejected with human-readable remediation steps.

### Tenant Isolation

- Every token and webhook endpoint is namespaced by tenant+connector+installation; access checks on every request.
- Webhook Gateway enforces per-tenant signing secrets and rejects cross-tenant payloads.
- Processing pipelines run in isolated work queues; fan-out is scoped to tenant-specific topic names.

## 3) Unified Connector Interface (SDK Contracts)

```ts
interface ConnectorManifest {
  id: string; // unique connector id
  displayName: string;
  scopes: string[]; // provider scopes
  resources: string[]; // e.g., ['channels', 'messages']
  webhooks?: WebhookSpec[]; // subscribed events
  schedules?: ScheduleSpec[]; // default cron/adaptive schedules
}

interface InstallContext {
  tenantId: string;
  installationId: string;
  auth: OAuthTokens;
}
interface SyncContext extends InstallContext {
  cursor?: string;
  since?: string;
}

interface Connector {
  install(ctx: InstallContext): Promise<InstallResult>;
  sync(ctx: SyncContext): Promise<SyncResult>; // supports incremental cursors + full re-sync
  handleWebhook(event: WebhookEvent, ctx: InstallContext): Promise<void>;
  schedule?: (registry: Scheduler, manifest: ConnectorManifest) => void; // register jobs
}
```

- **Install**: completes OAuth, stores tokens/secrets, validates scopes, seeds initial cursor, registers webhooks.
- **Sync**: incremental-first; supports full refresh; must return updated cursors/ETags and emitted records.
- **Webhook Handling**: idempotent; validates signatures; pushes normalized events to ingestion bus.
- **Scheduling**: cron + adaptive (backoff on rate limits, burst after bulk updates); jobs are tenant/connector scoped.

## 4) Data Sync Strategy

- **Incremental-first**: Use provider cursors (Slack `latest`/`oldest`, Jira `updated >=`, GitHub `since`), fall back to time-based windows with overlap buffers to avoid gaps.
- **Conflict Handling**:
  - Prefer provider as source-of-truth for authoritative fields; CompanyOS overrides allowed only in mapped, user-controlled fields.
  - Last-writer-wins within same source; cross-source merges use priority ordering (e.g., Jira > Slack messages for task status).
  - Soft deletes tracked with tombstones and expiry; replay-safe via idempotency keys.
- **Drift Detection**: Hash slices of canonical records; compare during scheduled drift checks; enqueue remediation tasks on mismatch.
- **Ordering/Idempotency**: Use deterministic composite keys (provider_id + tenant); store processed event fingerprints to drop duplicates.

## 5) Security Model

- **Least privilege**: Connector manifests declare minimal scopes; policy engine rejects installs requesting extras; periodic scope attestation jobs.
- **Secret storage**: Tokens and signing secrets in HSM/KMS-backed vault; rotated on schedule and after provider rotation events.
- **Webhook verification**: HMAC (Slack, GitHub), JWT (M365), or RSA signatures (Google); replay windows <=5 minutes with nonce cache.
- **Network & Isolation**: Dedicated ingress paths with WAF; per-connector rate guards; optional private egress via VPC endpoints.
- **Auditability**: Every token access, webhook validation, and sync decision emits an immutable audit log entry.

## 6) Operational Controls

- **Rate limiting**: Token-bucket per connector and per tenant; adaptive concurrency derived from provider headers (`Retry-After`, `X-RateLimit-Remaining`).
- **Backoff**: Exponential with jitter; classify retryable (429/5xx/lock contentions) vs terminal (403/invalid scope).
- **DLQ strategy**: Poison messages routed to tenant+connector DLQ with payload hash; auto-replay after operator approval; dashboards show age/volume.
- **Observability**: Metrics per connector (latency, error rate, success counts, drift detections), traces with tenant/installation tags, structured logs with correlation ids.
- **Runbooks**: Autogenerated per connector with remediation steps for auth failures, scope drifts, and webhook signature mismatches.

## 7) Proposed High-Value Integrations

### Slack (Notifications, Approvals, Digests)

- **Scopes**: `chat:write`, `channels:read`, `groups:read`, `users:read`, `im:history`, `links:read`, `links:write`.
- **Install**: Bot OAuth (workspace-scoped); store bot token + signing secret; register event subscriptions (`message.channels`, `link_shared`).
- **Sync**: Incremental channel/user sync via `conversations.list` + cursors; message polling for backfill; webhooks for real-time updates.
- **Features**:
  - Approval notifications with interactive buttons (`block_actions`), invoking CompanyOS action webhooks.
  - Daily digests assembled by scheduled job; posted via `chat.postMessage` with contextual deep links.
  - URL unfurl for CompanyOS entities using `links:read/links:write`.
- **Operational**: Respect `Retry-After` headers; enforce per-workspace rate caps; verify signatures with `X-Slack-Signature` + timestamp.

### Google Workspace / Microsoft 365 (Directory + Calendar)

- **Scopes (Google)**: `https://www.googleapis.com/auth/admin.directory.user.readonly`, `admin.directory.group.readonly`, `calendar.events.readonly`.
- **Scopes (M365)**: `User.Read.All`, `Group.Read.All`, `Calendars.Read` (application permissions with admin consent).
- **Install**: Service account (Google) with domain-wide delegation; Azure AD app with certificate auth (M365). Map tenant → domain/tenant ID.
- **Sync**:
  - User/Group directory sync with incremental change tokens (`nextPageToken`/`deltaLink`).
  - Calendar hooks: subscribe via watch channels (Google) or webhook subscriptions (Graph) with renewals; process event create/update/cancel.
- **Conflict/SoT**: Directory authoritative from provider; CompanyOS writes are read-only mirror. Calendar updates are provider authoritative; CompanyOS suggestions go through provider APIs with ETag checks.
- **Operational**: Renewal scheduler for Google watch channels; M365 subscription renewal every <3 days; verify JWT signatures from Graph/Google.

### Jira (Project & Task Mirroring)

- **Scopes**: `read:jira-work`, `read:jira-user`, `write:jira-work` (optional), `manage:jira-webhook`.
- **Install**: OAuth 2.0 (3LO) for Cloud; store `cloudid` per installation. Register webhooks for issue events.
- **Sync**:
  - Incremental issues/projects via JQL (`updated >= lastCursor ORDER BY updated ASC`).
  - Status updates mirrored to CompanyOS tasks; optional write-back to Jira with transition APIs using optimistic concurrency (version field).
- **Conflict/SoT**: Jira is authoritative for status and workflow fields; CompanyOS may manage supplemental metadata; collisions resolved via Jira `version` increments.
- **Operational**: Handle pagination/rate limits; retry on `429` with `Retry-After`; webhook signature (JWT) validation.

### GitHub (PR/Issue Linkage, Release Notes)

- **Scopes**: `repo`, `read:org`, `admin:repo_hook` (webhook registration); can be narrowed to `public_repo` for OSS tenants.
- **Install**: GitHub App recommended (better least-privilege); stores installation ID and private key; per-tenant permissions configured.
- **Sync**:
  - Issues/PRs incremental via `since` parameter; webhook for `issues`, `pull_request`, `release` events.
  - Release notes ingestion: fetch release assets/changelogs, normalize into CompanyOS release catalog.
- **Conflict/SoT**: GitHub authoritative for code/release metadata; CompanyOS annotations stored separately. Write-backs gated and use ETag.
- **Operational**: Handle secondary rate limits; use conditional requests with ETags; verify webhook signatures (HMAC SHA-256); optional GitHub Actions check for data drift.

## 8) Acceptance Criteria Traceability

- **Add/remove without core impact**: Connector registry + SDK boundaries; manifests loaded dynamically; feature flags per connector.
- **Multi-tenant isolation**: Namespaced queues, per-tenant secrets, signature validation; no cross-tenant token reuse.
- **Observability**: Metrics/traces/logs per connector; drift detector jobs; DLQ dashboards; alert rules for sync failure rates and drift counts.

## 9) Forward-Looking Enhancements

- **Deterministic streaming offsets** using CRDT-based cursors for multi-source reconciliation.
- **Policy-driven scope minimization** via automated least-privilege recommender (analyzes API usage and proposes scope reductions).
- **Hot-swap connectors** with WASI sandboxes to load/unload connector modules safely at runtime.
