# V2 Change Classes

All Pull Requests in V2 must declare a **Change Class**. This classification determines the review rigor, evidence requirements, and release gates.

## Class A: Additive (Non-Breaking)

**Definition:** Changes that add new functionality without modifying existing behavior or contracts. Safe to merge with standard review.

- **Examples:**
  - Adding a new file in `packages/v2-sandbox/`.
  - Adding a new test case.
  - Documentation updates (non-policy).
  - Adding a new optional field to an API response.
- **Requirements:**
  - Standard CI pass.
  - 1 Peer Review.
- **Gate:** Auto-merge eligible (if CI passes).

## Class B: Behavior-Changing

**Definition:** Changes that modify the runtime behavior of existing V1 components or integrations. Requires explicit evidence of safety.

- **Examples:**
  - Refactoring a core service method.
  - Updating a dependency version.
  - Changing a default configuration value.
  - Performance optimizations that alter execution paths.
- **Requirements:**
  - Standard CI pass.
  - Regression Test Evidence (e.g., specific test run logs).
  - 2 Peer Reviews (including 1 Code Owner).
- **Gate:** Manual Approval required.

## Class C: Contract-Affecting (Breaking)

**Definition:** Changes that alter the "Inherited Contracts" (Governance, Security, Provenance schemas, or Public APIs). These are effectively "Breaking Changes" to the V1 Guarantee.

- **Examples:**
  - Modifying `docs/GOVERNANCE.md` or `SECURITY.md`.
  - Changing `schemas/provenance-event.schema.json`.
  - Relaxing an OPA policy in `policy/`.
  - Removing a public API endpoint.
- **Requirements:**
  - **V2 Breaking Review:** Explicit sign-off from Governance/Security leads.
  - **Re-Attestation:** Proof that the new contract meets or exceeds the intent of the old one.
  - **Migration Plan:** Documented path for consumers.
- **Gate:** Governance Board Approval (or designated delegate).

## Declaration Format

Every PR description must include:

```markdown
## V2 Change Class

- [ ] Class A (Additive)
- [ ] Class B (Behavioral)
- [ ] Class C (Contract-Affecting)

**Justification:** [Brief explanation of why this class fits]
```
