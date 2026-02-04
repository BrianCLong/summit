# Intelligence Foundry Threat Model (v0.1)

## Goals

- Prevent unauthorized access to tenant assets/models/evidence
- Prevent data exfiltration via tools/outputs
- Preserve integrity of provenance and attestations
- Ensure reproducibility claims are not forged
- Detect and constrain malicious or compromised agents/tools

## Primary Threats and Mitigations

### T1: Cross-tenant data leakage

Mitigations:

- tenant-isolated storage and indexes
- no cross-tenant caching/embeddings by default
- policy gateway enforcing tenant boundary for all tool calls
- evidence sealing prevents later tampering

### T2: Tool-based exfiltration (web, export, messaging)

Mitigations:

- deny-by-default tool policies
- parameter-level constraints (destinations allow-list)
- approval gates for high-risk tools
- output redaction/watermarking per policy

### T3: Prompt injection / retrieval poisoning

Mitigations:

- retrieval provenance recording
- source allow-lists and signed source catalogs where possible
- model/agent guard policies requiring citation and constraints
- separate trust tiers for sources; block tool invocation based on untrusted text

### T4: Provenance tampering

Mitigations:

- content-addressed nodes and deterministic serialization
- attestation binds graph hash + manifest hash
- immutable evidence bundle sealing
- offline verification capability

### T5: Model substitution / endpoint spoofing

Mitigations:

- model referenced by digest and registry ID
- runtime checks for model digest
- record provider request IDs and endpoint identity
- policy pins allowed model versions

### T6: Compromised agent behavior

Mitigations:

- agent contracts and restricted tool surface
- least privilege delegated identity
- quorum approvals for sensitive actions
- anomaly detection on tool call patterns

## Residual Risks

- External SaaS models may not support strict reproducibility; best-effort mode required
- Human approvals can be socially engineered; require strong identity and audit trails
