# ADR-010: Invariant-Carrying Context Capsules (IC³)

**Status:** Proposed
**Date:** 2026-01-01
**Author:** Summit Architecture Team

## Context

Summit's invariant philosophy (established in `ga-graphai/packages/data-integrity/src/invariants/`) enforces system rules at execution boundaries:

- **Before execution**: Check agent budgets, validate tool call parameters
- **After execution**: Verify graph integrity, detect cycles, enforce uniqueness

However, **invariants do not travel with context**. This creates vulnerabilities:

1. **Unverifiable context**: Model receives instructions/artifacts with **no machine-checkable constraints**
   - Example: "Do not reveal API keys" is advisory text, not a validated rule

2. **Cross-agent trust collapse**: Agent A cannot specify constraints that Agent B must respect
   - Scenario: Agent A generates context requiring "finance domain only," Agent B ignores this

3. **Policy-context mismatch**: Policies enforce *what the system can do*, not *what the context permits*
   - Problem: A user artifact might say "classify as SECRET," but orchestrator policy doesn't enforce it

4. **No structural enforcement**: Violating context rules only fails *after* the model attempts forbidden reasoning
   - Better: Make invalid context **unexecutable by construction**

As Summit scales to:
- Multi-agent workflows with varying trust levels
- High-assurance environments (government, healthcare, finance)
- Contexts containing sensitive instructions (clearance-restricted prompts, PII handling rules)

We need **context that carries its own verification logic**, making rule violations structurally impossible rather than runtime failures.

## Decision

We will implement **Invariant-Carrying Context Capsules (IC³)**, a method for embedding machine-verifiable invariants directly into model context.

### 1. Context Capsule Structure

A **capsule** is an independently verifiable unit of context:

```typescript
interface ContextCapsule {
  id: string;                    // Cryptographic hash of content + invariants
  content: ContextSegment;       // The actual context (from ADR-009 CPG)
  invariants: Invariant[];       // Machine-verifiable rules
  signature?: string;            // Optional cryptographic signature (agent identity)
  metadata: {
    createdBy: string;           // Agent ID
    authorityScope: string[];    // Permitted operations
    validUntil?: Date;           // Expiration
    policyDomain: string;        // Classification level, data domain
  };
}
```

### 2. Invariant Semantics

Invariants specify **constraints on how the capsule's content may be used**:

```typescript
interface Invariant {
  id: string;
  type: 'reasoning_constraint' | 'data_usage' | 'output_class' | 'authority_scope';
  rule: Rule;                    // Machine-verifiable expression
  severity: 'info' | 'warn' | 'block';
  remediation?: string;
}

type Rule =
  | { kind: 'forbid_topics'; topics: string[] }
  | { kind: 'require_clearance'; level: string }
  | { kind: 'output_must_match'; schema: JSONSchema }
  | { kind: 'no_external_calls'; strict: boolean }
  | { kind: 'data_retention'; maxDays: number }
  | { kind: 'custom_expression'; expr: string }; // Future: Rego/OPA policy
```

**Example invariants**:

1. **Reasoning constraint**:
   ```json
   {
     "id": "no-medical-advice",
     "type": "reasoning_constraint",
     "rule": { "kind": "forbid_topics", "topics": ["diagnosis", "treatment", "prescriptions"] },
     "severity": "block",
     "remediation": "This context cannot be used for medical decision-making"
   }
   ```

2. **Data usage**:
   ```json
   {
     "id": "pii-redaction-required",
     "type": "data_usage",
     "rule": { "kind": "require_clearance", "level": "SECRET" },
     "severity": "block"
   }
   ```

3. **Authority scope**:
   ```json
   {
     "id": "read-only-mode",
     "type": "authority_scope",
     "rule": { "kind": "no_external_calls", "strict": true },
     "severity": "block"
   }
   ```

### 3. Validation at MCP Assembly

**Before ContextCompiler generates LLMRequest**:

