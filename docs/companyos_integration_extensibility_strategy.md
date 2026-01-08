# CompanyOS Integration & Extensibility Strategy

## Public API strategy

### Domains and sequencing

- **Phase 1 (foundational):** Tenants, users/service accounts, incidents/cases, workflows (definitions + runs), and event log read APIs. These unlock provisioning, SSO alignment, incident ingest, and automation.
- **Phase 2 (expansion):** Assets/config objects (connectors, runbooks), observability (metrics/traces summaries), notification channels, and policy surfaces (RBAC, approvals, guardrails) with fine-grained scopes.
- **Phase 3 (ecosystem):** Marketplace apps, cross-tenant federation (opt-in), data export/import, and advanced streaming (Provenance Ledger + analytics).

### Authn/z model

- **Credential types:**
  - **OAuth 2.1 confidential clients** for third-party SaaS integrations; supports authorization code + PKCE and client credentials for backend-to-backend.
  - **Service accounts with signed tokens** (short-lived JWTs minted via OAuth client credentials) for automation and server-side tasks; bound to tenants and RBAC roles.
  - **Rotatable API keys** (HMAC) for low-complexity ingestion/webhook targets; limited scopes and expiration required by policy.
- **Scopes & permissions:**
  - Use **least-privilege scopes** (e.g., `incidents:write`, `events:read`, `workflows:trigger`, `tenants:manage`, `users:read`).
  - Scopes map to **policy-backed RBAC** with resource-type constraints (tenant, environment, project). Attribute-based checks (ABAC) layer for environment, data sensitivity, and compliance posture.
- **Token transport & lifecycle:**
  - All tokens are **short-lived** (15–60 minutes) with refresh tokens subject to device and IP reputation checks.
  - **Key rotation** enforced via expirations, overlapping validity windows, and JWKS publishing. Compromise response includes remote key revocation and replay detection.
- **Client isolation:** Each tenant receives isolated auth context; cross-tenant access requires explicit org-admin delegation + audit trail.

### Versioning, deprecation, compatibility

- **Semantic, additive-first** versioning (e.g., `/v1`) with **compatibility guarantees** for breaking changes only on new major versions.
- **Sunset policy:** 12-month support window after announcing a breaking change; deprecation headers (`Sunset`, `Deprecation`) and changelog entries.
- **Backward-compatible extensions:** Prefer additive fields + vendor prefixes (`x-`) for experimental features; return `warning` headers when clients use deprecated fields.
- **Discoverability:** `/v1/meta` endpoint exposes supported versions, sunset dates, and JWKS URLs.

## Webhooks & event delivery

### Subscription model

- **Topic-based subscriptions** (e.g., `incidents.*`, `workflows.run.*`, `events.ingest.*`, `users.lifecycle.*`).
- **Filters:** Attribute filters on tenant, severity, labels/tags, environment, resource IDs, and time windows. Support **JQ-like filter expressions** with guardrails to prevent heavy computation.
- **Delivery targets:** HTTPS endpoints with TLS 1.2+; optional **event bridge** integration (e.g., Kafka/CloudEvents-compatible) for enterprise tenants.

### Delivery semantics & safety

- **At-least-once delivery** with unique `event_id` + `delivery_id` for idempotency; recommend consumers store `event_id` to de-dupe.
- **Retries with backoff:** Exponential backoff (initial 30s, max 24h, jitter). Dead-letter queue per subscription with retention configurable by tenant tier.
- **Signing & integrity:** HMAC-SHA256 signature over canonical payload + timestamp header (`CompanyOS-Signature: t=..., v1=...`). Replay protection via timestamp skew limits and nonce cache.
- **Idempotency:** Optional `Idempotency-Key` supported for outgoing calls initiated by webhooks (e.g., response actions) to prevent duplicated side effects.

### Tenant isolation, throttling, and observability

- **Per-tenant throughput limits** with burst + sustained rates; **per-subscription** concurrency caps to prevent noisy-neighbor issues.
- **Circuit breakers**: auto-disable misbehaving endpoints after repeated 5xx or timeouts; require admin re-enable.
- **Observability:** Delivery logs with status, latency, retries, and signatures; **trace context propagation** (W3C Trace-Parent) to correlate across systems.
- **Data minimization:** Payloads redacted per tenant data-classification policy; optional field-level encryption for sensitive fields.

## Extension/app model

### Visibility and permissions

- **Tenant-scoped apps** by default; org-wide apps require org-admin approval. Apps receive **scoped tokens** matching granted permissions.
- **Capabilities:** Read/write incidents, trigger workflows, manage artifacts (files, comments), propose configuration changes via **change requests** requiring human approval, emit/subscribe to events, and register UI surfaces (panels, actions).
- **Data boundaries:** Apps cannot bypass tenant data residency; cross-tenant data transfer requires explicit data-sharing agreements and is logged.

### Packaging & lifecycle

- **Package format:** Signed manifest (`app.yaml`) describing permissions, webhooks, UI extensions, runtime endpoints, and minimum API version. Includes checksum of assets.
- **Lifecycle:** Install → consent (scopes) → configure (secrets, endpoints) → activate. Supports **upgrade with migration hooks**, **pause/disable**, and **uninstall with data retention options** (retain, archive, purge).
- **Distribution:** Private (direct install), org gallery, or **reviewed marketplace**. Marketplace apps require security review, SLA declaration, and support contacts.

