# Summit Claims Registry

This registry binds every public claim about Summit to the authoritative evidence (code, test, policy, or metric) that enforces it.

**Governance:**
- No new claim without an entry here.
- PRs modifying these capabilities must update the evidence link.
- Claims without passing evidence are "Aspirational" and must not be used in sales/marketing.

## Table of Contents

1. [Security & Governance](#security--governance)
2. [Data & Provenance](#data--provenance)
3. [Architecture & Resilience](#architecture--resilience)
4. [Intelligence & AI](#intelligence--ai)
5. [Anti-Claims](#anti-claims)

---

## Security & Governance

| ID | Claim | Evidence Path | Scope / Limit | Owner | Status |
|----|-------|---------------|---------------|-------|--------|
| **GOV-001** | **Tenant Isolation:** Data is strictly isolated by tenant ID at the database level; cross-tenant access is mechanically impossible in standard queries. | `server/src/lib/db/TenantSafePostgres.ts` | Applies to PostgreSQL access via the `TenantSafePostgres` wrapper. Raw SQL bypass is possible but audited. | Platform Eng | **VERIFIED** |
| **GOV-002** | **Policy as Code:** All authorization decisions are made by Open Policy Agent (OPA) policies, not hardcoded logic. | `policy/` (Root directory for Rego policies) | Applies to API access and release gates. | Security | **VERIFIED** |
| **GOV-003** | **Zero Trust Identity:** Short-lived JWTs are required for all API access; tokens are not persisted. | `server/src/services/AuthService.ts` | Access tokens expire in 15m. Refresh tokens are HTTP-only cookies. | Identity Team | **VERIFIED** |
| **GOV-004** | **Step-Up Authentication:** Critical actions require re-verification (MFA/WebAuthn). | `server/src/auth/webauthn/middleware.ts` | Configurable per route/action. | Identity Team | **VERIFIED** |

## Data & Provenance

| ID | Claim | Evidence Path | Scope / Limit | Owner | Status |
|----|-------|---------------|---------------|-------|--------|
| **DAT-001** | **Immutable Ledger:** Every data mutation is recorded in a tamper-evident ledger. | `server/src/provenance/ledger.ts` | Records "Intent", "Action", and "Result". | Data Platform | **VERIFIED** |
| **DAT-002** | **Artifact Signing:** Compliance artifacts are cryptographically signed. | `server/src/services/SigningService.ts` | Uses internal keys (mocked in dev). | Compliance | **VERIFIED** |
| **DAT-003** | **Dual-Write Consistency:** Knowledge graph updates are synchronized with relational data. | `server/src/db/WriteQuorumRouter.ts` | Best-effort consistency with manual compensation logic. | Data Platform | **VERIFIED** |

## Architecture & Resilience

| ID | Claim | Evidence Path | Scope / Limit | Owner | Status |
|----|-------|---------------|---------------|-------|--------|
| **ARC-001** | **Multi-Region:** Architecture supports Primary (US-East), Secondary (US-West), and Tertiary (EU) regions. | `docs/resilience/MULTI_REGION_ARCHITECTURE.md` | Currently architectural capability; deployment script support varies. | Infra | **VERIFIED** |
| **ARC-002** | **Circuit Breaking:** External dependencies are wrapped in circuit breakers to prevent cascading failure. | `server/src/lib/circuitBreaker.ts` | Applied to key connectors. | SRE | **VERIFIED** |
| **ARC-003** | **Budget-Aware Execution:** Requests are rejected if they exceed defined financial quotas. | `server/src/lib/resources/budget-tracker.ts` | Enforced at the request level. | FinOps | **VERIFIED** |

## Intelligence & AI

| ID | Claim | Evidence Path | Scope / Limit | Owner | Status |
|----|-------|---------------|---------------|-------|--------|
| **AI-001** | **Model Agnostic:** Prompts are decoupled from model providers via a configuration layer. | `server/prompts/registry.ts` | Supports OpenAI, Anthropic, and Local models via config. | AI Platform | **VERIFIED** |
| **AI-002** | **PII Redaction:** Sensitive entities are detected and redacted before LLM inference. | `server/src/pii/ingestionHooks.ts` | Heuristic-based; not 100% guaranteed for all edge cases. | AI Security | **VERIFIED** |
| **AI-003** | **Defensive PsyOps:** System actively detects and counters influence operations. | `server/src/services/DefensivePsyOpsService.ts` | Automated detection based on content signatures. | CogSec | **VERIFIED** |

## Anti-Claims

> *See [ANTI_CLAIMS.md](./ANTI_CLAIMS.md) for detailed rationale.*

| ID | Anti-Claim | Rationale | Guardrail |
|----|------------|-----------|-----------|
| **NO-001** | **No "God Mode" Admins** | Admins cannot view tenant data without explicit "Break Glass" audit trail. | `TenantSafePostgres` strict mode. |
| **NO-002** | **No Silent Failures** | Errors are never swallowed; they are reported or returned to the user. | `server/src/lib/errors.ts` hierarchy. |
| **NO-003** | **No Ad-Hoc Deployments** | Changes must pass CI/CD gates; no SSH-and-patch. | CI/CD pipeline enforcement. |
