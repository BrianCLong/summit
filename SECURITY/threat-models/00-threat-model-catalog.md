# Threat Model Catalog

**Version:** 1.0
**Date:** 2025-12-27
**Owner:** Security Architecture
**Methodology:** STRIDE with DREAD scoring

## Purpose

This catalog enumerates the threat models maintained for Summit subsystems and third-party integrations. It serves as the single source of truth for coverage, ownership, and review cadence so that new components cannot ship without an explicit threat assessment.

## Coverage Overview

| Subsystem                | Threat Model                                                       | Scope Highlights                                            | Last Reviewed | Owner                               | Status                  |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------- | ----------------------------------- | ----------------------- |
| API Gateway              | [01-api-gateway.md](./01-api-gateway.md)                           | GraphQL ingress, authn/z, policy guardrails                 | 2025-12-27    | Security Architecture               | ⚠️ GA Hardening         |
| AI Copilot               | [02-ai-copilot.md](./02-ai-copilot.md)                             | Prompt/response flows, model execution, safety guardrails   | 2025-12-27    | Security Architecture               | 🔴 Requires Gap Closure |
| Data Ingest              | [03-data-ingest.md](./03-data-ingest.md)                           | Streaming adapters, schema validation, provenance           | 2025-12-27    | Security Architecture               | 🔴 Requires Gap Closure |
| Graph Database           | [04-graph-database.md](./04-graph-database.md)                     | Graph storage, multi-tenant boundaries, ACLs                | 2025-12-27    | Security Architecture               | 🔴 Requires Gap Closure |
| Agent Execution          | [05-agent-execution.md](./05-agent-execution.md)                   | Task orchestration, capability restrictions, sandboxing     | 2025-12-27    | Security Architecture               | 🔴 Requires Gap Closure |
| Third-Party Integrations | [06-third-party-integrations.md](./06-third-party-integrations.md) | SaaS connectors, IDP/SSO, payment/billing, telemetry egress | 2025-12-27    | Security Architecture & Vendor Risk | ⚠️ New Coverage         |

## Maintenance Cadence

- **Quarterly refresh**: Validate mitigations, update DREAD scores, confirm detection coverage.
- **Release gating**: Any new subsystem or integration must register in this catalog and ship with a completed STRIDE walkthrough.
- **Vendor events**: Trigger ad-hoc reviews when vendors update scopes, tokens, or webhook schemas.
- **Evidence tracking**: Link remediation evidence to `COMPLIANCE_EVIDENCE_INDEX.md` to maintain SOC 2/ISO 27001 auditability.

## Review Checklist

1. Confirm data flow diagrams are current and stored alongside each threat model.
2. Validate third-party integrations have contractual and technical controls (scoped tokens, least privilege, webhook signing).
3. Ensure CI/CD gates reference the latest controls from the security control library to keep parity between design and automation.
4. Record deviations and risk acceptances in `risk-change-log.md` with expiration dates.
