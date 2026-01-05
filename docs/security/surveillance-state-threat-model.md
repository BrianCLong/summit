# Surveillance-State Threat Model

## Threats

- **Insider abuse of data-fusion tooling:** privileged analysts run sensitive queries without a declared mission.
- **Mission creep and purpose drift:** data originally ingested for one case is re-used for unrelated investigations.
- **Over-collection and unauthorized correlation:** bulk joins across tenants or datasets without necessity.
- **Bulk export without oversight:** large data pulls leave governed boundaries without approvals or provenance.
- **Unverified enrichment chains:** downstream consumers cannot tell why data was exposed or who approved it.

## Mitigations implemented

- **Purpose limitation enforcement:** sensitive routes require purpose, justification, and case identifiers; requests without them are blocked and surfaced to the user with structured guidance.
- **Policy-as-code guardrails:** OPA policy (`sensitive/access`) denies operations that lack approved purposes or roles.
- **Step-up / approval for high-risk flows:** bulk exports require step-up authentication or an approval token before execution.
- **Immutable audit with provenance:** append-only audit records capture tenant, user, action, purpose, justification, case, decision, correlation IDs, and trace IDs for every sensitive decision.
- **Provenance surfaced to analysts:** sensitive responses include the captured purpose and case context so users see why data is being shown.
- **Testing coverage:** policy unit tests cover missing/valid context, middleware tests assert audit emission, and UI tests confirm gating behavior before retrying sensitive operations.
