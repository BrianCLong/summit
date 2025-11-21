# ADR-0005: Ship Disclosure Packager

**Date:** 2024-12-06
**Status:** Accepted
**Area:** Compliance
**Owner:** Compliance Guild
**Tags:** audit, sbom, attestation, disclosure, compliance

## Context

Auditors require tenant-scoped disclosure bundles with audit trails, SBOMs, attestations, and policy evidence delivered within strict SLOs. Manual assembly is error-prone and doesn't scale.

## Decision

Add an async `/disclosures/export` job that signs bundles, streams large payloads, and instruments adoption analytics; expose a React front-end for operators.

### Key Components
- **Export Job**: Async background job for bundle assembly
- **Bundle Signer**: Cosign-based signing for bundle integrity
- **Streaming Handler**: Large payload streaming with resumable uploads
- **Operator UI**: React dashboard for export management and status
- **Analytics Pipeline**: Adoption metrics and SLO tracking

## Alternatives Considered

### Alternative 1: Manual Export Scripts
- **Pros:** Low implementation cost, immediate availability
- **Cons:** Error-prone, no audit trail, doesn't scale, no SLO tracking
- **Cost/Complexity:** Low upfront cost, high operational burden

### Alternative 2: Third-party GRC Platform
- **Pros:** Feature-complete, compliance expertise
- **Cons:** Vendor lock-in, data sovereignty concerns, high cost
- **Cost/Complexity:** $50k+/year, limited customization

## Consequences

### Positive
- Automated, consistent disclosure bundle generation
- Cryptographic verification via cosign
- SLO-compliant delivery (<24h for standard requests)
- Full audit trail of all disclosures

### Negative
- Requires background job lifecycle management
- Webhook hardening needed for delivery notifications
- New observability dashboards and alert policies
- Storage costs for bundle retention

### Operational Impact
- **Monitoring**: Track export job success rate, SLO compliance, bundle sizes
- **Security**: Cosign key rotation, webhook authentication
- **Compliance**: Bundle retention policies, access logging

## Code References

### Core Implementation
- `server/src/jobs/disclosureExport.ts` - Export job implementation
- `server/src/routes/disclosures.ts` - API endpoints
- `client/src/pages/disclosures/` - Operator UI

### APIs
- `server/src/graphql/schema/disclosures.graphql` - GraphQL schema

## References

### Related ADRs
- ADR-0008: Authority & License Compiler (authority attestations in bundles)
- ADR-0011: Provenance Ledger Schema (audit trail data source)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-12-06 | Compliance Guild | Initial version |
