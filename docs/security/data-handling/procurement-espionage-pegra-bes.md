# Data Handling Standard: Procurement Espionage Graph (PEGra) & BES

## Summit Readiness Assertion (Escalation)

This data-handling standard is bound to the Summit Readiness Assertion and is enforced under the
Law of Consistency. See `docs/SUMMIT_READINESS_ASSERTION.md`.

## Classification

- **Default Classification**: Highly Confidential.
- **Derived Features**: Confidential unless explicitly approved for broader access.
- **Public Artifacts**: Treated as Confidential when linked to internal procurement context.

## Allowed Data Sources

- Customer-owned procurement artifacts (RFPs, bids, awards, contracts).
- Customer-provided public award feeds and supplier metadata.
- Internal procurement platform telemetry.

## Disallowed Data Sources

- External scraping, brokered datasets, or non-consensual OSINT feeds.
- Any data outside the customer-owned or customer-authorized procurement footprint.

## Data Minimization

- Extract only necessary features (price bands, tier counts, term flags).
- Do not store full contract text unless explicitly configured.
- Always redact line-item prices, margin estimates, and counterparty names from logs.

## Retention & Deletion

- Raw artifacts: TTL required and configurable.
- Derived graphs: can be retained longer only when stripped of direct identifiers.
- Evidence bundles: retained for audit per compliance policy.

## Logging & Observability Controls

- **Never Log**: line-item prices, margin estimates, counterparty names, contract excerpts.
- **Required**: structured redaction in ingestion pipelines and simulation outputs.
- **Audit Trail**: every recommendation must include evidence IDs and provenance metadata.

## Abuse Prevention

- Module must reject any request to optimize offensive procurement actions.
- Only defensive leakage minimization is supported.
- Requests outside the customer-owned data scope are denied with a policy error.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: insider misuse, cross-tenant data leakage, inference output misuse,
  prompt injection into artifact ingestion.
- **Mitigations**: tenant partition keys, deny-offense policy gate, evidence logging, deterministic
  simulation with reproducible seeds, redaction enforcement.

## Evidence Requirements

- Evidence objects must reference the exact artifact IDs used for yield calculations.
- Evidence must be deterministic and reproducible from stored inputs.
- Any access to artifacts must be logged with role, purpose, and retention policy.
