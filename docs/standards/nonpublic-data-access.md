# Non-Public Data Access (Legal + Ethical Boundaries)

## Summit Readiness Assertion (Escalate Before Anyone Asks)
Summit operates under the [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md), which
requires verifiable guardrails, policy-as-code enforcement, and evidence-first outputs. This
standard is the authoritative basis for any non-public data access posture.

## Purpose
Establish enforceable, auditable, and least-privilege patterns for accessing non-public data in
Summit without bypassing access controls or violating terms of service. This standard defines the
required tool boundaries, approval flows, provenance model, and evidence artifacts for every
non-public access pathway.

## Core Principle
**Summit does not bypass authentication, paywalls, or technical controls.** Any attempt to
circumvent access controls is denied by policy and treated as a governance violation. Legal and
ethical boundaries are enforced at the tool boundary and recorded in deterministic evidence.

## Scope
- Authorized, account-backed APIs (enterprise or user-provisioned credentials)
- Internal “data-in” indexes (pre-ingested data under org control)
- Secure browsing collection via isolated collectors
- Human-in-the-loop (HITL) approvals for sensitive sources

## Out of Scope (Non-Goals)
- Automated scraping behind logins
- Bypassing rate limits, CAPTCHAs, or technical protections
- Ingesting breach/leak-derived data without explicit, policy-approved exception records

## Governing Authorities (Force Alignment)
All artifacts and policies must align to the following authority files:
- [Asset Classification Policy](../security/ASSET_CLASSIFICATION.md)
- [MAESTRO Threat Modeling Framework](../security/threat-modeling-framework.md)
- [Meta-Governance Framework](../governance/META_GOVERNANCE.md)
- [Decision Policy Versioning](../../packages/decision-policy/)

Legacy bypasses must be rebranded as **Governed Exceptions** with explicit approvals, rollback
criteria, and documented policy justification.

## Legal & Ethical Boundary (Grounded Guidance)
- OSINT does not equal unauthorized access. Avoid ToS violations and bypassing technical
  restrictions.
- Jurisdictional privacy/computer access laws apply (e.g., CFAA/ECPA, GDPR/CCPA contexts).
- Secure collection should prioritize investigator safety and controlled environments.

Public corroborations:
- Cyberly: Legal boundaries for OSINT and ToS risk awareness.
- Law Offices of Ernest Goodman: OSINT legality and restrictions on bypassing controls.
- Authentic8: Secure collection practices and investigator safety.
- SS8: Data fusion as a structured investigative pattern.

## Architecture Pattern: Policy-Gated Tool Harness
**Pattern:** All non-public access flows through a policy-gated wrapper that emits deterministic
policy decisions, audit records, and provenance artifacts.

**Required policy inputs:** `source_id`, `scope`, `purpose`, `retention_days`, and `approval` state.

**Decision rules:**
- Deny-by-default.
- Allow only when the policy rule explicitly matches.
- Emit decision record for every call.

**Required artifacts (deterministic, stable ordering):**
- `artifacts/audit/<run_id>/policy_decision.json`
- `artifacts/audit/<run_id>/audit.json`
- `artifacts/audit/<run_id>/provenance.json`

**Evidence ID pattern:** `EVID:<item-slug>:<run_id>:<source_id>:<seq>`

## Architecture Pattern: Data-In Model
**Pattern:** Bring non-public data into internal, governed stores first (SIEM, lakehouse, internal
index). Agents query a **single** internal tool entrypoint (`SearchInternalIntel`) that enforces
scoped filters, provenance tags, and auditability.

**Rules:**
- No direct source access from agents.
- Mandatory provenance tags per field.
- Evidence budgeting and deterministic pagination.

## Architecture Pattern: HITL Approval Protocol
**Pattern:** Sensitive sources require explicit human approval before the tool executes.

**Flow:**
1. Tool request emits `approval_request.json` (deterministic payload).
2. Human reviewer issues `approval_grant.json` (signed, nonce-bound).
3. Tool execution requires a matching nonce and scope.
4. Audit links request + grant for traceability.

**Required artifacts (when applicable):**
- `artifacts/audit/<run_id>/approval_request.json`
- `artifacts/audit/<run_id>/approval_grant.json`

## Architecture Pattern: Secure Browsing Collection
**Pattern:** Use isolated, controlled collectors (no raw scraping within Summit) that produce
snapshots (HTML, PDF, structured extracts) for human review and ingestion. This reduces operator
risk and prevents credential leakage into runtime logs.

## Import/Export Matrix
| Direction | Type | Pattern | Notes |
| --- | --- | --- | --- |
| Import | Internal APIs (Jira/SIEM/CRM) | Authorized connectors with scoped tokens | Least-privilege, audited. |
| Import | Data-in indexes | `SearchInternalIntel` | No direct source crawling. |
| Import | Secure browsing | `SecureBrowseCollect` | Isolated collector only. |
| Export | Audit & provenance | JSON artifacts | Deterministic ordering. |
| Export | Reports | Sanitized summaries | No secrets or raw creds. |

## Threat-Informed Requirements
| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Unauthorized non-public access | Deny-by-default policy rules | Decision record + unit test | `test_policy_denies_unconfigured_source()` |
| Credential exfiltration | Never-log list + redaction | Artifact validation + unit test | `test_redaction_removes_tokens_from_audit()` |
| Over-collection/privacy | Purpose binding + retention | Schema validation + policy gate | `test_policy_requires_purpose_and_retention()` |
| Silent policy drift | Baseline hash check | Drift detector + alert | `test_policy_hash_changes_fail_without_approval()` |

## Determinism & Evidence
- Deterministic artifacts must **exclude timestamps** and contain stable ordering.
- Runtime logs may include timestamps for ops, but deterministic files must not.
- Evidence-first output: produce raw evidence artifacts **before** narrative summaries.

## Performance & Cost Budgets
- Policy decision latency: p95 < 5ms per call.
- Audit write overhead: < 1MB per call (redacted payloads).
- CI gate: micro-benchmark fails on >2× regression.

## MAESTRO Security Alignment
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security
- **Threats Considered:** tool abuse, prompt injection, credential leakage, policy drift, over-collection
- **Mitigations:** deny-by-default policy, HITL approvals, redaction middleware, audit/provenance
  artifacts, drift detector, isolated collectors

## Operational Guardrails
- Feature flags default **OFF** for new connectors.
- Non-public tools are disabled unless explicitly enabled in config.
- No automation of breach/leak ingestion without approved exception record.

## Implementation Plan (PR Stack Outline)
- PR1: Deny-by-default policy engine + decision artifacts.
- PR2: Tool wrapper with redaction middleware + audit emission.
- PR3: HITL approval protocol + CLI helper.
- PR4: `SearchInternalIntel` tool with provenance tagging.
- PR5: Secure browsing collector interface.
- PR6: Drift detector + runbooks + standards.

## Compliance Positioning (Intentionally Constrained)
Summit does **not** claim blanket jurisdictional compliance without org-specific legal review. It
asserts enforceable controls, evidence artifacts, and policy-as-code gates that support compliance
programs.