### Review, approval, security posture

- **Security review gates:** Static analysis of manifests/endpoints, SBOM submission, dependency policy checks, and penetration review for marketplace apps.
- **Runtime controls:**
  - **Egress restrictions** and allowlists for outbound calls from hosted apps.
  - **Rate and quota limits** per app + per capability.
  - **Audit trails** for all app actions; tamper-evident logs stored in Provenance Ledger.
  - **Secrets management** via vault-backed storage; no long-lived secrets exposed to apps.
- **User experience safeguards:** Consent screens show scopes, data classes accessed, and expected data flows. Fine-grained revocation with immediate token invalidation.

## Artifacts

### CompanyOS Public API Principles (outline)

1. **Security-first by default:** OAuth 2.1 + short-lived tokens, signed webhooks, and deterministic audit trails.
2. **Least privilege & explicit consent:** Scope-based access, human-in-the-loop approvals for risky actions.
3. **Event-native architecture:** Every material change emits an event; APIs are projections of the event log.
4. **Deterministic idempotency:** Clear idempotency keys and replay protections across APIs and webhooks.
5. **Predictable compatibility:** Semantic versioning, additive evolution, long deprecation windows, and strong metadata (`Sunset`, `Deprecation`).
6. **Tenant isolation and governance:** Per-tenant limits, data residency enforcement, and provenance tracking.
7. **Operational excellence:** Observability, backpressure controls, and well-defined SLOs for APIs and delivery.

### Example API definitions (pseudo-OpenAPI)

#### Create incident

```yaml
POST /v1/incidents
security:
  - oauth2: ["incidents:write"]
  - apiKey: []
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [title, severity]
        properties:
          title: { type: string }
          severity: { type: string, enum: ["sev0","sev1","sev2","sev3"] }
          description: { type: string }
          labels: { type: object, additionalProperties: { type: string } }
          attachments: { type: array, items: { type: string, format: uri } }
responses:
  "201":
    description: Incident created
    headers:
      Idempotency-Key: { description: "Echoed from request when provided" }
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/Incident"
  "409": { description: "Idempotency conflict" }
```

#### Trigger workflow run

```yaml
POST /v1/workflows/{workflow_id}/runs
security:
  - oauth2: ["workflows:trigger"]
  - serviceAccount: []
parameters:
  - in: path
    name: workflow_id
    required: true
    schema: { type: string }
  - in: header
    name: Idempotency-Key
    required: false
    schema: { type: string, maxLength: 64 }
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          inputs: { type: object }
          priority: { type: string, enum: ["low","normal","high"] }
          labels: { type: object, additionalProperties: { type: string } }
responses:
  "202": { description: "Run accepted", content: { application/json: { schema: { $ref: "#/components/schemas/WorkflowRun" } } } }
  "429": { description: "Rate limit exceeded" }
```

### Webhook contract spec

- **Endpoint registration:** `POST /v1/webhooks/subscriptions` with target URL, topics, filters, secret, and delivery preferences (max retries, DLQ opt-in).
- **Headers:**
  - `CompanyOS-Event-Id`: unique event UUID.
  - `CompanyOS-Delivery-Id`: unique per-attempt UUID.
  - `CompanyOS-Topic`: topic string (e.g., `incidents.created`).
  - `CompanyOS-Signature`: `t=timestamp, v1=hex(hmac_sha256(secret, canonical_payload))`.
  - `Content-Type`: `application/json`; `Traceparent` for distributed tracing.
- **Payload shape:**

```json
{
  "event_id": "uuid",
  "delivery_id": "uuid",
  "topic": "incidents.created",
  "occurred_at": "2026-10-15T12:34:56Z",
  "tenant_id": "tenant-123",
  "schema_version": "1.0",
  "data": {
    "incident": {
      "id": "inc-789",
      "title": "DB latency spike",
      "severity": "sev1",
      "labels": { "env": "prod", "service": "payments" }
    }
  },
  "meta": {
    "attempt": 1,
    "trace_id": "trace-abc",
    "idempotency_key": "optional-if-provided"
  }
}
```

- **Retry behavior:** Exponential backoff with jitter; stop after N attempts (default 10). DLQ event includes last error + headers. Duplicate deliveries preserve `event_id` and new `delivery_id`.
- **Failure handling:** 2xx considered success; 4xx/5xx retried except 410 (subscription gone) or 401/403 (disabled). Circuit breaker after repeated failures.

### Forward-leaning enhancements

- **Confidential compute extensions:** Offer optional **TEE-backed signing keys** for high-sensitivity tenants so webhook secrets and OAuth private keys never leave enclaves.
- **Event streaming via CloudEvents over NATS/Kafka** with schema registry and **data-classification tags** to enable policy-driven routing and encryption at field level.
- **Deterministic sandboxing for apps** using **WASM-based runtime** with capability tokens, enabling portable, verifiable execution for marketplace apps.
