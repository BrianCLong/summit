# CompanyOS SDK & Platform API v0

## Scope and Modules

- **Domains**: Identity/Auth, Policy/Authorization, Event Publishing, Observability/Tracing, Config/Feature Flags, Data Access/Residency, Messaging (queues/streams), Secrets.
- **Target languages**: TypeScript/Node 20+, Python 3.10+, Go 1.22+, Java/Kotlin (JVM 17) as roadmap; shared OpenAPI/Schema artifacts for other stacks.
- **Artifacts**: Client SDKs, service-to-service libraries, CLI for local dev, tracing/logging middleware, generated API docs, policy packs, test fixtures/mocks.
- **Versioning/Stability**: Semantic versioning; v0 is experimental with per-module stability tags. Core primitives (identity, policy evaluation, tracing context) are **beta-stable**; others **alpha**. Backward compatibility honored within minor releases for beta modules; alpha may break with release notes and migration steps.

## API Ergonomics and Safety

- **Context propagation**: Standard `Context` struct carries `trace_id`, `tenant_id`, `user_id/service_id`, `scopes`, `locale`, `data_residency`, `request_tags`. Propagated via headers (`Traceparent`, `X-CompanyOS-*`) and middleware for HTTP/gRPC/queues. Helpers to derive child contexts and guard against missing tenant/user.
- **Secure defaults**:
  - Logging scrubs PII/secrets, enforces data-residency redaction, and routes audit events to dedicated sinks.
  - Policy-aware data clients require tenant + purpose, deny cross-tenant access by default, and enforce locality/retention tags.
  - Event emitters auto-attach provenance (actor, tenant, schema version) and validate against schema registry.
  - Metrics/traces include service, tenant, and request class; sampling defaults to user-facing 100% errors, 10% success.
- **Reliability patterns**: Built-in retries with idempotency keys for write calls; circuit breakers around downstreams; deadline/timeout helpers derived from context; structured errors with machine codes (`AUTHN_FAILED`, `POLICY_DENY`, `SCHEMA_MISMATCH`, `RATE_LIMIT`).
- **Extensibility**: Plug-in providers for identity (OIDC/JWT), policy engines (OPA/Cedar), transports (Kafka/SQS/NATS), and telemetry backends (OTel exporters). Default providers ship with secure configurations.

## Distribution and Governance

- **Repos**: `companyos/sdk` mono-repo with per-language packages; shared specs in `/specs` (OpenAPI, protobuf, policy schemas). Language-specific repos mirror published artifacts when needed.
- **Packages/Registries**: npm (`@intelgraph/*`), PyPI (`companyos-*`), Go modules (`go.companyos.dev/sdk`), Maven (`com.companyos.sdk`). Signed releases; SBOM + provenance attached.
- **Release process**: Automated CI with contract tests against mock platform; canary channel (`-rc` tags) before general availability. Release notes + migration guides per minor.
- **Compatibility/Deprecation**: Deprecated APIs marked with telemetry warnings and lint rules; removal only after 2 minor versions with codemods where possible. Strongly-typed feature flags to avoid string drift.
- **Contribution model**: Maintainers own core modules; feature teams submit RFC + contract tests. Extension points registered via provider interfaces; contributions require threat model update + docs + examples. Security review mandatory for identity/policy changes.

## API Outline (v0)

- **Identity/Auth**: Token verification middleware, impersonation guardrails, service credentials helper, session-less validation, cached JWKs.
- **Policy**: Policy check client (`is_allowed`/`authorize!`) with contextual inputs, decision logs, dry-run mode, PDP fail-closed fallback.
- **Observability**: Request/worker middleware for traces + metrics; structured logger with redaction and audit sinks; contextual breadcrumbs.
- **Config & Flags**: Typed flags with ownership metadata, residency-aware rollouts, evaluation cached per context.
- **Events & Messaging**: Schema-validated emit (`emit_event`), durable delivery with backoff & DLQ, outbox helper; consumer framework with checkpointing and tenant isolation.
- **Data Access**: Policy-aware connectors (SQL/OLAP/object store) enforcing residency + purpose binding; query templates with automatic tagging and result filtering; row-level audit trails.

## Example Usage

### Auth check (TypeScript/Node)

```ts
import { withContext, authorize } from "@intelgraph/policy";
import { verifyRequest } from "@intelgraph/identity";

export async function handler(req, res) {
  const base = verifyRequest(req); // extracts user/tenant/trace
  const ctx = withContext(base, { request_tags: ["ui"] });
  await authorize(ctx, { action: "documents:read", resource: { id: req.params.id } });
  res.json({ ok: true });
}
```

### Emit event (Python)

```python
from companyos.context import from_http
from companyos.events import emit_event

ctx = from_http(request)
emit_event(
    ctx,
    topic="documents.v1",
    name="document.accessed",
    payload={"document_id": doc_id},
)
```

### Structured logging with redaction (Go)

```go
ctx := sdkcontext.FromHTTP(r)
logger := observability.Logger(ctx).WithComponent("billing")
logger.Info("invoice issued",
    observability.String("invoice_id", invoice.ID),
    observability.SafeString("plan", invoice.Plan), // auto-redacted if sensitive
)
```

## Readiness Checklist for New SDK APIs

- [ ] RFC accepted with threat model and privacy review.
- [ ] Context propagation documented; trace/tenant/user covered in public surface.
- [ ] Secure defaults enforced (logging redaction, residency, policy fail-closed).
- [ ] Contract tests + mocks; golden examples updated.
- [ ] Telemetry + metrics emitted with codes; error taxonomy updated.
- [ ] Backwards compatibility assessed; deprecation path + migration notes written.
- [ ] Docs: usage snippet, configuration table, provider matrix.
- [ ] Release artifacts signed; SBOM + provenance generated; registry metadata updated.