```typescript
class InvariantValidator {
  validate(capsules: ContextCapsule[], executionContext: ExecutionContext): ValidationResult {
    const violations: InvariantViolation[] = [];

    for (const capsule of capsules) {
      // 1. Verify cryptographic integrity
      if (!this.verifyCapsuleHash(capsule)) {
        violations.push({
          capsuleId: capsule.id,
          violation: 'hash_mismatch',
          severity: 'block',
          message: 'Capsule content has been tampered with'
        });
      }

      // 2. Check signature if present (agent identity)
      if (capsule.signature && !this.verifySignature(capsule)) {
        violations.push({
          capsuleId: capsule.id,
          violation: 'invalid_signature',
          severity: 'block',
          message: 'Capsule signature verification failed'
        });
      }

      // 3. Validate each invariant
      for (const invariant of capsule.invariants) {
        const result = this.checkInvariant(invariant, executionContext);
        if (result.violated) {
          violations.push({
            capsuleId: capsule.id,
            invariantId: invariant.id,
            violation: result.reason,
            severity: invariant.severity,
            message: result.message,
            remediation: invariant.remediation
          });
        }
      }

      // 4. Check expiration
      if (capsule.metadata.validUntil && new Date() > capsule.metadata.validUntil) {
        violations.push({
          capsuleId: capsule.id,
          violation: 'expired',
          severity: 'block',
          message: 'Capsule has expired'
        });
      }
    }

    // 5. Apply severity rules
    const blockingViolations = violations.filter(v => v.severity === 'block');
    if (blockingViolations.length > 0) {
      return {
        valid: false,
        violations,
        action: 'deny_execution'
      };
    }

    return {
      valid: true,
      violations,  // May include warnings
      action: 'permit'
    };
  }
}
```

**Enforcement points**:
- **Pre-compilation gate**: Validate before assembling LLMRequest
- **Kill-switch integration**: Blocking violations trigger execution halt
- **Audit logging**: All violations recorded in provenance graph

### 4. Multi-Agent Trust Model

**Cross-agent capsule rejection**:

```typescript
class CapsulePolicy {
  canAcceptCapsule(
    capsule: ContextCapsule,
    receivingAgent: Agent,
    sendingAgent: Agent
  ): boolean {
    // Rule: Cannot accept capsules from lower trust tier
    if (sendingAgent.trustTier < receivingAgent.requiredTrustTier) {
      return false;
    }

    // Rule: Cannot accept capsules with incompatible policy domains
    if (!this.policyDomainsCompatible(capsule.metadata.policyDomain, receivingAgent.policyDomain)) {
      return false;
    }

    // Rule: Cannot accept unsigned capsules if agent requires signatures
    if (receivingAgent.requireSignedCapsules && !capsule.signature) {
      return false;
    }

    return true;
  }
}
```

**Capsule identity & lineage**:
- Capsules carry `createdBy` agent ID
- Forwarded capsules preserve original creator + forwarding chain
- Enables **transitive trust**: Agent C can trace capsule back to originating Agent A

### 5. Integration with ADR-009 Context Provenance Graph

**Capsules as provenance nodes**:
- Each capsule becomes a `ProvenanceNode` in the CPG
- Invariant violations create edges: `VIOLATES_INVARIANT`
- Revoked capsules propagate invalidation to descendant capsules

**Combined enforcement**:
1. **CPG**: Tracks capsule lineage, enables revocation
2. **IC³**: Validates capsules before inclusion in compiled context
3. **Result**: Self-defending context with cryptographic audit trail

### 6. Implementation in Summit

**New modules**:
- `agents/orchestrator/src/context/capsules/ContextCapsule.ts`
- `agents/orchestrator/src/context/capsules/InvariantValidator.ts`
- `agents/orchestrator/src/context/capsules/CapsulePolicy.ts`

**Integration points**:
- Modify `ContextCompiler.compile()` to:
  1. Convert context segments to capsules
  2. Run `InvariantValidator.validate()`
  3. Reject compilation if blocking violations exist

- Extend `ga-graphai/packages/data-integrity/src/invariants/` with capsule-aware rules

**Backward compatibility**:
- Existing context segments without invariants treated as "permissive capsules"
- Gradual rollout: start with opt-in capsules, migrate to mandatory over time

## Consequences

### Positive

- **Structural safety**: Invalid context becomes unexecutable, not just detectable
- **Trust-aware orchestration**: Agents enforce constraints from other agents
- **Cross-domain security**: Capsules carry classification/clearance requirements
- **Tamper resistance**: Cryptographic binding prevents invariant bypass
- **Composable policies**: Invariants combine with CPG policies for defense-in-depth
- **Compliance enablement**: Machine-verifiable proof that constraints were enforced

### Negative

- **Complexity**: Developers must define invariants upfront, not just context content
- **Verbosity**: Capsule structure adds overhead to context representation
- **Invariant design burden**: Writing correct, non-conflicting invariants is hard
- **Performance**: Validation adds latency to compilation path

### Risks

- **Over-constraint**: Too many invariants could make valid operations impossible
  - *Mitigation*: Start with minimal invariant set, expand based on violations in production

- **Invariant language limitations**: Complex policies may not be expressible in initial rule types
  - *Mitigation*: Support custom expressions via Rego/OPA in Phase 2

- **Signature key management**: Compromised agent keys could forge capsules
  - *Mitigation*: Integrate with existing PKI, require key rotation, audit signature usage

