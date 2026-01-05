# ADR-0027: Context Assembly Policy Engine with Compositional Safety

**Date:** 2026-01-01
**Status:** Proposed
**Area:** AI/ML, Auth/Security, Compliance
**Owner:** Policy Team
**Tags:** policy, information-flow-control, lattice-security, context-assembly, zero-trust

## Context

Current policy engines (including Summit's OPA integration) enforce policies at **action time**:
- Block dangerous tool calls
- Prevent unauthorized writes
- Rate-limit API usage

**Gap:** No enforcement at **context assembly time**.

**Attack scenario:**
- Load customer PII (allowed individually)
- Load competitor pricing (allowed individually)
- Reason: "Generate personalized offers to undercut competitors" (combined = forbidden)

**Technical limitation:**
- Policies check individual data access, not combinations
- Actions are blocked *after* reasoning occurs (contamination already happened)
- No information flow control at LLM context granularity

**Business impact:**
- Compliance violations (mixing PII with marketing data)
- Cross-domain contamination (HIGH + LOW security classifications)
- IP leakage (trade secrets + external API data)

## Decision

### Core Decision

Implement **compositional safety lattice** for context assembly with pre-execution information flow control policies.

### Key Components

#### 1. Information Flow Labels
- Every context fragment has security lattice label: `{confidentiality, integrity, purpose}`
- **Confidentiality:** `PUBLIC < INTERNAL < CONFIDENTIAL < SECRET`
- **Integrity:** `UNTRUSTED < VERIFIED < SIGNED < IMMUTABLE`
- **Purpose:** `{allowed_purposes: ["marketing", "analytics"], forbidden: ["legal"]}`

#### 2. Lattice Join Operation
- When combining contexts A + B, compute **least upper bound** (LUB):
  - `CONFIDENTIAL ⊔ PUBLIC = CONFIDENTIAL` (confidentiality monotonically increases)
  - `{marketing} ⊔ {analytics} = {marketing, analytics}` (purposes union)
- **Policy check:** Is resulting label allowed for this agent's mandate?

#### 3. Non-Interference Validation
- Before execution, check: "Could agent A infer forbidden data from context B given context C?"
- Information-theoretic measure: `I(A; B | C) < threshold`
- If mutual information too high → reject context combination

#### 4. Purpose-Bound Computation
- Context labeled with **allowed transformations**: `{compute: true, store: false, transmit: false}`
- Agent can *reason* about PII but not *save* or *send* it
- Enforced by policy gates on tool calls, DB writes, API calls

### Implementation Details

**Policy Language (Rego Extension):**
```rego
package context_assembly

deny[msg] {
  # Deny if mixing PII with external API context
  some i, j
  input.contexts[i].sensitivity.pii == true
  input.contexts[j].source.type == "external_api"
  msg := "Cannot mix PII with unverified external data"
}

deny[msg] {
  # Deny if purpose incompatibility
  combined_purposes := union({p | input.contexts[_].purpose[p]})
  "legal" in combined_purposes
  "marketing" in combined_purposes
  msg := "Cannot use legal data for marketing purposes"
}
```

**API:**
```json
{
  "method": "mcp.context.checkAssembly",
  "params": {
    "contexts": [
      {"id": "ctx-1", "label": {"confidentiality": "SECRET", "purpose": ["defense"]}},
      {"id": "ctx-2", "label": {"confidentiality": "PUBLIC", "purpose": ["research"]}}
    ],
    "agent_mandate": {
      "max_confidentiality": "SECRET",
      "allowed_purposes": ["defense"]
    }
  },
  "result": {
    "allowed": false,
    "reason": "Purpose mismatch: research not in agent mandate",
    "effective_label": {
      "confidentiality": "SECRET",
      "purpose": ["defense", "research"]
    }
  }
}
```

## Alternatives Considered

### Alternative 1: Database-Level Access Control Only
- **Pros:** Existing infrastructure (PostgreSQL RLS)
- **Cons:** Checks *access* (can I read?), not *combination* (can I mix these?)
- **Rejected:** Doesn't prevent information flow violations in LLM context

### Alternative 2: Post-Execution Output Scanning
- **Pros:** Simpler (check output, not input)
- **Cons:** Contamination already occurred (can't un-poison LLM context)
- **Rejected:** Prevention > detection for irreversible operations

### Alternative 3: Hardware MLS (Multi-Level Security)
- **Pros:** Military-grade isolation (Trusted Solaris, SELinux)
- **Cons:** OS-level, not applicable to in-memory LLM context
- **Rejected:** Need software-only solution for cloud deployments

## Consequences

### Positive
- **Information flow control:** Formal verification that context assemblies obey security policies
- **Purpose-bound computation:** "Use but don't store" policies (GDPR compliance)
- **Proactive defense:** Block violations *before* reasoning occurs
- **Compliance:** Federal cross-domain solutions (ICD 710, EO 13526)
- **Defensive moat:** Extremely difficult to replicate (requires formal methods expertise)

### Negative
- **Complexity:** Lattice theory, non-interference computation (PhD-level computer science)
- **Performance:** Non-interference check may be expensive (NP-hard in general; approximations needed)
- **False rejections:** Legitimate multi-source queries rejected if policy too restrictive
- **Engineering effort:** 6-12 months (formal methods collaboration)

### Operational Impact
- **Monitoring:** Metrics: `context_assembly_rejections`, `lattice_join_latency`
- **Compliance:** ICD 710 (Classification), EO 13526 (Classified National Security Information)
- **Policy authoring:** Requires security architects with lattice theory knowledge

## Code References

### Core Implementation
- `server/src/conductor/policy/context-assembly-engine.ts` (~800 lines) - Lattice operations
- `server/src/conductor/policy/lattice-definitions.ts` (~200 lines) - Label schemas
- `server/src/conductor/mcp/orchestrator.ts:L201-L245` - Pre-execution check

### Data Models
- Agent mandates schema extension:
  ```yaml
  agents:
    codex:
      max_confidentiality: INTERNAL
      max_integrity: VERIFIED
      allowed_purposes: [implementation, testing]
      forbidden_combinations:
        - [PII, external_api]
  ```

### Policies
- `.ci/policies/context_assembly.rego` - OPA policy for lattice checks

## Tests & Validation

### Evaluation Criteria
- **Correctness:** 100% of forbidden combinations blocked (no false negatives on test suite)
- **Performance:** Lattice join + policy check <20ms p99
- **Expressiveness:** Can encode 90% of enterprise information flow policies

### CI Enforcement
- Golden path test: "Context assembly policy blocks forbidden combinations"
- Policy test: `context_assembly_test.rego` (unit tests for policy rules)

## Migration & Rollout

### Timeline
- Phase 1: Lattice formalism + research (Months 1-3)
- Phase 2: Policy engine implementation (Months 4-6)
- Phase 3: Integration + validation (Months 7-9)
- Phase 4: Pilot with federal customers (Months 10-12)
- Completion: GA (Month 12)

### Rollback Plan
- Feature flag: `ENABLE_CONTEXT_ASSEMBLY_POLICY=false`
- Fallback: Action-time policies only (existing OPA)
- No data migration (policy enforcement is stateless)

## References

### Related ADRs
- ADR-0002: ABAC Step-Up (attribute-based access control foundation)
- ADR-0023: Cryptographic Context Confinement (complementary cryptographic isolation)
- ADR-0024: Semantic Context Integrity (complementary adversarial defense)

### External Resources
- [Information Flow Control](https://www.cs.cornell.edu/andru/papers/csfw03.pdf) - Academic foundations
- [Lattice-Based Access Control](https://en.wikipedia.org/wiki/Lattice-based_access_control)
- [Non-Interference](https://www.cse.chalmers.se/~andrei/sabelfeld-sands-jcs.pdf) - Sabelfeld & Sands survey
- [NIST SP 800-53 AC-4](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final) - Information Flow Enforcement

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-01-01 | Policy Team | Initial version (patent defensive publication) |
