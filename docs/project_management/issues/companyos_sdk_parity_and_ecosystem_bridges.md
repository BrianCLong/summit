# Codex Task: CompanyOS SDK Parity & Ecosystem Bridges

**Priority:** P0  
**Labels:** `sdk`, `integration`, `ecosystem`, `codex-task`

## Desired Outcome
Feature parity across CompanyOS SDKs with bridges for strategic ecosystem integrations.

## Workstreams
- Catalogue feature gaps across language SDKs (TypeScript, Python, Go) against the current API contract and UI workflows.
- Deliver missing capability implementations, including auth flows, streaming, and offline caching, with shared conformance tests.
- Publish ecosystem bridge adapters for top partner platforms (Salesforce, ServiceNow, Snowflake) with reference blueprints.
- Stand up nightly compatibility CI to validate SDKs against the public API schema and contract tests.

## Key Deliverables
- SDK parity matrix with closure dates and owners.
- vNext releases for each SDK including changelog and migration notes.
- Ecosystem bridge samples and deployment guides.
- Automated compatibility CI pipeline artifacts and dashboard entry.

## Acceptance Criteria
- All GA-critical features achieve parity across supported SDKs with passing contract test suite.
- Partner bridge integrations demonstrate end-to-end data exchange in sandbox demos.
- Documentation updated in developer portal with parity status and integration quickstarts.

## Dependencies & Risks
- Upstream API stability and versioning discipline.
- Security review for third-party bridge adapters.
- Partner sandbox access for integration validation.

## Milestones
- **Week 1:** Complete feature gap audit and align owners.
- **Week 2-3:** Implement missing SDK features and add conformance tests.
- **Week 4:** Release partner bridge adapters with validation demos.
- **Week 5:** Enable compatibility CI and finalize documentation.
