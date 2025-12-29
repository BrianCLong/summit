# MVP-4-GA Threat Model

This document captures a targeted STRIDE analysis for MVP-4-GA with a focus on receipt ingestion, plugin publishing, and compliance endpoints. It maps mitigations to concrete code/config locations and documents the guardrails added in this change set.

## STRIDE Summary

| Component                                                        | Threat                                                        | Impact                                   | Mitigation                                                                                     | Location                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| AI webhook ingestion (`/ai/webhook`)                             | Denial of Service via oversized payloads (DoS)                | Parser exhaustion, thread starvation     | Payload size cap returns 413 before processing; raw-body capture ensures deterministic signing | `server/src/routes/aiWebhook.ts`, `server/bootstrap/raw-body.ts`                                                 |
| AI webhook ingestion (`/ai/webhook`)                             | Spoofed sender (Tampering/Repudiation)                        | Untrusted model output accepted          | HMAC verification on raw payload using `ML_WEBHOOK_SECRET`; audit event emission               | `server/src/routes/aiWebhook.ts`, `server/src/ai/auditLogging.ts`                                                |
| Provenance receipt ingestion (`/api/conductor/evidence/receipt`) | Replay or forged receipts (Tampering)                         | False provenance chain, compliance drift | Receipt signatures via `EVIDENCE_SIGNING_SECRET`; SHA-256 hashing before storage               | `server/src/conductor/api/evidence-routes.ts`, `server/src/maestro/evidence/receipt.ts`                          |
| Plugin publishing workflow                                       | Malicious plugin bundle (Spoofing/Integrity)                  | Supply-chain compromise, RCE risk        | Checksums and policy validation hooks before registry accept; provenance logging               | `services` plugin onboarding flows (see `server/src/services/IntegrationService.js`), `security/supply-chain.md` |
| Compliance endpoints (`/api/tenants/*`)                          | Unauthorized access to tenant compliance views (Spoofing/EoP) | Data leakage across tenants              | AuthN via `ensureAuthenticated`, ABAC via `ensurePolicy`, receipts for access                  | `server/src/routes/tenants.ts`, `server/src/middleware/abac.js`                                                  |
| Compliance export (`/api/conductor/evidence/receipt/:runId`)     | Information disclosure of receipts (Information Disclosure)   | Leakage of sensitive provenance details  | ID-scoped queries with 404 on missing runs; content stored as binary with MIME tagging         | `server/src/conductor/api/evidence-routes.ts`                                                                    |
| Webhook registry (integration creation)                          | CSRF / unvalidated endpoints (CSRF/Tampering)                 | Exfiltration via attacker URL            | URL validation and required auth; retry/backoff defaults                                       | `server/src/services/IntegrationService.js`                                                                      |

## Key Abuse Cases

### Receipt Ingestion

- **Replay of stale receipts** to mask tampering.
- **Oversized receipt uploads** to exhaust memory during hashing.
- **Receipt substitution** where attacker swaps signed payload with unsigned content.

**Relevant Controls**

- SHA-256 hashing and `EVIDENCE_SIGNING_SECRET` signing before storage: `server/src/conductor/api/evidence-routes.ts`.
- Retention and MIME typing enforcement in provenance service: `server/src/maestro/evidence/provenance-service.ts`.

### Plugin Publishing

- **Malicious plugin archive** embedding remote loaders.
- **Dependency confusion** on published plugin dependencies.
- **Registry flooding** with large or frequent submissions.

**Relevant Controls**

- Plugin metadata validation and webhook filters during creation: `server/src/services/IntegrationService.js`.
- Supply-chain validation checklist: `docs/security/supply-chain.md`.
- Notification/audit via webhook receivers to SOC tooling: `server/src/notifications-hub/receivers/WebhookReceiver.ts`.

### Compliance Endpoints

- **Cross-tenant data probing** via ID enumeration.
- **Unlogged access to compliance evidence** masking insider actions.
- **High-rate polling** of compliance endpoints to degrade availability.

**Relevant Controls**

- AuthZ middleware (`ensurePolicy`) bound per action: `server/src/middleware/abac.js`.
- Receipts returned on sensitive operations for non-repudiation: `server/src/routes/tenants.ts`.
- (Planned) rate-limit middleware on compliance routes (stubbed via Express rate-limit hook points in `server/src/routes/tenants.ts`).

## Mitigations and Guardrails Added

| Control                                         | Threat Mitigated                      | Implementation                                        | Notes                            |
| ----------------------------------------------- | ------------------------------------- | ----------------------------------------------------- | -------------------------------- |
| 512KB payload cap on AI webhooks                | DoS via oversized ML webhook payloads | Early size check with 413 response                    | `server/src/routes/aiWebhook.ts` |
| Raw-body capture for signature validation       | Tampering / signature bypass          | Express raw buffer capture before parsing             | `server/bootstrap/raw-body.ts`   |
| Deterministic HMAC verification for ML webhooks | Spoofing sender                       | HMAC-SHA256 over raw payload with `ML_WEBHOOK_SECRET` | `server/src/routes/aiWebhook.ts` |

## Residual Risks & Next Steps

- Add adaptive rate limits per-tenant on `/ai/webhook` to complement size caps.
- Extend payload caps to other webhook surfaces (`/webhooks/*`) with differentiated thresholds per provider.
- Formalize plugin bundle scanning with SBOM verification before publishing.