- **Denial of service**: Malicious agent sends capsules with unsatisfiable invariants
  - *Mitigation*: Rate-limit capsule creation, flag agents with high rejection rates

## Alternatives Considered

### 1. Advisory Metadata Only (No Validation)
**Description**: Attach metadata to context suggesting usage rules, but don't enforce
**Rejected because**:
- No guarantee model respects hints
- Cannot detect violations until after model generates output
- Insufficient for high-assurance environments

### 2. Runtime Invariant Checking (Post-Model)
**Description**: Validate model outputs against context rules, not inputs
**Rejected because**:
- Model already performed forbidden reasoning
- Cannot prevent information leakage (model "saw" restricted content)
- Wasteful: generate output then discard if invalid

### 3. Embedding Invariants in System Prompts
**Description**: Write rules as natural language instructions
**Rejected because**:
- Models can ignore/misinterpret text instructions
- Not machine-verifiable (cannot prove compliance)
- Prompt injection can override instructions

### 4. Separate Policy Database (External to Context)
**Description**: Store invariants in centralized database, look up at runtime
**Deferred because**:
- Requires network call during compilation (latency)
- Capsules cannot be self-contained (portability loss)
- Future optimization: cache frequently-used policies

## Implementation Plan

### Phase 1: Core Capsule Infrastructure (Weeks 1-2)
- Implement `ContextCapsule` data structure
- Define initial invariant types (reasoning_constraint, data_usage, authority_scope)
- Build `InvariantValidator` with cryptographic hash verification
- Write unit tests for capsule creation + validation

### Phase 2: Integration with ContextCompiler (Weeks 3-4)
- Modify compilation pipeline to generate capsules from segments
- Add validation gate before LLMRequest assembly
- Integrate with kill-switch controller (blocking violations → halt)
- Create default invariants for common scenarios (PII, financial, medical)

### Phase 3: Multi-Agent Trust (Weeks 5-6)
- Implement `CapsulePolicy` with trust tier checks
- Add agent signature generation + verification
- Build capsule forwarding logic (preserve lineage)
- Create admin API for inspecting capsule rejection logs

### Phase 4: Advanced Invariants (Weeks 7-8)
- Add support for custom expressions (Rego/OPA integration)
- Implement output schema validation (output_class invariants)
- Build invariant composition rules (AND/OR logic)
- Performance optimization (batch validation, caching)

### Phase 5: Production Hardening (Weeks 9-10)
- Security audit: verify cryptographic guarantees
- Fuzz testing: generate malformed capsules, verify rejection
- Documentation: operator runbooks, developer guides
- Monitoring: metrics for validation latency, rejection rates

### Phase 6: Future Enhancements
- Federated invariant sharing (publish trusted capsules to registry)
- Machine learning on invariant effectiveness (detect weak rules)
- Dynamic invariant generation (LLM suggests rules for new contexts)

## Open Questions

1. **Invariant language expressiveness**: Should we adopt existing policy language (Rego, Cedar)?
   - Proposal: Start with typed rules (Phase 1), add custom expressions in Phase 4

2. **Signature algorithm**: RSA, Ed25519, or leverage existing Summit PKI?
   - Proposal: Ed25519 (fast, small signatures)

3. **Capsule granularity**: One capsule per segment, or batch multiple segments?
   - Proposal: One-to-one mapping (simpler), optimize batching in Phase 4

4. **Invariant conflicts**: What if two capsules have incompatible invariants?
   - Proposal: Most restrictive rule wins (union of constraints)

5. **Performance budget**: What's acceptable validation overhead?
   - Target: <100ms for typical session (50 capsules, 5 invariants each)

6. **Backward compatibility timeline**: When to require all context as capsules?
   - Proposal: 6 months opt-in, then mandatory for new sessions

## References

- [Object Capabilities Security Model](https://en.wikipedia.org/wiki/Object-capability_model)
- [Amazon Cedar Policy Language](https://www.cedarpolicy.com/)
- [Open Policy Agent (Rego)](https://www.openpolicyagent.org/)
- Summit ADR-009: Context Provenance Graph (CPG) (foundational dependency)
- Summit ADR-006: LBAC via API-Level Security Proxy (related policy enforcement)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) (capsule signature pattern)

## Success Metrics

- **Invariant coverage**: 90% of production context segments have at least 1 invariant
- **Validation latency**: <50ms added overhead at p95
- **Rejection accuracy**: <5% false positive rate on blocking violations
- **Cross-agent adoption**: 80% of multi-agent workflows use signed capsules within 90 days
- **Incident prevention**: 100% of simulated policy violations caught by invariant validation
- **Audit completeness**: All invariant violations logged with full capsule lineage
